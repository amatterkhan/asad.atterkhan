package server

import (
	"testing"

	"github.com/amatterkhan/asad.atterkhan/api/internal/content"
)

func refusesExperience(v map[string]any) (refused bool) {
	defer func() {
		if p := recover(); p != nil {
			e, ok := p.(*HTTPError)
			refused = ok && e.Status == 400
		}
	}()
	validateExperience(v)
	return false
}

func TestValidateExperienceAcceptsTheSeed(t *testing.T) {
	out := validateExperience(content.Object("experience"))
	if len(out["work"].([]any)) != 4 || len(out["skills"].([]any)) != 4 {
		t.Fatalf("seed changed shape: %v", out)
	}
}

func TestValidateExperienceRefuses(t *testing.T) {
	cases := map[string]func(v map[string]any){
		"duplicate role id":      func(v map[string]any) { v["work"].([]any)[1].(map[string]any)["id"] = float64(0) },
		"promotion from nowhere": func(v map[string]any) { v["work"].([]any)[3].(map[string]any)["promotionFrom"] = float64(99) },
		"no responsibilities":    func(v map[string]any) { v["work"].([]any)[0].(map[string]any)["responsibilities"] = []any{} },
		"unknown key":            func(v map[string]any) { v["work"].([]any)[0].(map[string]any)["x"] = 1 },
		"http degree link":       func(v map[string]any) { v["education"].([]any)[0].(map[string]any)["degreeLink"] = "http://x.test" },
		"blank skill":            func(v map[string]any) { v["skills"].([]any)[0].(map[string]any)["items"] = "  " },
	}
	for name, mutate := range cases {
		v := content.Object("experience")
		mutate(v)
		if !refusesExperience(v) {
			t.Errorf("%s was accepted", name)
		}
	}
}
