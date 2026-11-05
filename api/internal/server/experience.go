package server

import (
	"net/http"
	"strings"

	"github.com/amatterkhan/asad.atterkhan/api/internal/content"
)

func list(v map[string]any, key string, min, max int) []any {
	a, ok := v[key].([]any)
	if !ok || len(a) < min || len(a) > max {
		fail(400, "Invalid input")
	}
	return a
}
func object(x any) map[string]any {
	m, ok := x.(map[string]any)
	if !ok {
		fail(400, "Invalid input")
	}
	return m
}

// text trims and bounds one string field and refuses control characters.
func text(m map[string]any, key string, min, max int) {
	if controlPattern.MatchString(stringField(m, key, min, max, true)) {
		fail(400, "Invalid input")
	}
}

// validateExperience checks the Experience page (siteSettings/experience) against the site's
// ExperienceSchema and returns it normalised: trimmed text, no unknown keys, unique role ids,
// and promotionFrom naming another role.
func validateExperience(v map[string]any) map[string]any {
	keys(v, "work", "education", "skills", "updatedAt")
	work := list(v, "work", 0, 12)
	ids := map[float64]bool{}
	for _, x := range work {
		r := object(x)
		keys(r, "id", "title", "company", "dateRange", "responsibilities", "promotionFrom", "isCurrent")
		id, ok := r["id"].(float64)
		if !ok || id != float64(int64(id)) || id < 0 || ids[id] {
			fail(400, "Role ids must be unique")
		}
		ids[id] = true
		text(r, "title", 1, 100)
		text(r, "company", 1, 100)
		text(r, "dateRange", 1, 60)
		duties := list(r, "responsibilities", 1, 10)
		for i, d := range duties {
			s, ok := d.(string)
			s = strings.TrimSpace(s)
			if !ok || length(s) < 1 || length(s) > 500 || controlPattern.MatchString(s) {
				fail(400, "Invalid input")
			}
			duties[i] = s
		}
		if p, ok := r["promotionFrom"]; ok {
			if p == nil {
				delete(r, "promotionFrom")
			} else if _, ok := p.(float64); !ok {
				fail(400, "Invalid input")
			}
		}
		if c, ok := r["isCurrent"]; ok {
			if b, ok := c.(bool); !ok {
				fail(400, "Invalid input")
			} else if !b {
				delete(r, "isCurrent")
			}
		}
	}
	for _, x := range work {
		if p, ok := x.(map[string]any)["promotionFrom"]; ok && !ids[p.(float64)] {
			fail(400, "A promotion must come from one of the roles")
		}
	}
	for _, x := range list(v, "education", 0, 6) {
		e := object(x)
		keys(e, "degree", "field", "university", "classification", "degreeLink", "graduationDate", "isGraduated")
		text(e, "degree", 1, 100)
		text(e, "field", 1, 100)
		text(e, "university", 1, 100)
		text(e, "classification", 0, 60)
		text(e, "graduationDate", 0, 40)
		if !httpsURL(stringField(e, "degreeLink", 1, 500, true)) {
			fail(400, "Invalid input")
		}
		if _, ok := e["isGraduated"].(bool); !ok {
			fail(400, "Invalid input")
		}
	}
	for _, x := range list(v, "skills", 0, 10) {
		k := object(x)
		keys(k, "category", "items")
		text(k, "category", 1, 60)
		text(k, "items", 1, 500)
	}
	return map[string]any{"work": v["work"], "education": v["education"], "skills": v["skills"]}
}

// experience reads and replaces the Experience page: work, education and skills.
func (s *Server) experience(w http.ResponseWriter, r *http.Request) {
	uid := s.owner(r, "content", false)
	ctx := r.Context()
	if r.Method == "GET" {
		s.quota(ctx, uid+":content-read", 1000, 1)
		out := content.Object("experience")
		if stored := s.get(ctx, "siteSettings", "experience"); stored != nil {
			out = map[string]any{"work": stored["work"], "education": stored["education"], "skills": stored["skills"], "updatedAt": stored["updatedAt"]}
		}
		jsonResponse(w, 200, out)
		return
	}
	v := input(w, r, 128*1024, "work", "education", "skills", "updatedAt")
	stored := validateExperience(v)
	s.quota(ctx, uid+":content-write", 500, 1)
	stored["ownerUid"] = uid
	stored["updatedAt"] = stamp()
	_, err := s.services.DB.Collection("siteSettings").Doc("experience").Set(ctx, stored)
	must(err)
	audit("experience_updated", "experience")
	s.rebuild(ctx, "experience")
	jsonResponse(w, 200, map[string]any{"work": stored["work"], "education": stored["education"], "skills": stored["skills"], "updatedAt": stored["updatedAt"]})
}
