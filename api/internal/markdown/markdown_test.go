package markdown

import (
	"encoding/json"
	"html"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

var codeBlock = regexp.MustCompile(`(?s)<figure data-rehype-pretty-code-figure="">.*?</figure>`)
var tag = regexp.MustCompile(`<[^>]*>`)

func comparable(s string) string {
	return codeBlock.ReplaceAllStringFunc(s, func(s string) string { return "CODE[" + html.UnescapeString(tag.ReplaceAllString(s, "")) + "]" })
}
func TestGolden(t *testing.T) {
	files, err := filepath.Glob("../../../site/tests/fixtures/markdown/*.md")
	if err != nil || len(files) == 0 {
		t.Fatal("missing golden fixtures")
	}
	for _, f := range files {
		t.Run(filepath.Base(f), func(t *testing.T) {
			source, err := os.ReadFile(f)
			if err != nil {
				t.Fatal(err)
			}
			want, err := os.ReadFile(strings.TrimSuffix(f, ".md") + ".html")
			if err != nil {
				t.Fatal(err)
			}
			got, err := Render(string(source))
			if err != nil {
				t.Fatal(err)
			}
			if comparable(got.HTML) != comparable(string(want)) {
				t.Errorf("HTML differs\nGOT:\n%s\nWANT:\n%s", got.HTML, want)
			}
			b, err := os.ReadFile(strings.TrimSuffix(f, ".md") + ".toc.json")
			if err != nil {
				t.Fatal(err)
			}
			var toc []TocEntry
			if err = json.Unmarshal(b, &toc); err != nil {
				t.Fatal(err)
			}
			a, _ := json.Marshal(toc)
			b, _ = json.Marshal(got.Toc)
			if string(a) != string(b) {
				t.Errorf("TOC: got %s want %s", b, a)
			}
		})
	}
}
func TestUnsafeMarkup(t *testing.T) {
	for _, body := range []string{`<script>alert(1)</script>`, `[click](javascript:alert%281%29)`, `![image](data:text/html,test)`, `![image](javascript:alert%281%29)`, `<img src=x onerror=alert(1)>`} {
		r, err := Render(body)
		if err != nil {
			t.Fatal(err)
		}
		if strings.Contains(r.HTML, "<script") || strings.Contains(r.HTML, "javascript:") || strings.Contains(r.HTML, "data:text") || strings.Contains(r.HTML, "onerror=") {
			t.Fatalf("unsafe output: %s", r.HTML)
		}
	}
}
