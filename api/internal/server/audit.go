package server

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"sync"
)

// actor is filled in as an /api/admin/* request is authenticated and logged once when it finishes.
type actor struct {
	mu       sync.Mutex
	uid      string
	authTime int64
	reason   string
}

type actorKey struct{}

func actorFrom(ctx context.Context) *actor { a, _ := ctx.Value(actorKey{}).(*actor); return a }

func (a *actor) verified(uid string, authTime int64) {
	a.mu.Lock()
	a.uid, a.authTime = uid, authTime
	a.mu.Unlock()
}
func (a *actor) denied(reason string) {
	a.mu.Lock()
	a.reason = reason
	a.mu.Unlock()
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	if w.status == 0 {
		w.status = code
	}
	w.ResponseWriter.WriteHeader(code)
}
func (w *statusWriter) Write(b []byte) (int, error) {
	if w.status == 0 {
		w.status = 200
	}
	return w.ResponseWriter.Write(b)
}

// clientIP is the first X-Forwarded-For hop (Firebase Hosting and Cloud Run set it), else the peer address.
// It is for logs and best-effort throttling only: the first hop can be forged by the caller.
func clientIP(r *http.Request) string {
	if f := r.Header.Get("X-Forwarded-For"); f != "" {
		if ip := strings.TrimSpace(strings.SplitN(f, ",", 2)[0]); ip != "" {
			return clip(ip, 64)
		}
	}
	host := r.RemoteAddr
	if i := strings.LastIndex(host, ":"); i > 0 {
		host = host[:i]
	}
	return clip(host, 64)
}

func clip(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}

// withAudit logs one line per /api/admin/* request: who (uid, auth_time), from where (IP, user agent), what
// (method, path) and the outcome (status, and the reason for a refusal). Tokens and bodies are never logged.
func withAudit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/api/admin/") {
			next.ServeHTTP(w, r)
			return
		}
		a := &actor{}
		sw := &statusWriter{ResponseWriter: w}
		defer func() {
			status := sw.status
			if p := recover(); p != nil {
				status = 500
				defer panic(p)
			}
			if status == 0 {
				status = 200
			}
			a.mu.Lock()
			attrs := []any{"method", r.Method, "path", clip(r.URL.Path, 200), "status", status, "uid", a.uid, "auth_time", a.authTime, "ip", clientIP(r), "user_agent", clip(r.UserAgent(), 200)}
			if status >= 400 && a.reason != "" {
				attrs = append(attrs, "reason", a.reason)
			}
			a.mu.Unlock()
			level := slog.LevelInfo
			if status == 401 || status == 403 || status == 429 {
				level = slog.LevelWarn
			}
			slog.Log(context.Background(), level, "admin_request", attrs...)
		}()
		next.ServeHTTP(sw, r.WithContext(context.WithValue(r.Context(), actorKey{}, a)))
	})
}
