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
	chat    *PreferenceChatService
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
		chat:   NewPreferenceChatService(store, llm),
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

	// Protected: keywords, feed management, matched items, preferences, chat, feedback
	mux.HandleFunc("/api/v1/news/me/keywords", h.auth.RequireAuth(h.myKeywords))
	mux.HandleFunc("/api/v1/news/me/matched", h.auth.RequireAuth(h.myMatched))
	mux.HandleFunc("/api/v1/news/me/feed", h.auth.RequireAuth(h.myFeed))
	mux.HandleFunc("/api/v1/news/me/feed/reset", h.auth.RequireAuth(h.resetFeed))
	mux.HandleFunc("/api/v1/news/me/preferences", h.auth.RequireAuth(h.myPreferences))
	mux.HandleFunc("/api/v1/news/me/chat", h.auth.RequireAuth(h.myChat))
	mux.HandleFunc("/api/v1/news/me/conversations", h.auth.RequireAuth(h.myConversations))
	mux.HandleFunc("/api/v1/news/me/conversations/", h.auth.RequireAuth(h.myConversationMessages))
	mux.HandleFunc("/api/v1/news/me/feedback", h.auth.RequireAuth(h.myFeedback))

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
	if idStr == "" {
		jsonError(w, http.StatusBadRequest, "invalid item id")
		return
	}
	date := r.URL.Query().Get("date")
	if date == "" {
		date = todayStr()
	}
	points, err := h.tr.RankHistory(date, idStr)
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

func (h *Handlers) myMatched(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, http.StatusMethodNotAllowed, "GET only")
		return
	}
	userID := getUserID(r)
	if userID == 0 {
		jsonError(w, http.StatusUnauthorized, "not authenticated")
		return
	}

	kws, err := h.store.GetKeywords(userID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if len(kws) == 0 {
		jsonResp(w, http.StatusOK, []KeywordMatchGroupEx{})
		return
	}

	items, err := h.tr.QueryItems(todayStr(), "", "", 200)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Load global + per-keyword preferences for scoring
	allPrefs, err := h.store.GetAllPreferences(userID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Group items by keyword (case-insensitive substring match), then score by preferences
	groups := make([]KeywordMatchGroupEx, 0, len(kws))
	for _, kw := range kws {
		kwLower := strings.ToLower(kw)
		var prefsForKw []PreferenceDoc
		prefsForKw = append(prefsForKw, allPrefs.Global)
		if kp, ok := allPrefs.Keywords[kw]; ok {
			prefsForKw = append(prefsForKw, kp)
		}
		var matched []ScoredNewsItem
		for _, it := range items {
			if strings.Contains(strings.ToLower(it.Title), kwLower) {
				score, interests := ScoreNewsItem(it.Title, prefsForKw)
				matched = append(matched, ScoredNewsItem{
					TRNewsItem:       it,
					RelevanceScore:   score,
					MatchedInterests: interests,
				})
			}
		}
		// Sort by relevance score descending, then by crawl count descending
		sortScoredItems(matched)
		groups = append(groups, KeywordMatchGroupEx{Keyword: kw, Items: matched})
	}

	jsonResp(w, http.StatusOK, groups)
}

func sortScoredItems(items []ScoredNewsItem) {
	for i := 0; i < len(items); i++ {
		for j := i + 1; j < len(items); j++ {
			if shouldSwap(items[i], items[j]) {
				items[i], items[j] = items[j], items[i]
			}
		}
	}
}

func shouldSwap(a, b ScoredNewsItem) bool {
	if a.RelevanceScore != b.RelevanceScore {
		return a.RelevanceScore < b.RelevanceScore
	}
	if a.CrawlCount != b.CrawlCount {
		return a.CrawlCount < b.CrawlCount
	}
	return a.Rank > b.Rank
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
		"token":     ft.Token,
		"url":       "/api/v1/news/feed/" + ft.Token + ".xml",
		"createdAt": ft.CreatedAt,
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
		"token":     ft.Token,
		"url":       "/api/v1/news/feed/" + ft.Token + ".xml",
		"createdAt": ft.CreatedAt,
	})
}

