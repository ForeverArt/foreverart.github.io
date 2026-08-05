package news

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

// Handlers registers all news-related HTTP handlers on the given ServeMux.
type Handlers struct {
	store   *Store
	tr      *TrendRadarReader
	auth    *Auth
	digest  *DigestService
	rss     *RSSHandler
}

// NewHandlers creates a Handlers instance.
func NewHandlers(store *Store, tr *TrendRadarReader, llm LLMProvider, secret string) *Handlers {
	auth := NewAuth(store, secret)
	return &Handlers{
		store:  store,
		tr:     tr,
		auth:   auth,
		digest: NewDigestService(store, tr, llm),
		rss:    NewRSSHandler(store, tr),
	}
}

// Register adds news routes to the mux.
func (h *Handlers) Register(mux *http.ServeMux) {
	// Public: platforms, latest, items, search, history, digest
	mux.HandleFunc("/api/v1/news/platforms", h.platforms)
	mux.HandleFunc("/api/v1/news/latest", h.latest)
	mux.HandleFunc("/api/v1/news/items", h.queryItems)
	mux.HandleFunc("/api/v1/news/items/", h.itemHistory) // /api/v1/news/items/{id}/history
	mux.HandleFunc("/api/v1/news/digest", h.getDigest)

	// Auth: register, login
	mux.HandleFunc("/api/v1/news/auth/register", h.auth.Register)
	mux.HandleFunc("/api/v1/news/auth/login", h.auth.Login)

	// Protected: keywords, feed management
	mux.HandleFunc("/api/v1/news/me/keywords", h.auth.RequireAuth(h.myKeywords))
	mux.HandleFunc("/api/v1/news/me/feed", h.auth.RequireAuth(h.myFeed))
	mux.HandleFunc("/api/v1/news/me/feed/reset", h.auth.RequireAuth(h.resetFeed))

	// RSS feed (public, capability URL)
	mux.HandleFunc("/api/v1/news/feed/", h.rss.ServeFeed)

	// Admin: refresh digest (could be protected with admin password, but for now keep simple)
	mux.HandleFunc("/api/v1/news/digest/refresh", h.refreshDigest)
}

func (h *Handlers) platforms(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, http.StatusMethodNotAllowed, "GET only")
		return
	}
	date := r.URL.Query().Get("date")
	ps, err := h.tr.ListPlatforms(date)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonResp(w, http.StatusOK, ps)
}

func (h *Handlers) latest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, http.StatusMethodNotAllowed, "GET only")
		return
	}
	date := r.URL.Query().Get("date")
	groups, err := h.tr.LatestNews(date)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonResp(w, http.StatusOK, groups)
}

func (h *Handlers) queryItems(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, http.StatusMethodNotAllowed, "GET only")
		return
	}
	q := r.URL.Query()
	date := q.Get("date")
	platform := q.Get("platform")
	keyword := q.Get("q")
	limit := 100
	if l := q.Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}
	items, err := h.tr.QueryItems(date, platform, keyword, limit)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonResp(w, http.StatusOK, items)
}

func (h *Handlers) itemHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, http.StatusMethodNotAllowed, "GET only")
		return
	}
	// Path: /api/v1/news/items/{id}/history
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 2 || parts[len(parts)-1] != "history" {
		jsonError(w, http.StatusNotFound, "not found")
		return
	}
	idStr := parts[len(parts)-2]
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "invalid item id")
		return
	}
	date := r.URL.Query().Get("date")
	if date == "" {
		date = todayStr()
	}
	points, err := h.tr.RankHistory(date, id)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonResp(w, http.StatusOK, points)
}

func (h *Handlers) getDigest(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		h.refreshDigest(w, r)
		return
	}
	h.digest.GetDigest(w, r)
}

func (h *Handlers) refreshDigest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, http.StatusMethodNotAllowed, "POST only")
		return
	}
	h.digest.RefreshDigest(w, r)
}

func (h *Handlers) myKeywords(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	if userID == 0 {
		jsonError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	switch r.Method {
	case http.MethodGet:
		kws, err := h.store.GetKeywords(userID)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, err.Error())
			return
		}
		jsonResp(w, http.StatusOK, map[string]any{"keywords": kws})

	case http.MethodPut:
		var req struct {
			Keywords []string `json:"keywords"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			jsonError(w, http.StatusBadRequest, "invalid json")
			return
		}
		if err := h.store.SetKeywords(userID, req.Keywords); err != nil {
			if err == ErrTooManyKeywords {
				jsonError(w, http.StatusBadRequest, err.Error())
				return
			}
			jsonError(w, http.StatusInternalServerError, err.Error())
			return
		}
		jsonResp(w, http.StatusOK, map[string]any{"keywords": req.Keywords})

	default:
		jsonError(w, http.StatusMethodNotAllowed, "GET or PUT only")
	}
}

func (h *Handlers) myFeed(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, http.StatusMethodNotAllowed, "GET only")
		return
	}
	userID := getUserID(r)
	ft, err := h.store.GetOrCreateFeedToken(userID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonResp(w, http.StatusOK, map[string]any{
		"token":      ft.Token,
		"url":        "/api/v1/news/feed/" + ft.Token + ".xml",
		"created_at": ft.CreatedAt,
	})
}

func (h *Handlers) resetFeed(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, http.StatusMethodNotAllowed, "POST only")
		return
	}
	userID := getUserID(r)
	ft, err := h.store.ResetFeedToken(userID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonResp(w, http.StatusOK, map[string]any{
		"token":      ft.Token,
		"url":        "/api/v1/news/feed/" + ft.Token + ".xml",
		"created_at": ft.CreatedAt,
	})
}
