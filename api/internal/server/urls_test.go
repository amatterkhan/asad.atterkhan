package server

import (
	"testing"

	"github.com/amatterkhan/asad.atterkhan/api/internal/content"
)

var urlCases = map[string]bool{
	"https://example.com/a?b=1":     true,
	"https://sub.example.com":       true,
	"javascript:alert(1)":           false,
	"JavaScript:alert(1)":           false,
	"data:text/html,<script>":       false,
	"http://example.com":            false,
	"https://":                      false,
	"https:///path":                 false,
	"https://user:pw@example.com/x": false,
	"//example.com":                 false,
	" https://example.com":          false,
	"":                              false,
}

func TestHTTPSURL(t *testing.T) {
	for in, want := range urlCases {
		if got := httpsURL(in); got != want {
			t.Errorf("httpsURL(%q) = %v, want %v", in, got, want)
		}
	}
}

func TestDegreeAndAchievementLinksUseTheSharedRule(t *testing.T) {
	for in, want := range urlCases {
		if in == "" || in == " https://example.com" {
			continue // blank/padded values are handled by stringField's trimming and length rules
		}
		e := content.Object("experience")
		e["education"].([]any)[0].(map[string]any)["degreeLink"] = in
		if refused := refusesExperience(e); refused == want {
			t.Errorf("degreeLink %q: refused=%v, want accepted=%v", in, refused, want)
		}
		a := seedAchievements()
		a["achievements"].([]any)[0].(map[string]any)["link"] = in
		if refused := refusesAchievements(a); refused == want {
			t.Errorf("achievement link %q: refused=%v, want accepted=%v", in, refused, want)
		}
	}
}
