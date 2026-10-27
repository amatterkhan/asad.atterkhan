package server

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"net/http"
	"regexp"
	"strings"

	"cloud.google.com/go/storage"
	"github.com/amatterkhan/asad.atterkhan/api/internal/content"
)

// labIcons matches SECTION_ICONS in site/src/lib/icons.ts.
var labIcons = map[string]bool{"flag": true, "terminal": true, "tools": true, "book": true, "bulb": true, "shield": true, "bug": true, "cpu": true, "server": true, "lock": true, "globe": true, "notebook": true, "code": true, "note": true, "article": true}

// A thumbnail is named by its SHA-256, so the same file always has the same name.
var thumbnailPattern = regexp.MustCompile(`^[a-f0-9]{64}\.(webp|png|jpg)$`)

const maxThumbnail = 512 * 1024

func labID(v any) string {
	s, ok := v.(string)
	if !ok || len(s) > 40 || !slugPattern.MatchString(s) {
		fail(400, "Invalid input")
	}
	return s
}

// validateLab checks the Lab map (siteSettings/lab) against the site's LabSchema and returns it
// normalised: trimmed names, no unknown keys, unique ids.
func validateLab(v map[string]any) []any {
	sections, ok := v["sections"].([]any)
	if !ok || len(sections) < 1 || len(sections) > 12 {
		fail(400, "Invalid input")
	}
	out := []any{}
	seen := map[string]bool{}
	for _, x := range sections {
		section, ok := x.(map[string]any)
		if !ok {
			fail(400, "Invalid input")
		}
		keys(section, "id", "name", "blurb", "icon", "categories")
		id := labID(section["id"])
		if seen[id] {
			fail(400, "Section ids must be unique")
		}
		seen[id] = true
		stringField(section, "name", 1, 40, true)
		if _, ok := section["blurb"]; !ok {
			section["blurb"] = ""
		}
		stringField(section, "blurb", 0, 200, true)
		if !labIcons[str(section["icon"])] {
			fail(400, "Invalid input")
		}
		if _, ok := section["categories"]; !ok {
			section["categories"] = []any{}
		}
		categories, ok := section["categories"].([]any)
		if !ok || len(categories) > 24 {
			fail(400, "Invalid input")
		}
		cats := []any{}
		seenCat := map[string]bool{}
		for _, y := range categories {
			c, ok := y.(map[string]any)
			if !ok {
				fail(400, "Invalid input")
			}
			keys(c, "id", "name")
			cid := labID(c["id"])
			if seenCat[cid] {
				fail(400, "Category ids must be unique within a section")
			}
			seenCat[cid] = true
			cats = append(cats, map[string]any{"id": cid, "name": stringField(c, "name", 1, 40, true)})
		}
		for _, k := range []string{"name", "blurb"} {
			if controlPattern.MatchString(str(section[k])) {
				fail(400, "Invalid input")
			}
		}
		out = append(out, map[string]any{"id": id, "name": section["name"], "blurb": section["blurb"], "icon": section["icon"], "categories": cats})
	}
	return out
}

// lab reads and replaces the Lab map: the sections and categories articles are filed under.
func (s *Server) lab(w http.ResponseWriter, r *http.Request) {
	uid := s.owner(r, "content", false)
	ctx := r.Context()
	if r.Method == "GET" {
		s.quota(ctx, uid+":content-read", 1000, 1)
		out := content.Object("lab")
		if stored := s.get(ctx, "siteSettings", "lab"); stored != nil {
			out = map[string]any{"sections": stored["sections"], "updatedAt": stored["updatedAt"]}
		}
		jsonResponse(w, 200, out)
		return
	}
	v := input(w, r, 64*1024, "sections", "updatedAt")
	sections := validateLab(v)
	s.quota(ctx, uid+":content-write", 500, 1)
	stored := map[string]any{"sections": sections, "ownerUid": uid, "updatedAt": stamp()}
	_, err := s.services.DB.Collection("siteSettings").Doc("lab").Set(ctx, stored)
	must(err)
	audit("lab_map_updated", "lab")
	s.rebuild(ctx, "lab")
	jsonResponse(w, 200, map[string]any{"sections": sections, "updatedAt": stored["updatedAt"]})
}

// thumbnails stores an article thumbnail (already cropped and compressed in the browser) and
// returns its name; saving the article with that name attaches it.
func (s *Server) thumbnails(w http.ResponseWriter, r *http.Request) {
	uid := s.owner(r, "content", false)
	ctx := r.Context()
	if !strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data;") {
		fail(415, "Use a file upload")
	}
	raw := readBody(w, r, maxThumbnail+65536)
	r.Body = io.NopCloser(bytes.NewReader(raw))
	if r.ParseMultipartForm(maxThumbnail+65536) != nil {
		fail(400, "Invalid input")
	}
	defer r.MultipartForm.RemoveAll()
	f, _, err := r.FormFile("file")
	if err != nil {
		fail(400, "Choose an image up to 512 KiB")
	}
	defer f.Close()
	b, err := io.ReadAll(io.LimitReader(f, maxThumbnail+1))
	must(err)
	if len(b) == 0 || len(b) > maxThumbnail {
		fail(400, "Choose an image up to 512 KiB")
	}
	mime, ext := detect(b)
	if !strings.HasPrefix(mime, "image/") {
		fail(415, "Only PNG, JPEG, and WebP images are supported")
	}
	s.quota(ctx, uid+":thumbnail-upload", 50, 1)
	hash := sha256.Sum256(b)
	name := hex.EncodeToString(hash[:]) + "." + ext
	// The same image uploaded twice is already stored under its name: nothing to write.
	obj := s.services.Bucket.Object("thumbnails/" + name)
	if _, err = obj.Attrs(ctx); errors.Is(err, storage.ErrObjectNotExist) {
		writer := obj.NewWriter(ctx)
		writer.ContentType = mime
		writer.CacheControl = "private,no-store"
		if _, err = writer.Write(b); err != nil {
			_ = writer.Close()
			must(err)
		}
		must(writer.Close())
	} else {
		must(err)
	}
	audit("thumbnail_uploaded", name)
	jsonResponse(w, 201, map[string]any{"thumbnail": name, "size": len(b)})
}

// thumbnail streams a stored thumbnail to the owner (the admin shows drafts' thumbnails with it).
func (s *Server) thumbnail(w http.ResponseWriter, r *http.Request) {
	uid := s.owner(r, "content", false)
	name := r.PathValue("name")
	if !thumbnailPattern.MatchString(name) {
		fail(400, "Invalid input")
	}
	s.quota(r.Context(), uid+":content-read", 1000, 1)
	reader, err := s.services.Bucket.Object("thumbnails/" + name).NewReader(r.Context())
	if errors.Is(err, storage.ErrObjectNotExist) {
		fail(404, "Thumbnail not found")
	}
	must(err)
	defer reader.Close()
	b, err := io.ReadAll(io.LimitReader(reader, maxThumbnail+1))
	must(err)
	mime, _ := detect(b)
	w.Header().Set("Content-Type", mime)
	w.Header().Set("Cache-Control", "private,no-store")
	w.WriteHeader(200)
	_, _ = w.Write(b)
}

// requireThumbnail fails unless an uploaded thumbnail with this name exists.
func (s *Server) requireThumbnail(r *http.Request, name string) {
	_, err := s.services.Bucket.Object("thumbnails/" + name).Attrs(r.Context())
	if errors.Is(err, storage.ErrObjectNotExist) {
		fail(400, "Upload the thumbnail again")
	}
	must(err)
}
