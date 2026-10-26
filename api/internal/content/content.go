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
