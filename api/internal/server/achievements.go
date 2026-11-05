package server

import (
	"net/http"

	"github.com/amatterkhan/asad.atterkhan/api/internal/content"
)

var achievementKinds = map[string]bool{"certification": true, "badge": true, "award": true}

// validateAchievements checks the achievements and the ones pinned to Experience
// (siteSettings/achievements) against the site's AchievementSchema and returns both normalised:
// trimmed text, no unknown keys, unique ids, HTTPS links, and pins that name an achievement.
func validateAchievements(v map[string]any) ([]any, []any) {
	keys(v, "achievements", "featuredIds", "updatedAt")
	records := list(v, "achievements", 0, 100)
	known := map[string]bool{}
	for _, x := range records {
		a := object(x)
		keys(a, "id", "kind", "title", "issuer", "link", "earnedAt")
		id := stringField(a, "id", 1, 80, true)
		if !slugPattern.MatchString(id) || known[id] {
			fail(400, "Achievement ids must be unique")
		}
		known[id] = true
		if !achievementKinds[str(a["kind"])] {
			fail(400, "Invalid input")
		}
		text(a, "title", 1, 200)
		text(a, "issuer", 1, 160)
		link := stringField(a, "link", 1, 500, true)
		if !httpsURL(link) {
			fail(400, "Use an HTTPS credential link")
		}
		if d, ok := a["earnedAt"]; ok {
			if d == nil || d == "" {
				delete(a, "earnedAt")
			} else if s, ok := d.(string); !ok || !validDate(s) {
				fail(400, "Invalid input")
			}
		}
	}
	pins := tags(v, "featuredIds", true, 6)
	out := []any{}
	for _, id := range pins {
		if !known[id] {
			fail(400, "Pin an achievement from the list")
		}
		out = append(out, id)
	}
	return records, out
}

// achievements reads and replaces the achievements and the ones pinned to the Experience page.
func (s *Server) achievements(w http.ResponseWriter, r *http.Request) {
	uid := s.owner(r, "content", false)
	ctx := r.Context()
	if r.Method == "GET" {
		s.quota(ctx, uid+":content-read", 1000, 1)
		out := map[string]any{"achievements": []any{}, "featuredIds": content.Object("achievement-settings")["featuredIds"]}
		for _, a := range content.Achievements() {
			out["achievements"] = append(out["achievements"].([]any), a)
		}
		if stored := s.get(ctx, "siteSettings", "achievements"); stored != nil {
			if list, ok := stored["achievements"]; ok {
				out["achievements"] = list
			}
			out["featuredIds"] = stored["featuredIds"]
			out["updatedAt"] = stored["updatedAt"]
		}
		jsonResponse(w, 200, out)
		return
	}
	v := input(w, r, 128*1024, "achievements", "featuredIds", "updatedAt")
	records, pins := validateAchievements(v)
	s.quota(ctx, uid+":content-write", 500, 1)
	stored := map[string]any{"achievements": records, "featuredIds": pins, "ownerUid": uid, "updatedAt": stamp()}
	_, err := s.services.DB.Collection("siteSettings").Doc("achievements").Set(ctx, stored)
	must(err)
	audit("achievements_updated", "achievements")
	s.rebuild(ctx, "achievements")
	jsonResponse(w, 200, map[string]any{"achievements": records, "featuredIds": pins, "updatedAt": stored["updatedAt"]})
}
