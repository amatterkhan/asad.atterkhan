package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// Anonymous abuse is refused before the API touches Firebase: no Firestore read, no Auth call, no
// cost beyond the request itself. The server here has no Firebase connection at all, so a refusal
// that reached Firebase would answer 500 (or connect) instead of the expected status.
func TestAnonymousRefusalsNeverReachFirebase(t *testing.T) {
	id := "12345678-1234-4234-8234-123456789012"
	s := New()
	h := s.Handler()
	send := func(method, path, bearer string) int {
		req := httptest.NewRequest(method, path, nil)
		if bearer != "" {
			req.Header.Set("Authorization", bearer)
		}
		w := httptest.NewRecorder()
		h.ServeHTTP(w, req)
		return w.Code
	}
	// admin features switched off: 503 for every protected route, whatever the caller sends
	for _, flag := range []string{"ENABLE_CONTENT_ADMIN", "ENABLE_DOCUMENT_ADMIN", "ENABLE_ACHIEVEMENT_ADMIN", "ENABLE_PUBLIC_FILES"} {
		t.Setenv(flag, "false")
	}
	for _, r := range protectedRoutes() {
		if got := send(r.method, r.path, "Bearer x"); got != 503 {
			t.Errorf("flags off: %s %s got %d want 503", r.method, r.path, got)
		}
	}
	// public files switched off, or an id that is not a UUID: 404 without a Firestore read
	for _, path := range []string{"/files/" + id, "/media/" + id} {
		if got := send("GET", path, ""); got != 404 {
			t.Errorf("public files off: %s got %d want 404", path, got)
		}
	}
	t.Setenv("ENABLE_PUBLIC_FILES", "true")
	for _, path := range []string{"/files/not-an-id", "/media/" + strings.Repeat("a", 36), "/files/" + id + "x"} {
		if got := send("GET", path, ""); got != 404 {
			t.Errorf("bad id: %s got %d want 404", path, got)
		}
	}
	// admin on: no bearer, a malformed one, or an oversized one is 401 before token verification
	for _, flag := range []string{"ENABLE_CONTENT_ADMIN", "ENABLE_DOCUMENT_ADMIN", "ENABLE_ACHIEVEMENT_ADMIN"} {
		t.Setenv(flag, "true")
	}
	for _, bearer := range []string{"", "Basic x", "Bearer " + strings.Repeat("a", 9000)} {
		for _, r := range protectedRoutes() {
			if got := send(r.method, r.path, bearer); got != 401 {
				t.Errorf("bearer %.12q: %s %s got %d want 401", bearer, r.method, r.path, got)
			}
		}
	}
	// unknown paths and the health check need nothing
	if got := send("GET", "/api/admin/nope", ""); got != 404 {
		t.Errorf("unknown path got %d want 404", got)
	}
	if got := send("GET", "/api/healthz", ""); got != http.StatusOK {
		t.Errorf("healthz got %d", got)
	}
	if s.services != nil {
		t.Fatal("an anonymous refusal opened a Firebase connection")
	}
}
