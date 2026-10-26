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

func TestEmbeddedOutfitsMatchSite(t *testing.T) {
	want, err := os.ReadFile("../../../site/public/art/outfits/index.json")
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(Read("outfits"), want) {
		t.Error("embedded outfits.json differs from site/public/art/outfits/index.json")
	}
	ids, def := Outfits()
	found := false
	for _, id := range ids {
		found = found || id == def
	}
	if !found {
		t.Errorf("default outfit %q is not in the index", def)
	}
}
