package server

import (
	"net/http"

	"github.com/amatterkhan/asad.atterkhan/api/internal/content"
)

// thoughtContexts matches ThoughtContext in site/src/lib/schemas.ts: when a Thought may be said.
var thoughtContexts = map[string]bool{"general": true, "night": true, "storm": true, "steins-gate": true}

// validateThoughts checks Asad's Thoughts (siteSettings/thoughts) against the site's ThoughtsSchema
// and returns them normalised: trimmed text, no unknown keys, unique ids, and a featured id that
// names one of them (or nil).
func validateThoughts(v map[string]any) ([]any, any) {
	keys(v, "thoughts", "featured", "updatedAt")
	list, ok := v["thoughts"].([]any)
	if !ok || len(list) > 60 {
		fail(400, "Invalid input")
	}
	out := []any{}
	seen := map[string]bool{}
	for _, x := range list {
		t, ok := x.(map[string]any)
		if !ok {
			fail(400, "Invalid input")
		}
		keys(t, "id", "text", "enabled", "context")
		id := labID(t["id"])
		if seen[id] {
			fail(400, "Thought ids must be unique")
		}
		seen[id] = true
		text := stringField(t, "text", 1, 80, true)
		if controlPattern.MatchString(text) {
			fail(400, "Invalid input")
		}
		enabled, ok := t["enabled"].(bool)
		if !ok || !thoughtContexts[str(t["context"])] {
			fail(400, "Invalid input")
		}
		out = append(out, map[string]any{"id": id, "text": text, "enabled": enabled, "context": t["context"]})
	}
	featured, present := v["featured"]
	if !present || featured == nil {
		return out, nil
	}
	if f, ok := featured.(string); !ok || !seen[f] {
		fail(400, "The featured Thought must be one of the list")
	}
	return out, featured
}

// thoughts reads and replaces Asad's Thoughts: the one-liners he says in the homepage room.
func (s *Server) thoughts(w http.ResponseWriter, r *http.Request) {
	uid := s.owner(r, "content", false)
	ctx := r.Context()
	if r.Method == "GET" {
		s.quota(ctx, uid+":content-read", 1000, 1)
		out := content.Object("thoughts")
		if stored := s.get(ctx, "siteSettings", "thoughts"); stored != nil {
			out = map[string]any{"thoughts": stored["thoughts"], "featured": stored["featured"], "updatedAt": stored["updatedAt"]}
		}
		jsonResponse(w, 200, out)
		return
	}
	v := input(w, r, 64*1024, "thoughts", "featured", "updatedAt")
	list, featured := validateThoughts(v)
	s.quota(ctx, uid+":content-write", 500, 1)
	stored := map[string]any{"thoughts": list, "featured": featured, "ownerUid": uid, "updatedAt": stamp()}
	_, err := s.services.DB.Collection("siteSettings").Doc("thoughts").Set(ctx, stored)
	must(err)
	audit("thoughts_updated", "thoughts")
	s.rebuild(ctx, "thoughts")
	jsonResponse(w, 200, map[string]any{"thoughts": list, "featured": featured, "updatedAt": stored["updatedAt"]})
}