func (h *Handlers) myPreferences(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, http.StatusMethodNotAllowed, "GET only")
		return
	}
	userID := getUserID(r)
	prefs, err := h.store.GetAllPreferences(userID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonResp(w, http.StatusOK, prefs)
}

func (h *Handlers) myChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, http.StatusMethodNotAllowed, "POST only")
		return
	}
	userID := getUserID(r)
	var req struct {
		Keyword        string `json:"keyword"`
		Message        string `json:"message"`
		ConversationID int64  `json:"conversationId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if strings.TrimSpace(req.Message) == "" {
		jsonError(w, http.StatusBadRequest, "message is required")
		return
	}
	resp, err := h.chat.HandleMessage(r.Context(), ChatRequest{
		UserID:         userID,
		Keyword:        req.Keyword,
		Message:        req.Message,
		ConversationID: req.ConversationID,
	})
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonResp(w, http.StatusOK, resp)
}

func (h *Handlers) myConversations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, http.StatusMethodNotAllowed, "GET only")
		return
	}
	userID := getUserID(r)
	keyword := r.URL.Query().Get("keyword")
	convs, err := h.store.ListConversations(userID, keyword)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	out := make([]map[string]any, 0, len(convs))
	for _, c := range convs {
		msgs, _ := h.store.GetMessages(c.ID)
		out = append(out, map[string]any{
			"id":           c.ID,
			"keyword":      c.Keyword,
			"createdAt":    c.CreatedAt,
			"updatedAt":    c.UpdatedAt,
			"messageCount": len(msgs),
		})
	}
	jsonResp(w, http.StatusOK, out)
}

func (h *Handlers) myConversationMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		jsonError(w, http.StatusMethodNotAllowed, "GET only")
		return
	}
	userID := getUserID(r)
	// Path: /api/v1/news/me/conversations/{id}/messages
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 2 || parts[len(parts)-1] != "messages" {
		jsonError(w, http.StatusNotFound, "not found")
		return
	}
	idStr := parts[len(parts)-2]
	convID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || convID == 0 {
		jsonError(w, http.StatusBadRequest, "invalid conversation id")
		return
	}
	// Verify ownership
	conv, err := h.store.GetConversation(userID, convID)
	if err != nil {
		if err == ErrNotFound {
			jsonError(w, http.StatusNotFound, "conversation not found")
			return
		}
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	msgs, err := h.store.GetMessages(conv.ID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	out := make([]map[string]any, 0, len(msgs))
	for _, m := range msgs {
		out = append(out, map[string]any{
			"id":        m.ID,
			"role":      m.Role,
			"content":   m.Content,
			"createdAt": m.CreatedAt,
		})
	}
	jsonResp(w, http.StatusOK, out)
}

func (h *Handlers) myFeedback(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, http.StatusMethodNotAllowed, "POST only")
		return
	}
	userID := getUserID(r)
	var req struct {
		NewsItemID    string `json:"newsItemId"`
		NewsItemTitle string `json:"newsItemTitle"`
		Keyword       string `json:"keyword"`
		FeedbackType  string `json:"feedbackType"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.NewsItemID == "" || req.NewsItemTitle == "" || (req.FeedbackType != "more_like_this" && req.FeedbackType != "not_interested") {
		jsonError(w, http.StatusBadRequest, "invalid feedback")
		return
	}
	if err := h.store.AddFeedback(userID, req.NewsItemID, req.NewsItemTitle, req.Keyword, req.FeedbackType); err != nil {
		jsonError(w, http.StatusInternalServerError, err.Error())
		return
	}
	jsonResp(w, http.StatusOK, map[string]bool{"success": true})
}
