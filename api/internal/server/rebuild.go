package server

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"regexp"
)

var repoPattern = regexp.MustCompile(`^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`)

// A failed hook is logged after the content commit. Returning a failure for an already committed
// publish would encourage retrying a non-idempotent action. Operators can dispatch a rebuild manually.
func (s *Server) rebuild(ctx context.Context, reason string) {
	// The content is already committed: finish the delivery even if the owner's request goes away.
	ctx = context.WithoutCancel(ctx)
	hook := os.Getenv("REBUILD_HOOK")
	if hook == "" {
		slog.Info("rebuild_requested", "reason", reason, "delivery", "log-only")
		return
	}
	endpoint := hook
	payload := map[string]any{"event": "content-published", "reason": reason}
	authorization := ""
	if hook == "github" {
		repo := os.Getenv("GITHUB_REPO")
		if !repoPattern.MatchString(repo) || os.Getenv("GITHUB_TOKEN") == "" {
			slog.Error("rebuild_hook_failed", "reason", "missing GitHub configuration")
			return
		}
		endpoint = "https://api.github.com/repos/" + repo + "/dispatches"
		payload = map[string]any{"event_type": "content-published", "client_payload": map[string]any{"reason": reason}}
		authorization = "Bearer " + os.Getenv("GITHUB_TOKEN")
	} else {
		authorization = "Bearer " + os.Getenv("REBUILD_HOOK_SECRET")
		u, err := url.Parse(endpoint)
		if err != nil || u.Scheme != "https" || u.Host == "" || u.User != nil || os.Getenv("REBUILD_HOOK_SECRET") == "" {
			slog.Error("rebuild_hook_failed", "reason", "HTTPS URL and secret required")
			return
		}
	}
	b, err := json.Marshal(payload)
	if err != nil {
		return
	}
	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(b))
	if err != nil {
		return
	}
	req.Header.Set("Authorization", authorization)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	res, err := s.client.Do(req)
	if err != nil {
		// The error text can include the hook URL; log only that delivery failed.
		slog.Error("rebuild_hook_failed", "reason", reason, "cause", "request failed")
		return
	}
	defer res.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(res.Body, 4096))
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		slog.Error("rebuild_hook_failed", "reason", reason, "status", res.StatusCode)
		return
	}
	slog.Info("rebuild_hook_delivered", "reason", reason)
}
