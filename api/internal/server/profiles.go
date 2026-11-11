package server

import (
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"github.com/amatterkhan/asad.atterkhan/api/internal/content"
)

var (
	profileKinds = map[string]bool{"github": true, "linkedin": true, "email": true, "website": true, "other": true}
	// emailPattern matches the site's EMAIL in schemas.ts: something@host.tld, no spaces, quotes or angle brackets.
	emailPattern = regexp.MustCompile(`^[^\s@<>"'\\:]+@[^\s@<>"'\\]+\.[^\s@<>"'\\]+$`)
)

// hostIs reports whether a link is on domain or one of its subdomains.
func hostIs(link, domain string) bool {
	u, err := url.Parse(link)
	if err != nil {
		return false
	}
	h := strings.ToLower(u.Hostname())
	return h == domain || strings.HasSuffix(h, "."+domain)
}

// validateProfiles checks the profile links (siteSettings/profiles) against the site's
// ProfilesSchema and returns them normalised: trimmed, no unknown keys, unique ids, https links only
// (or an address for the email kind), and GitHub and LinkedIn links on their own domains.
func validateProfiles(v map[string]any) []any {
	keys(v, "profiles", "updatedAt")
	list, ok := v["profiles"].([]any)
	if !ok || len(list) > 12 {
		fail(400, "Invalid input")
	}
	out := []any{}
	seen := map[string]bool{}
	for _, x := range list {
		p, ok := x.(map[string]any)
		if !ok {
			fail(400, "Invalid input")
		}
		keys(p, "id", "kind", "value", "label")
		id := labID(p["id"])
		if seen[id] {
			fail(400, "Profile ids must be unique")
		}
		seen[id] = true
		kind := str(p["kind"])
		if !profileKinds[kind] {
			fail(400, "Invalid input")
		}
		value := stringField(p, "value", 1, 300, true)
		label := ""
		if _, present := p["label"]; present {
			label = stringField(p, "label", 0, 40, true)
		}
		if controlPattern.MatchString(value) || controlPattern.MatchString(label) {
			fail(400, "Invalid input")
		}
		switch {
		case kind == "email":
			if !emailPattern.MatchString(value) {
				fail(400, "Use an email address")
			}
		case !httpsURL(value) || strings.ContainsAny(value, " \\"):
			fail(400, "Use an HTTPS link")
		case kind == "github" && !hostIs(value, "github.com"):
			fail(400, "A GitHub link is on github.com")
		case kind == "linkedin" && !hostIs(value, "linkedin.com"):
			fail(400, "A LinkedIn link is on linkedin.com")
		}
		out = append(out, map[string]any{"id": id, "kind": kind, "value": value, "label": label})
	}
	return out
}

// profiles reads and replaces the profile links shown on Home and in the menu.
func (s *Server) profiles(w http.ResponseWriter, r *http.Request) {
	uid := s.owner(r, "content", false)
	ctx := r.Context()
	if r.Method == "GET" {
		s.quota(ctx, uid+":content-read", 1000, 1)
		out := content.Object("profiles")
		if stored := s.get(ctx, "siteSettings", "profiles"); stored != nil {
			out = map[string]any{"profiles": stored["profiles"], "updatedAt": stored["updatedAt"]}
		}
		jsonResponse(w, 200, out)
		return
	}
	v := input(w, r, 32*1024, "profiles", "updatedAt")
	list := validateProfiles(v)
	s.quota(ctx, uid+":content-write", 500, 1)
	stored := map[string]any{"profiles": list, "ownerUid": uid, "updatedAt": stamp()}
	_, err := s.services.DB.Collection("siteSettings").Doc("profiles").Set(ctx, stored)
	must(err)
	audit("profiles_updated", "profiles")
	s.rebuild(ctx, "profiles")
	jsonResponse(w, 200, map[string]any{"profiles": list, "updatedAt": stored["updatedAt"]})
}
