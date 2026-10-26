package content

import (
	"embed"
	"encoding/json"
)

//go:embed data/*.json
var data embed.FS

func Read(name string) []byte {
	b, err := data.ReadFile("data/" + name + ".json")
	if err != nil {
		panic(err)
	}
	return b
}
func Object(name string) map[string]any {
	var v map[string]any
	if err := json.Unmarshal(Read(name), &v); err != nil {
		panic(err)
	}
	return v
}
func Achievements() []map[string]any {
	var v []map[string]any
	if err := json.Unmarshal(Read("achievements"), &v); err != nil {
		panic(err)
	}
	return v
}

// Outfits lists Asad's outfit ids (data/outfits.json, a copy of site/public/art/outfits/index.json
// written by art/scripts/outfits.py) and the default one.
func Outfits() (ids []string, def string) {
	var v struct {
		Default string `json:"default"`
		Outfits []struct {
			ID string `json:"id"`
		} `json:"outfits"`
	}
	if err := json.Unmarshal(Read("outfits"), &v); err != nil {
		panic(err)
	}
	for _, o := range v.Outfits {
		ids = append(ids, o.ID)
	}
	return ids, v.Default
}
