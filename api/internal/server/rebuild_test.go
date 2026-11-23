package server

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

// Both GitHub modes send the token and the right body to the right endpoint. github-workflow is the
// SEC-02 fix: it starts the deploy workflow with a token that holds only Actions: write.
func TestRebuildGitHubModes(t *testing.T) {
	for _, tc := range []struct {
		hook, path string
		body       map[string]any
	}{
		{"github", "/repos/owner/repo/dispatches",
			map[string]any{"event_type": "content-published", "client_payload": map[string]any{"reason": "publish"}}},
		{"github-workflow", "/repos/owner/repo/actions/workflows/site-deploy.yml/dispatches",
			map[string]any{"ref": "main"}},
	} {
		t.Run(tc.hook, func(t *testing.T) {
			calls := 0
			gh := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls++
				if r.Method != "POST" || r.URL.Path != tc.path {
					t.Errorf("got %s %s, want POST %s", r.Method, r.URL.Path, tc.path)
				}
				if r.Header.Get("Authorization") != "Bearer test-token" {
					t.Error("token missing")
				}
				b, _ := io.ReadAll(r.Body)
				var got map[string]any
				if err := json.Unmarshal(b, &got); err != nil {
					t.Fatal(err)
				}
				want, _ := json.Marshal(tc.body)
				if gotJSON, _ := json.Marshal(got); string(gotJSON) != string(want) {
					t.Errorf("body %s, want %s", gotJSON, want)
				}
				w.WriteHeader(204)
			}))
			defer gh.Close()
			old := githubAPI
			githubAPI = gh.URL
			defer func() { githubAPI = old }()
			t.Setenv("REBUILD_HOOK", tc.hook)
			t.Setenv("GITHUB_REPO", "owner/repo")
			t.Setenv("GITHUB_TOKEN", "test-token")
			s := &Server{client: gh.Client()}
			s.rebuild(context.Background(), "publish")
			if calls != 1 {
				t.Fatalf("hook called %d times, want 1", calls)
			}
		})
	}
}

// Without a valid repository or a token, neither mode sends anything.
func TestRebuildGitHubNeedsConfiguration(t *testing.T) {
	for _, hook := range []string{"github", "github-workflow"} {
		for _, env := range []struct{ repo, token string }{{"", "t"}, {"owner/repo/../x", "t"}, {"owner/repo", ""}} {
			calls := 0
			gh := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { calls++ }))
			old := githubAPI
			githubAPI = gh.URL
			t.Setenv("REBUILD_HOOK", hook)
			t.Setenv("GITHUB_REPO", env.repo)
			t.Setenv("GITHUB_TOKEN", env.token)
			(&Server{client: gh.Client()}).rebuild(context.Background(), "publish")
			githubAPI = old
			gh.Close()
			if calls != 0 {
				t.Errorf("%s with repo %q token %q: hook called", hook, env.repo, env.token)
			}
		}
	}
}
