package server

import (
	"context"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"unicode/utf16"

	"cloud.google.com/go/firestore"
	"github.com/amatterkhan/asad.atterkhan/api/internal/content"
	"github.com/amatterkhan/asad.atterkhan/api/internal/markdown"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
var controlPattern = regexp.MustCompile(`[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]`)

func length(s string) int { return len(utf16.Encode([]rune(s))) }
func stringField(v map[string]any, key string, min, max int, trim bool) string {
	s, ok := v[key].(string)
	if !ok {
		fail(400, "Invalid input")
	}
	if trim {
		s = strings.TrimSpace(s)
	}
	if length(s) < min || length(s) > max {
		fail(400, "Invalid input")
	}
	v[key] = s
	return s
}
func tags(v map[string]any, key string, unique bool, max int) []string {
	a, ok := v[key].([]any)
	if !ok {
		fail(400, "Invalid input")
	}
	out := []string{}
	seen := map[string]bool{}
	if len(a) > max {
		fail(400, "Invalid input")
	}
	for _, x := range a {
		s, ok := x.(string)
		s = strings.TrimSpace(s)
		if !ok || length(s) < 1 || length(s) > 40 || (unique && seen[s]) {
			fail(400, "Invalid input")
		}
		seen[s] = true
		out = append(out, s)
	}
	v[key] = out
	return out
}
func validSlug(s string) {
	if len(s) > 100 || !slugPattern.MatchString(s) {
		fail(400, "Invalid input")
	}
}
func (s *Server) get(ctx context.Context, collection, id string) map[string]any {
	d, err := s.services.DB.Collection(collection).Doc(id).Get(ctx)
	if status.Code(err) == codes.NotFound {
		return nil
	}
	must(err)
	return d.Data()
}
func (s *Server) site(w http.ResponseWriter, r *http.Request) {
	uid := s.owner(r, "content", false)
	ctx := r.Context()
	fallback := content.Object("site")
	if r.Method == "GET" {
		s.quota(ctx, uid+":content-read", 1000, 1)
		stored := s.get(ctx, "siteSettings", "public")
		for k := range fallback {
			if v, ok := stored[k]; ok {
				fallback[k] = v
			}
		}
		for k := range content.Object("site") {
			max := 600
			if k == "aboutBody" {
				max = 8000
			}
			stringField(fallback, k, 0, max, false)
		}
		if v, ok := stored["updatedAt"].(string); ok {
			fallback["updatedAt"] = v
		}
		jsonResponse(w, 200, fallback)
		return
	}
	allowed := []string{"updatedAt"}
	for k := range fallback {
		allowed = append(allowed, k)
	}
	v := input(w, r, 64*1024, allowed...)
	for k := range fallback {
		max := 600
		if k == "aboutBody" {
			max = 8000
		}
		if controlPattern.MatchString(stringField(v, k, 0, max, false)) {
			fail(400, "Invalid input")
		}
	}
	if x, ok := v["updatedAt"]; ok {
		if _, ok := x.(string); !ok {
			fail(400, "Invalid input")
		}
	}
	s.quota(ctx, uid+":content-write", 500, 1)
	v["updatedAt"] = stamp()
	stored := clone(v)
	stored["ownerUid"] = uid
	_, err := s.services.DB.Collection("siteSettings").Doc("public").Set(ctx, stored)
	must(err)
	audit("site_copy_updated", "public")
	s.rebuild(ctx, "site")
	jsonResponse(w, 200, v)
}
func (s *Server) achievements(w http.ResponseWriter, r *http.Request) {
	uid := s.owner(r, "achievements", false)
	ctx := r.Context()
	var v map[string]any
	if r.Method == "GET" {
		s.quota(ctx, uid+":achievements-read", 500, 1)
		v = s.get(ctx, "siteSettings", "achievements")
		if v == nil {
			v = content.Object("achievement-settings")
		}
		if ids, ok := v["featuredIds"].([]string); ok {
			a := make([]any, len(ids))
			for i, id := range ids {
				a[i] = id
			}
			v["featuredIds"] = a
		}
		validateFeatured(v)
		jsonResponse(w, 200, map[string]any{"achievements": content.Achievements(), "featuredIds": v["featuredIds"]})
		return
	}
	v = input(w, r, 4096, "featuredIds")
	validateFeatured(v)
	s.quota(ctx, uid+":achievements-write", 100, 1)
	stored := clone(v)
	stored["ownerUid"] = uid
	stored["updatedAt"] = stamp()
	_, err := s.services.DB.Collection("siteSettings").Doc("achievements").Set(ctx, stored)
	must(err)
	audit("experience_achievements_selected", "achievements")
	s.rebuild(ctx, "achievements")
	jsonResponse(w, 200, v)
}

// wardrobe picks Asad's outfit (siteSettings/wardrobe). Outfits are files in the site; an id that
// is missing or no longer in the index reads as the default.
func (s *Server) wardrobe(w http.ResponseWriter, r *http.Request) {
	uid := s.owner(r, "content", false)
	ctx := r.Context()
	ids, def := content.Outfits()
	known := func(id any) bool {
		for _, o := range ids {
			if id == o {
				return true
			}
		}
		return false
	}
	if r.Method == "GET" {
		s.quota(ctx, uid+":content-read", 1000, 1)
		stored := s.get(ctx, "siteSettings", "wardrobe")
		out := map[string]any{"outfits": content.Object("outfits")["outfits"], "defaultOutfit": def, "activeOutfit": def}
		if known(stored["activeOutfit"]) {
			out["activeOutfit"] = stored["activeOutfit"]
		}
		if v, ok := stored["updatedAt"].(string); ok {
			out["updatedAt"] = v
		}
		jsonResponse(w, 200, out)
		return
	}
	v := input(w, r, 4096, "activeOutfit", "updatedAt")
	if !known(v["activeOutfit"]) {
		fail(400, "Invalid input")
	}
	s.quota(ctx, uid+":content-write", 500, 1)
	stored := map[string]any{"activeOutfit": v["activeOutfit"], "ownerUid": uid, "updatedAt": stamp()}
	_, err := s.services.DB.Collection("siteSettings").Doc("wardrobe").Set(ctx, stored)
	must(err)
	audit("wardrobe_outfit_selected", v["activeOutfit"].(string))
	s.rebuild(ctx, "wardrobe")
	jsonResponse(w, 200, map[string]any{"activeOutfit": stored["activeOutfit"], "updatedAt": stored["updatedAt"]})
}
func validateFeatured(v map[string]any) {
	ids := tags(v, "featuredIds", true, 6)
	known := map[string]bool{}
	for _, a := range content.Achievements() {
		known[str(a["id"])] = true
	}
	for _, id := range ids {
		if !known[id] {
			fail(400, "Invalid input")
		}
	}
}

func draft(v map[string]any) map[string]any {
	n := map[string]any{}
	for _, k := range []string{"slug", "title", "description", "body", "tags", "category", "featured", "status", "publishedAt", "updatedAt", "version", "modifiedAt", "publishedVersion"} {
		if x, ok := v[k]; ok && x != nil {
			n[k] = x
		}
	}
	if n["body"] == nil {
		n["body"] = ""
	}
	if n["tags"] == nil {
		n["tags"] = []any{}
	}
	n["featured"] = n["featured"] == true
	if n["status"] != "published" {
		n["status"] = "draft"
	}
	return n
}

func owned(tx *firestore.Transaction, ref *firestore.DocumentRef, uid string) (map[string]any, error) {
	d, err := tx.Get(ref)
	if status.Code(err) == codes.NotFound {
		return nil, &HTTPError{404, "Article not found"}
	}
	if err != nil {
		return nil, err
	}
	v := d.Data()
	if v["ownerUid"] != uid {
		return nil, &HTTPError{404, "Article not found"}
	}
	n := draft(v)
	n["ownerUid"] = uid
	return n, nil
}
func (s *Server) articles(w http.ResponseWriter, r *http.Request) {
	uid := s.owner(r, "content", false)
	ctx := r.Context()
	if r.Method == "GET" {
		s.quota(ctx, uid+":content-read", 1000, 1)
		docs, err := s.services.DB.Collection("articles").Where("ownerUid", "==", uid).Documents(ctx).GetAll()
		must(err)
		out := []map[string]any{}
		for _, doc := range docs {
			v := draft(doc.Data())
			delete(v, "body")
			out = append(out, v)
		}
		sort.Slice(out, func(i, j int) bool { return str(out[i]["modifiedAt"]) > str(out[j]["modifiedAt"]) })
		jsonResponse(w, 200, map[string]any{"articles": out})
		return
	}
	v := input(w, r, 4096, "slug", "title", "description")
	slug := stringField(v, "slug", 1, 100, false)
	validSlug(slug)
	stringField(v, "title", 1, 160, true)
	stringField(v, "description", 1, 300, true)
	s.quota(ctx, uid+":content-write", 500, 1)
	v["body"] = ""
	v["tags"] = []string{}
	v["featured"] = false
	v["status"] = "draft"
	v["version"] = int64(1)
	v["modifiedAt"] = stamp()
	v["ownerUid"] = uid
	ref := s.services.DB.Collection("articles").Doc(slug)
	must(s.services.DB.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		for _, ref := range []*firestore.DocumentRef{ref, s.services.DB.Collection("publicArticles").Doc(slug)} {
			_, err := tx.Get(ref)
			if err == nil {
				return &HTTPError{409, "An article with this slug already exists"}
			}
			if status.Code(err) != codes.NotFound {
				return err
			}
		}
		return tx.Create(ref, v)
	}))
	audit("article_created", slug)
	jsonResponse(w, 201, draft(v))
}
func validateArticle(v map[string]any) {
	validSlug(stringField(v, "slug", 1, 100, false))
	stringField(v, "title", 1, 160, true)
	stringField(v, "description", 1, 300, true)
	stringField(v, "body", 0, 200000, false)
	tags(v, "tags", true, 12)
	if _, ok := v["featured"].(bool); !ok {
		fail(400, "Invalid input")
	}
	n, ok := v["version"].(float64)
	if !ok || n < 1 || n != float64(int64(n)) {
		fail(400, "Invalid input")
	}
	if _, ok := v["category"]; ok {
		stringField(v, "category", 0, 50, true)
	}
	if st, ok := v["status"]; ok && st != "draft" && st != "published" {
		fail(400, "Invalid input")
	}
	for _, k := range []string{"publishedAt", "updatedAt", "modifiedAt"} {
		if _, ok := v[k]; ok {
			stringField(v, k, 0, 1000000, false)
		}
	}
	if x, ok := v["publishedVersion"]; ok {
		if _, ok := x.(float64); !ok {
			fail(400, "Invalid input")
		}
	}
}
func (s *Server) article(w http.ResponseWriter, r *http.Request) {
	action := ""
	if strings.HasSuffix(r.URL.Path, "/publish") {
		action = "publish"
	}
	if strings.HasSuffix(r.URL.Path, "/unpublish") {
		action = "unpublish"
	}
	uid := s.owner(r, "content", r.Method == "DELETE" || action != "")
	ctx := r.Context()
	slug := r.PathValue("slug")
	validSlug(slug)
	op, limit := "content-read", int64(1000)
	if r.Method == "PUT" {
		op, limit = "content-write", 500
	}
	if action != "" {
		op, limit = "content-publish", 50
	}
	if r.Method == "DELETE" {
		op, limit = "content-delete", 50
	}
	var v map[string]any
	if r.Method == "PUT" {
		v = input(w, r, 200000*4+8192, "slug", "title", "description", "body", "tags", "category", "featured", "version", "status", "publishedAt", "updatedAt", "modifiedAt", "publishedVersion")
		validateArticle(v)
		if v["slug"] != slug {
			fail(400, "The slug cannot be changed")
		}
	}
	s.quota(ctx, uid+":"+op, limit, 1)
	ref := s.services.DB.Collection("articles").Doc(slug)
	public := s.services.DB.Collection("publicArticles").Doc(slug)
	var result map[string]any
	must(s.services.DB.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		current, err := owned(tx, ref, uid)
		if err != nil {
			return err
		}
		result = current
		if r.Method == "GET" {
			return nil
		}
		if r.Method == "DELETE" {
			pub, err := tx.Get(public)
			if err != nil && status.Code(err) != codes.NotFound {
				return err
			}
			if current["status"] == "published" || pub != nil && pub.Exists() {
				return &HTTPError{409, "Unpublish this article before deleting it"}
			}
			return tx.Delete(ref)
		}
		if r.Method == "PUT" {
			if number(current["version"]) != number(v["version"]) {
				return &HTTPError{409, "This article changed since you opened it. Reload to get the latest version."}
			}
			for _, key := range []string{"title", "description", "body", "tags", "featured"} {
				current[key] = v[key]
			}
			delete(current, "category")
			if str(v["category"]) != "" {
				current["category"] = v["category"]
			}
		}
		if action == "publish" {
			if err := validatePublicSnapshot(current); err != nil {
				return err
			}
			if strings.TrimSpace(str(current["body"])) == "" {
				return &HTTPError{400, "Write the article before publishing it"}
			}
			date := today()
			first := str(current["publishedAt"])
			if first == "" {
				first = date
			}
			if !validDate(first) || first > date {
				return &HTTPError{400, "Invalid input"}
			}
			if str(current["publishedAt"]) != "" && date > first {
				current["updatedAt"] = date
			}
			if updated := str(current["updatedAt"]); updated != "" && (!validDate(updated) || updated < first) {
				return &HTTPError{400, "Invalid input"}
			}
			current["publishedAt"] = first
			current["status"] = "published"
			current["publishedVersion"] = number(current["version"]) + 1
			pub := draft(current)
			delete(pub, "version")
			delete(pub, "modifiedAt")
			delete(pub, "publishedVersion")
			if err := tx.Set(public, pub); err != nil {
				return err
			}
		}
		if action == "unpublish" {
			pub, err := tx.Get(public)
			if err != nil && status.Code(err) != codes.NotFound {
				return err
			}
			if current["status"] != "published" && (pub == nil || !pub.Exists()) {
				return &HTTPError{409, "This article is not published"}
			}
			current["status"] = "draft"
			delete(current, "publishedVersion")
			if err := tx.Delete(public); err != nil {
				return err
			}
		}
		current["version"] = number(current["version"]) + 1
		current["modifiedAt"] = stamp()
		return tx.Set(ref, current)
	}))
	if r.Method == "DELETE" {
		audit("article_deleted", slug)
		jsonResponse(w, 200, map[string]any{"ok": true})
		return
	}
	if r.Method == "PUT" {
		audit("article_saved", slug)
	}
	if action != "" {
		event := "article_published"
		if action == "unpublish" {
			event = "article_unpublished"
		}
		audit(event, slug)
		s.rebuild(ctx, "article:"+slug)
	}
	jsonResponse(w, 200, draft(result))
}
func validatePublicSnapshot(v map[string]any) (err error) {
	defer func() {
		if p := recover(); p != nil {
			if e, ok := p.(*HTTPError); ok {
				err = e
			} else {
				panic(p)
			}
		}
	}()
	validSlug(stringField(v, "slug", 1, 100, false))
	stringField(v, "title", 1, 160, false)
	stringField(v, "description", 1, 300, false)
	if _, ok := v["body"].(string); !ok {
		fail(400, "Invalid input")
	}
	tags(v, "tags", false, 12)
	if _, ok := v["featured"].(bool); !ok {
		fail(400, "Invalid input")
	}
	if _, ok := v["category"]; ok {
		stringField(v, "category", 0, 50, false)
	}
	return nil
}

func (s *Server) preview(w http.ResponseWriter, r *http.Request) {
	uid := s.owner(r, "content", false)
	v := input(w, r, 200000*4+1024, "body")
	body := stringField(v, "body", 0, 200000, false)
	s.quota(r.Context(), uid+":content-preview", 3000, 1)
	out, err := markdown.Render(body)
	must(err)
	jsonResponse(w, 200, out)
}
