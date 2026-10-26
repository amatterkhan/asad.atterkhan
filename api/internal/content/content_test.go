package content

import (
	"bytes"
	"os"
	"testing"
)

func TestEmbeddedSeedsMatchSite(t *testing.T) {
	for _, name := range []string{"site", "achievements", "achievement-settings"} {
		want, err := os.ReadFile("../../../site/content/" + name + ".json")
		if err != nil {
			t.Fatal(err)
		}
		if !bytes.Equal(Read(name), want) {
			t.Errorf("embedded %s differs from site seed", name)
		}
	}
}
