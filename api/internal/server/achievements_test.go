package server

import (
	"testing"

	"github.com/amatterkhan/asad.atterkhan/api/internal/content"
)

func seedAchievements() map[string]any {
	records := []any{}
	for _, a := range content.Achievements() {
		records = append(records, a)
	}
	return map[string]any{"achievements": records, "featuredIds": []any{"4", "3", "1"}}
}

func refusesAchievements(v map[string]any) (refused bool) {
	defer func() {
		if p := recover(); p != nil {
			e, ok := p.(*HTTPError)
			refused = ok && e.Status == 400
		}
	}()
	validateAchievements(v)
	return false
}

func TestValidateAchievementsAcceptsTheSeed(t *testing.T) {
	records, pins := validateAchievements(seedAchievements())
	if len(records) != 5 || len(pins) != 3 {
		t.Fatalf("seed: %d achievements, %d pinned", len(records), len(pins))
	}
}

func TestValidateAchievementsRefuses(t *testing.T) {
	first := func(v map[string]any) map[string]any { return v["achievements"].([]any)[0].(map[string]any) }
	cases := map[string]func(v map[string]any){
		"duplicate id":   func(v map[string]any) { first(v)["id"] = "2" },
		"http link":      func(v map[string]any) { first(v)["link"] = "http://example.com" },
		"unknown kind":   func(v map[string]any) { first(v)["kind"] = "trophy" },
		"bad date":       func(v map[string]any) { first(v)["earnedAt"] = "2025-13-40" },
		"blank title":    func(v map[string]any) { first(v)["title"] = " " },
		"unknown key":    func(v map[string]any) { first(v)["x"] = 1 },
		"pin not listed": func(v map[string]any) { v["featuredIds"] = []any{"nope"} },
		"pin twice":      func(v map[string]any) { v["featuredIds"] = []any{"1", "1"} },
		"seven pins":     func(v map[string]any) { v["featuredIds"] = []any{"1", "2", "3", "4", "5", "1x", "2x"} },
	}
	for name, mutate := range cases {
		v := seedAchievements()
		mutate(v)
		if !refusesAchievements(v) {
			t.Errorf("%s was accepted", name)
		}
	}
}
