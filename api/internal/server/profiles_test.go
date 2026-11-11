package server

import (
	"strings"
	"testing"

	"github.com/amatterkhan/asad.atterkhan/api/internal/content"
)

// refusesProfiles reports whether validateProfiles refuses v with a 400.
func refusesProfiles(v map[string]any) (refused bool) {
	defer func() {
		if p := recover(); p != nil {
			e, ok := p.(*HTTPError)
			refused = ok && e.Status == 400
		}
	}()
	validateProfiles(v)
	return false
}

func profile(id, kind, value string) map[string]any {
	return map[string]any{"id": id, "kind": kind, "value": value, "label": ""}
}

func TestValidateProfilesAcceptsTheSeed(t *testing.T) {
	if got := validateProfiles(content.Object("profiles")); len(got) != 3 {
		t.Fatalf("seed: %d profiles", len(got))
	}
}

func TestValidateProfilesNormalises(t *testing.T) {
	out := validateProfiles(map[string]any{"profiles": []any{
		map[string]any{"id": "htb", "kind": "other", "value": "  https://app.hackthebox.com/users/1  ", "label": "  HTB  "},
		map[string]any{"id": "site", "kind": "website", "value": "https://example.com"},
	}})
	first := out[0].(map[string]any)
	if first["value"] != "https://app.hackthebox.com/users/1" || first["label"] != "HTB" {
		t.Errorf("not trimmed: %v", first)
	}
	if out[1].(map[string]any)["label"] != "" {
		t.Error("a missing label reads as empty")
	}
	if len(validateProfiles(map[string]any{"profiles": []any{}})) != 0 {
		t.Error("an empty list is allowed")
	}
}

func TestValidateProfilesRefuses(t *testing.T) {
	many := []any{}
	for i := 0; i < 13; i++ {
		many = append(many, profile("p"+strings.Repeat("a", i), "website", "https://example.com"))
	}
	for name, v := range map[string]map[string]any{
		"no list":            {},
		"unknown key":        {"profiles": []any{}, "extra": 1},
		"unknown field":      {"profiles": []any{map[string]any{"id": "a", "kind": "website", "value": "https://e.com", "x": 1}}},
		"too many":           {"profiles": many},
		"bad id":             {"profiles": []any{profile("Bad Id", "website", "https://e.com")}},
		"duplicate id":       {"profiles": []any{profile("a", "website", "https://e.com"), profile("a", "website", "https://f.com")}},
		"unknown kind":       {"profiles": []any{profile("a", "twitter", "https://e.com")}},
		"http link":          {"profiles": []any{profile("a", "website", "http://e.com")}},
		"javascript link":    {"profiles": []any{profile("a", "other", "javascript:alert(1)")}},
		"link with a user":   {"profiles": []any{profile("a", "other", "https://user:pw@e.com")}},
		"link with a space":  {"profiles": []any{profile("a", "other", "https://e.com/a b")}},
		"github elsewhere":   {"profiles": []any{profile("a", "github", "https://evil.example/github.com")}},
		"lookalike github":   {"profiles": []any{profile("a", "github", "https://notgithub.com/x")}},
		"linkedin elsewhere": {"profiles": []any{profile("a", "linkedin", "https://example.com/in/x")}},
		"bad email":          {"profiles": []any{profile("a", "email", "not-an-email")}},
		"mailto as email":    {"profiles": []any{profile("a", "email", "mailto:a@b.com")}},
		"link as email kind": {"profiles": []any{profile("a", "email", "https://e.com")}},
		"long label":         {"profiles": []any{map[string]any{"id": "a", "kind": "website", "value": "https://e.com", "label": strings.Repeat("x", 41)}}},
		"control character":  {"profiles": []any{map[string]any{"id": "a", "kind": "website", "value": "https://e.com", "label": "a\x00"}}},
	} {
		if !refusesProfiles(v) {
			t.Errorf("%s: accepted", name)
		}
	}
}

func TestValidateProfilesAcceptsSubdomains(t *testing.T) {
	validateProfiles(map[string]any{"profiles": []any{profile("g", "github", "https://www.github.com/x"), profile("l", "linkedin", "https://uk.linkedin.com/in/x")}})
}
