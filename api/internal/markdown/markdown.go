// Package markdown renders untrusted article Markdown without allowing raw HTML or unsafe URLs.
package markdown

import (
	"bytes"
	"fmt"
	"html"
	"regexp"
	"sort"
	"strings"

	"github.com/alecthomas/chroma/v2"
	"github.com/alecthomas/chroma/v2/lexers"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/extension"
	extast "github.com/yuin/goldmark/extension/ast"
	"github.com/yuin/goldmark/renderer"
	gmtext "github.com/yuin/goldmark/text"
	"github.com/yuin/goldmark/util"
)

type TocEntry struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Depth int    `json:"depth"`
}
type Result struct {
	HTML string     `json:"html"`
	Toc  []TocEntry `json:"toc"`
}
type enhance struct {
	toc  []TocEntry
	used map[string]bool
}

func escape(s string) string {
	return strings.NewReplacer("&", "&#x26;", "<", "&#x3C;", "\"", "&#x22;", "'", "&#x27;").Replace(s)
}
func escapeText(s string) string { return strings.NewReplacer("&", "&#x26;", "<", "&#x3C;").Replace(s) }

func slug(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(strings.ReplaceAll(s, "İ", "i\u0307")) {
		if r == ' ' {
			b.WriteByte('-')
		} else if slugRune(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}
func slugRune(r rune) bool {
	i := sort.Search(len(sluggerRanges), func(i int) bool { return sluggerRanges[i][1] >= r })
	return i < len(sluggerRanges) && sluggerRanges[i][0] <= r
}

func text(n ast.Node, source []byte) string {
	var b strings.Builder
	_ = ast.Walk(n, func(n ast.Node, enter bool) (ast.WalkStatus, error) {
		if !enter {
			return ast.WalkContinue, nil
		}
		switch t := n.(type) {
		case *ast.Text:
			b.Write(t.Segment.Value(source))
		case *ast.String:
			b.Write(t.Value)
		case *ast.CodeSpan:
			for c := t.FirstChild(); c != nil; c = c.NextSibling() {
				if t, ok := c.(*ast.Text); ok {
					b.Write(t.Segment.Value(source))
				}
			}
			return ast.WalkSkipChildren, nil
		}
		return ast.WalkContinue, nil
	})
	return html.UnescapeString(b.String())
}
func (e *enhance) RegisterFuncs(reg renderer.NodeRendererFuncRegisterer) {
	reg.Register(extast.KindTaskCheckBox, e.checkbox)
	reg.Register(ast.KindHeading, e.heading)
	reg.Register(ast.KindFencedCodeBlock, e.code)
	reg.Register(ast.KindHTMLBlock, e.raw)
	reg.Register(ast.KindRawHTML, e.raw)
	reg.Register(ast.KindImage, e.image)
}
func (e *enhance) checkbox(w util.BufWriter, source []byte, n ast.Node, enter bool) (ast.WalkStatus, error) {
	if enter {
		fmt.Fprint(w, `<input type="checkbox"`)
		if n.(*extast.TaskCheckBox).IsChecked {
			fmt.Fprint(w, ` checked`)
		}
		fmt.Fprint(w, ` disabled> `)
	}
	return ast.WalkSkipChildren, nil
}
func (e *enhance) raw(w util.BufWriter, source []byte, n ast.Node, enter bool) (ast.WalkStatus, error) {
	return ast.WalkSkipChildren, nil
}
func (e *enhance) heading(w util.BufWriter, source []byte, n ast.Node, enter bool) (ast.WalkStatus, error) {
	h := n.(*ast.Heading)
	if enter {
		title := text(n, source)
		base := slug(title)
		id := base
		for i := 1; e.used[id]; i++ {
			id = fmt.Sprintf("%s-%d", base, i)
		}
		e.used[id] = true
		if h.Level == 2 || h.Level == 3 {
			e.toc = append(e.toc, TocEntry{id, title, h.Level})
		}
		fmt.Fprintf(w, "<h%d id=\"%s\">", h.Level, escape(id))
	} else {
		fmt.Fprintf(w, "</h%d>\n", h.Level)
	}
	return ast.WalkContinue, nil
}
func (e *enhance) image(w util.BufWriter, source []byte, n ast.Node, enter bool) (ast.WalkStatus, error) {
	if !enter {
		return ast.WalkContinue, nil
	}
	img := n.(*ast.Image)
	dest := string(img.Destination)
	fmt.Fprint(w, "<img")
	if safeURL(dest, true) {
		fmt.Fprintf(w, " src=\"%s\"", escape(dest))
	}
	fmt.Fprintf(w, " alt=\"%s\"", escape(text(n, source)))
	if len(img.Title) > 0 {
		fmt.Fprintf(w, " title=\"%s\"", escape(string(img.Title)))
	}
	fmt.Fprint(w, " loading=\"lazy\" decoding=\"async\">")
	return ast.WalkSkipChildren, nil
}
func safeURL(s string, image bool) bool {
	colon := strings.IndexByte(s, ':')
	if colon < 0 {
		return true
	}
	slash := strings.IndexAny(s, "/?#")
	if slash >= 0 && slash < colon {
		return true
	}
	scheme := strings.ToLower(s[:colon])
	if image {
		return scheme == "http" || scheme == "https"
	}
	return scheme == "http" || scheme == "https" || scheme == "mailto" || scheme == "irc" || scheme == "ircs" || scheme == "xmpp"
}
func (e *enhance) code(w util.BufWriter, source []byte, n ast.Node, enter bool) (ast.WalkStatus, error) {
	if !enter {
		return ast.WalkContinue, nil
	}
	f := n.(*ast.FencedCodeBlock)
	lang := string(f.Language(source))
	var b strings.Builder
	for i := 0; i < f.Lines().Len(); i++ {
		seg := f.Lines().At(i)
		b.Write(seg.Value(source))
	}
	body := b.String()
	trim := strings.TrimSpace(body)
	if lang == "flow" {
		labels := strings.Split(trim, "->")
		valid := len(labels) > 1 && len(labels) <= 10
		for _, label := range labels {
			valid = valid && len(strings.TrimSpace(label)) <= 80
		}
		if valid {
			fmt.Fprint(w, "<figure class=\"flow-diagram\" aria-label=\"Flow diagram\"><ol>")
			for _, label := range labels {
				fmt.Fprintf(w, "<li>%s</li>", escapeText(strings.TrimSpace(label)))
			}
			fmt.Fprint(w, "</ol></figure>\n")
			return ast.WalkSkipChildren, nil
		}
	}
	if lang == "mermaid" && len(trim) <= 8000 {
		fmt.Fprintf(w, "<figure class=\"mermaid-diagram\" aria-label=\"Diagram\"><pre class=\"mermaid-src\">%s</pre></figure>\n", escapeText(trim))
		return ast.WalkSkipChildren, nil
	}
	if lang == "" {
		fmt.Fprintf(w, "<pre><code>%s</code></pre>\n", escapeText(body))
		return ast.WalkSkipChildren, nil
	}
	fmt.Fprintf(w, "<figure data-rehype-pretty-code-figure=\"\"><pre tabindex=\"0\" data-language=\"%s\" data-theme=\"everforest-dark everforest-light\"><code data-language=\"%s\" data-theme=\"everforest-dark everforest-light\" style=\"display: grid;\">", escape(lang), escape(lang))
	lexer := lexers.Get(lang)
	if lexer == nil {
		lexer = lexers.Fallback
	}
	iterator, err := chroma.Coalesce(lexer).Tokenise(nil, strings.TrimSuffix(body, "\n"))
	if err != nil {
		return ast.WalkStop, err
	}
	fmt.Fprint(w, "<span data-line=\"\">")
	for tok := iterator(); tok != chroma.EOF; tok = iterator() {
		dark, light := colors(tok.Type)
		parts := strings.Split(tok.Value, "\n")
		for i, part := range parts {
			if i > 0 {
				fmt.Fprint(w, "</span>\n<span data-line=\"\">")
			}
			if part != "" {
				fmt.Fprintf(w, "<span style=\"--shiki-dark:%s;--shiki-light:%s\">%s</span>", dark, light, escapeText(part))
			}
		}
	}
	fmt.Fprint(w, "</span></code></pre></figure>\n")
	return ast.WalkSkipChildren, nil
}
func colors(t chroma.TokenType) (string, string) {
	switch {
	case t.InCategory(chroma.Keyword) || t.InCategory(chroma.Operator):
		return "#E69875", "#F57D26"
	case t.InCategory(chroma.LiteralString):
		return "#DBBC7F", "#DFA000"
	case t.InCategory(chroma.LiteralNumber):
		return "#D699B6", "#DF69BA"
	case t.InCategory(chroma.Comment):
		return "#859289", "#939F91"
	case t == chroma.NameFunction || t == chroma.NameBuiltin:
		return "#A7C080", "#8DA101"
	}
	return "#D3C6AA", "#5C6A72"
}

var tableOpen = regexp.MustCompile(`<table>`)
var href = regexp.MustCompile(` href="([^"]*)"`)

func Render(body string) (Result, error) {
	e := &enhance{toc: []TocEntry{}, used: map[string]bool{}}
	md := goldmark.New(goldmark.WithExtensions(extension.NewTable(extension.WithTableCellAlignMethod(extension.TableCellAlignAttribute)), extension.Linkify, extension.Strikethrough, extension.TaskList), goldmark.WithRendererOptions(renderer.WithNodeRenderers(util.Prioritized(e, 100))))
	var b bytes.Buffer
	source := []byte(body)
	doc := md.Parser().Parse(gmtext.NewReader(source))
	_ = ast.Walk(doc, func(n ast.Node, enter bool) (ast.WalkStatus, error) {
		if enter && n.Kind() == extast.KindTaskCheckBox {
			for p := n.Parent(); p != nil; p = p.Parent() {
				if p.Kind() == ast.KindListItem {
					p.SetAttributeString("class", []byte("task-list-item"))
				}
				if p.Kind() == ast.KindList {
					p.SetAttributeString("class", []byte("contains-task-list"))
					break
				}
			}
		}
		return ast.WalkContinue, nil
	})
	if err := md.Renderer().Render(&b, source, doc); err != nil {
		return Result{}, err
	}
	out := strings.TrimSuffix(b.String(), "\n")
	out = strings.NewReplacer("&amp;", "&#x26;", "&lt;", "&#x3C;", "&gt;", ">", "&quot;", "&#x22;").Replace(out)
	out = tableOpen.ReplaceAllString(out, `<div class="table-wrap" tabindex="0" role="region" aria-label="Table, horizontally scrollable"><table>`)
	out = strings.ReplaceAll(out, "</table>", "</table></div>")
	out = href.ReplaceAllStringFunc(out, func(attr string) string {
		m := href.FindStringSubmatch(attr)
		if !safeURL(html.UnescapeString(m[1]), false) {
			return ""
		}
		return ` href="` + escape(html.UnescapeString(m[1])) + `"`
	})
	out = strings.ReplaceAll(out, ` href=""`, "")
	return Result{out, e.toc}, nil
}
