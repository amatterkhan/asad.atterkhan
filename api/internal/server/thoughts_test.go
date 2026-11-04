package server

import (
	"strings"
	"testing"

	"github.com/amatterkhan/asad.atterkhan/api/internal/content"
)

// rejects reports whether validateThoughts refuses v with a 400.
func rejects(v map[string]any) (refused bool) {
	defer func() {
		if p := recover(); p != nil {
			e, ok := p.(*HTTPError)
			refused = ok && e.Status == 400
		}
	}()
	validateThoughts(v)
	return false
}

func thought(id, text, ctx string) map[string]any {
	return map[string]any{"id": id, "text": text, "enabled": true, "context": ctx}
}

func TestValidateThoughtsAcceptsTheSeed(t *testing.T) {
	list, featured := validateThoughts(content.Object("thoughts"))
	if len(list) != 16 || featured != nil {
		t.Fatalf("seed: %d thoughts, featured %v", len(list), featured)
	}
}

func TestValidateThoughtsNormalises(t *testing.T) {
	list, featured := validateThoughts(map[string]any{
		"thoughts": []any{thought("a", "  Reality is an edge case.  ", "general"), thought("b", "Night.", "night")},
		"featured": "a",
	})
	if got := list[0].(map[string]any)["text"]; got != "Reality is an edge case." {
		t.Errorf("text not trimmed: %q", got)
	}
	if featured != "a" {
		t.Errorf("featured: %v", featured)
	}
	if _, f := validateThoughts(map[string]any{"thoughts": []any{}, "featured": nil}); f != nil {
		t.Error("an empty list is allowed and has nothing featured")
	}
}

func TestValidateThoughtsRefuses(t *testing.T) {
	ok := thought("a", "Fine.", "general")
	for name, v := range map[string]map[string]any{
		"no list":           {"featured": nil},
		"unknown key":       {"thoughts": []any{ok}, "featured": nil, "extra": 1},
		"unknown field":     {"thoughts": []any{map[string]any{"id": "a", "text": "x", "enabled": true, "context": "general", "x": 1}}, "featured": nil},
		"bad id":            {"thoughts": []any{thought("Bad Id", "x", "general")}, "featured": nil},
		"duplicate id":      {"thoughts": []any{ok, ok}, "featured": nil},
		"empty text":        {"thoughts": []any{thought("a", "   ", "general")}, "featured": nil},
		"long text":         {"thoughts": []any{thought("a", strings.Repeat("x", 81), "general")}, "featured": nil},
		"control character": {"thoughts": []any{thought("a", "bad\x00", "general")}, "featured": nil},
		"unknown context":   {"thoughts": []any{thought("a", "x", "lab-coat")}, "featured": nil},
		"enabled not bool":  {"thoughts": []any{map[string]any{"id": "a", "text": "x", "enabled": "yes", "context": "general"}}, "featured": nil},
		"featured missing":  {"thoughts": []any{ok}, "featured": "b"},
		"featured not text": {"thoughts": []any{ok}, "featured": 3},
	} {
		if !rejects(v) {
			t.Errorf("%s: accepted", name)
		}
	}
	many := []any{}
	for i := range 61 {
		many = append(many, thought("t"+strings.Repeat("x", i), "x", "general"))
	}
	if !rejects(map[string]any{"thoughts": many, "featured": nil}) {
		t.Error("more than 60 thoughts accepted")
	}
}
