package httpx

import (
	"crypto/subtle"
	"net/http"
)

// AdminAuth guards admin endpoints with a shared password passed via
// the X-Admin-Password header. An empty password disables the endpoint
// entirely (404), so it is not discoverable when unconfigured.
func AdminAuth(password string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if password == "" {
			JSONError(w, http.StatusNotFound, "not found")
			return
		}
		got := r.Header.Get("X-Admin-Password")
		if subtle.ConstantTimeCompare([]byte(got), []byte(password)) != 1 {
			JSONError(w, http.StatusUnauthorized, "invalid admin password")
			return
		}
		next(w, r)
	}
}
