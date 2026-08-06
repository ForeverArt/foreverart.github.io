package news

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// Auth handles user registration, login, and token-based session management.
type Auth struct {
	store  *Store
	secret []byte // HMAC signing key
}

// NewAuth creates an Auth instance.
func NewAuth(store *Store, secret string) *Auth {
	return &Auth{store: store, secret: []byte(secret)}
}

type registerReq struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type loginReq struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type tokenPayload struct {
	UserID int64  `json:"uid"`
	Exp    int64  `json:"exp"` // unix timestamp
}

// Register creates a new user account.
func (a *Auth) Register(w http.ResponseWriter, r *http.Request) {
	var req registerReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if len(req.Username) < 2 || len(req.Username) > 32 {
		jsonError(w, http.StatusBadRequest, "username must be 2-32 chars")
		return
	}
	if len(req.Password) < 6 || len(req.Password) > 64 {
		jsonError(w, http.StatusBadRequest, "password must be 6-64 chars")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "hash error")
		return
	}
	u, err := a.store.CreateUser(req.Username, string(hash))
	if err != nil {
		if err == ErrUserExists {
			jsonError(w, http.StatusConflict, "username already exists")
			return
		}
		jsonError(w, http.StatusInternalServerError, "create user error")
		return
	}
	token, err := a.signToken(u.ID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "token error")
		return
	}
	jsonResp(w, http.StatusCreated, map[string]any{
		"userId":   u.ID,
		"username": u.Username,
		"token":    token,
	})
}

// Login authenticates a user and returns a session token.
func (a *Auth) Login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "invalid json")
		return
	}
	u, pwHash, err := a.store.GetUserByName(req.Username)
	if err != nil {
		jsonError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(pwHash), []byte(req.Password)); err != nil {
		jsonError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	token, err := a.signToken(u.ID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "token error")
		return
	}
	jsonResp(w, http.StatusOK, map[string]any{
		"userId":   u.ID,
		"username": u.Username,
		"token":    token,
	})
}

// RequireAuth is middleware that validates the Authorization header and injects
// the authenticated user into the request context.
func (a *Auth) RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth == "" {
			jsonError(w, http.StatusUnauthorized, "missing Authorization header")
			return
		}
		token := strings.TrimPrefix(auth, "Bearer ")
		payload, err := a.verifyToken(token)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}
		u, err := a.store.GetUserByID(payload.UserID)
		if err != nil {
			jsonError(w, http.StatusUnauthorized, "user not found")
			return
		}
		// Store user in request context via header (simple approach)
		r.Header.Set("X-User-ID", fmt.Sprintf("%d", u.ID))
		r.Header.Set("X-Username", u.Username)
		next(w, r)
	}
}

// signToken creates an HMAC-signed session token valid for 30 days.
func (a *Auth) signToken(userID int64) (string, error) {
	payload := tokenPayload{
		UserID: userID,
		Exp:    time.Now().Add(30 * 24 * time.Hour).Unix(),
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	payloadB64 := base64.RawURLEncoding.EncodeToString(data)
	mac := hmac.New(sha256.New, a.secret)
	mac.Write([]byte(payloadB64))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return payloadB64 + "." + sig, nil
}

// verifyToken validates an HMAC-signed token and returns the payload.
func (a *Auth) verifyToken(token string) (*tokenPayload, error) {
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return nil, ErrInvalidToken
	}
	payloadB64, sig := parts[0], parts[1]
	mac := hmac.New(sha256.New, a.secret)
	mac.Write([]byte(payloadB64))
	expectedSig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(sig), []byte(expectedSig)) {
		return nil, ErrInvalidToken
	}
	data, err := base64.RawURLEncoding.DecodeString(payloadB64)
	if err != nil {
		return nil, ErrInvalidToken
	}
	var payload tokenPayload
	if err := json.Unmarshal(data, &payload); err != nil {
		return nil, ErrInvalidToken
	}
	if time.Now().Unix() > payload.Exp {
		return nil, ErrInvalidToken
	}
	return &payload, nil
}

func getUserID(r *http.Request) int64 {
	s := r.Header.Get("X-User-ID")
	if s == "" {
		return 0
	}
	var id int64
	fmt.Sscanf(s, "%d", &id)
	return id
}

func jsonError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func jsonResp(w http.ResponseWriter, code int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(data)
}
