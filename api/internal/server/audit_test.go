package server

import (
	"bytes"
	"log/slog"
	"net/http/httptest"
	"strings"
	"testing"
)

func captureLogs(t *testing.T) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	old := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&buf, nil)))
	t.Cleanup(func() { slog.SetDefault(old) })
	return &buf
}

func TestAdminRequestsAreAuditedWithoutSecrets(t *testing.T) {
	t.Setenv("ENABLE_CONTENT_ADMIN", "true")
	logs := captureLogs(t)
	req := httptest.NewRequest("PUT", "/api/admin/site", strings.NewReader("{}"))
	req.Header.Set("X-Forwarded-For", "203.0.113.9, 10.0.0.1")
	req.Header.Set("User-Agent", "probe/1.0")
	req.Header.Set("Authorization", "Basic super-secret-value")
	rec := httptest.NewRecorder()
	New().Handler().ServeHTTP(rec, req)
	if rec.Code != 401 {
		t.Fatalf("status %d", rec.Code)
	}
	line := logs.String()
	for _, want := range []string{"admin_request", "status=401", "ip=203.0.113.9", "user_agent=probe/1.0", "path=/api/admin/site", "reason=\"Sign in required\"", "level=WARN"} {
		if !strings.Contains(line, want) {
			t.Errorf("log line misses %q: %s", want, line)
		}
	}
	if strings.Contains(line, "super-secret-value") || strings.Contains(line, "10.0.0.1") {
		t.Errorf("log leaks a header: %s", line)
	}
}

func TestPublicRoutesAreNotAdminAudited(t *testing.T) {
	logs := captureLogs(t)
	rec := httptest.NewRecorder()
	New().Handler().ServeHTTP(rec, httptest.NewRequest("GET", "/api/healthz", nil))
	if strings.Contains(logs.String(), "admin_request") {
		t.Errorf("healthz was audited: %s", logs.String())
	}
}

func TestClientIPUsesTheFirstForwardedHop(t *testing.T) {
	r := httptest.NewRequest("GET", "/", nil)
	r.RemoteAddr = "192.0.2.1:4000"
	if got := clientIP(r); got != "192.0.2.1" {
		t.Errorf("peer: %q", got)
	}
	r.Header.Set("X-Forwarded-For", " 198.51.100.7 ,1.1.1.1")
	if got := clientIP(r); got != "198.51.100.7" {
		t.Errorf("forwarded: %q", got)
	}
}

func TestDownloadBudgetStopsOneClientNotOthers(t *testing.T) {
	var b downloadBudget
	size := int64(clientDownloadBytes / 2)
	if !b.allow("a", size) || !b.allow("a", size) {
		t.Fatal("client refused within its share")
	}
	if b.allow("a", 1) {
		t.Fatal("client allowed past its share")
	}
	if !b.allow("b", size) {
		t.Fatal("another client was refused")
	}
	b.exhaust()
	if b.allow("c", 1) {
		t.Fatal("allowed after the shared budget was spent")
	}
}

func TestPublicFileCacheHeader(t *testing.T) {
	if !strings.Contains(publicCache, "s-maxage=3600") || !strings.HasPrefix(publicCache, "public") {
		t.Fatalf("public files must be CDN-cacheable: %q", publicCache)
	}
}
