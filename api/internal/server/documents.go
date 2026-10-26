package server

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strings"

	"cloud.google.com/go/firestore"
	"cloud.google.com/go/storage"
	"github.com/google/uuid"
	"golang.org/x/text/unicode/norm"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const maxFile = 8 * 1024 * 1024

var idPattern = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)
var filenamePattern = regexp.MustCompile(`[^a-zA-Z0-9._-]`)
var allowedTypes = map[string]bool{"application/pdf": true, "image/png": true, "image/jpeg": true, "image/webp": true}

func validateID(id string) {
	if !idPattern.MatchString(id) {
		fail(400, "Invalid input")
	}
}
func safeName(name string) string {
	name = filenamePattern.ReplaceAllString(norm.NFKC.String(name), "-")
	if len(name) > 120 {
		name = name[:120]
	}
	if name == "" {
		name = "document"
	}
	return name
}
func detect(b []byte) (string, string) {
	if len(b) >= 5 && bytes.Equal(b[:5], []byte("%PDF-")) {
		return "application/pdf", "pdf"
	}
	if len(b) >= 8 && bytes.Equal(b[:8], []byte{137, 80, 78, 71, 13, 10, 26, 10}) {
		return "image/png", "png"
	}
	if len(b) >= 3 && bytes.Equal(b[:3], []byte{255, 216, 255}) {
		return "image/jpeg", "jpg"
	}
	if len(b) >= 12 && string(b[:4]) == "RIFF" && string(b[8:12]) == "WEBP" {
		return "image/webp", "webp"
	}
	return "", ""
}
func metadata(v map[string]any) {
	stringField(v, "title", 1, 160, true)
	if _, ok := v["tags"]; !ok {
		v["tags"] = []any{}
	}
	tags(v, "tags", false, 12)
}
func (s *Server) documents(w http.ResponseWriter, r *http.Request) {
	uid := s.owner(r, "documents", false)
	ctx := r.Context()
	if r.Method == "GET" {
		s.quota(ctx, uid+":list", 500, 1)
		docs, err := s.services.DB.Collection("documents").Where("ownerUid", "==", uid).Documents(ctx).GetAll()
		must(err)
		out := []map[string]any{}
		for _, d := range docs {
			out = append(out, d.Data())
		}
		sort.Slice(out, func(i, j int) bool { return str(out[i]["createdAt"]) > str(out[j]["createdAt"]) })
		if len(out) > 100 {
			out = out[:100]
		}

		jsonResponse(w, 200, out)
		return
	}
	s.quota(ctx, uid+":upload", 25, 1)
	if !strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data;") {
		fail(415, "Use a file upload")
	}
	raw := readBody(w, r, maxFile+65536)
	r.Body = io.NopCloser(bytes.NewReader(raw))
	if r.ParseMultipartForm(maxFile+65536) != nil {
		fail(400, "Invalid input")
	}
	defer r.MultipartForm.RemoveAll()
	f, h, err := r.FormFile("file")
	if err != nil {
		fail(400, "Choose a non-empty file up to 8 MiB")
	}
	defer f.Close()
	b, err := io.ReadAll(io.LimitReader(f, maxFile+1))
	must(err)
	if len(b) == 0 || len(b) > maxFile {
		fail(400, "Choose a non-empty file up to 8 MiB")
	}
	var tagValues []any
	tagsJSON := r.FormValue("tags")
	if tagsJSON == "" {
		tagsJSON = "[]"
	}
	if json.Unmarshal([]byte(tagsJSON), &tagValues) != nil || tagValues == nil {
		fail(400, "Invalid input")
	}
	v := map[string]any{"title": r.FormValue("title"), "tags": tagValues}
	metadata(v)
	mime, ext := detect(b)
	if mime == "" {
		fail(415, "Only PDF, PNG, JPEG, and WebP files are supported")
	}
	id := uuid.NewString()
	hash := sha256.Sum256(b)
	digest := hex.EncodeToString(hash[:])
	path := "private/" + uid + "/" + id + "/" + digest + "." + ext
	now := stamp()
	v["id"] = id
	v["ownerUid"] = uid
	v["filename"] = safeName(h.Filename)
	v["mime"] = mime
	v["size"] = int64(len(b))
	v["sha256"] = digest
	v["privatePath"] = path
	v["published"] = false
	v["archived"] = false
	v["createdAt"] = now
	v["updatedAt"] = now
	obj := s.services.Bucket.Object(path)
	writer := obj.If(storage.Conditions{DoesNotExist: true}).NewWriter(ctx)
	writer.ContentType = mime
	writer.CacheControl = "private,no-store"
	writer.ContentDisposition = "attachment; filename=\"" + str(v["filename"]) + "\""
	_, err = writer.Write(b)
	if err != nil {
		_ = writer.Close()
		must(err)
	}
	must(writer.Close())
	_, err = s.services.DB.Collection("documents").Doc(id).Create(ctx, v)
	if err != nil {
		_ = obj.Delete(ctx)
		must(err)
	}
	audit("document_uploaded_private", id)
	jsonResponse(w, 201, v)
}
func ownedDocument(tx *firestore.Transaction, ref *firestore.DocumentRef, uid string) (*firestore.DocumentSnapshot, error) {
	d, err := tx.Get(ref)
	if status.Code(err) == codes.NotFound {
		return nil, &HTTPError{404, "Document not found"}
	}
	if err != nil {
		return nil, err
	}
	if d.Data()["ownerUid"] != uid {
		return nil, &HTTPError{404, "Document not found"}
	}
	return d, nil
}
func canPublish(v map[string]any, uid, id string) bool {
	return v["ownerUid"] == uid && v["archived"] == false && v["published"] == false && strings.HasPrefix(str(v["privatePath"]), "private/"+uid+"/"+id+"/") && allowedTypes[str(v["mime"])] && number(v["size"]) > 0 && number(v["size"]) <= maxFile
}
func (s *Server) deleteObject(ctx context.Context, path string) {
	if path == "" {
		return
	}
	err := s.services.Bucket.Object(path).Delete(ctx)
	if err != nil && !errors.Is(err, storage.ErrObjectNotExist) {
		must(err)
	}
}
func (s *Server) document(w http.ResponseWriter, r *http.Request) {
	publication := strings.HasSuffix(r.URL.Path, "/publish")
	download := strings.HasSuffix(r.URL.Path, "/download")
	uid := s.owner(r, "documents", publication || r.Method == "DELETE")
	ctx := r.Context()
	id := r.PathValue("id")
	validateID(id)
	ref := s.services.DB.Collection("documents").Doc(id)
	if download {
		v := s.get(ctx, "documents", id)
		if v == nil || v["ownerUid"] != uid {
			fail(404, "Document not found")
		}
		if !strings.HasPrefix(str(v["privatePath"]), "private/"+uid+"/"+id+"/") {
			fail(403, "Invalid document path")
		}
		s.sendFile(w, r, v, str(v["privatePath"]), false)
		return
	}
	op, limit := "edit", int64(100)
	if r.Method == "DELETE" {
		op, limit = "archive", 50
	}
	if publication {
		op, limit = "publish", 50
	}
	s.quota(ctx, uid+":"+op, limit, 1)
	var v map[string]any
	if r.Method == "PATCH" {
		v = input(w, r, 8192, "title", "tags")
		metadata(v)
	}
	var action string
	if publication {
		v = input(w, r, 2048, "action", "confirm")
		action = str(v["action"])
		if v["confirm"] != true || (action != "publish" && action != "unpublish") {
			fail(400, "Invalid input")
		}
	}
	if r.Method == "PATCH" || r.Method == "DELETE" || action == "unpublish" {
		var publicPath string
		must(s.services.DB.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
			d, err := ownedDocument(tx, ref, uid)
			if err != nil {
				return err
			}
			current := d.Data()
			publicPath = str(current["publicPath"])
			if r.Method == "PATCH" {
				current["title"] = v["title"]
				current["tags"] = v["tags"]
			} else {
				current["published"] = false
				if r.Method == "DELETE" {
					current["archived"] = true
				}
			}
			current["updatedAt"] = stamp()
			return tx.Set(ref, current)
		}))
		if r.Method != "PATCH" {
			s.deleteObject(ctx, publicPath)
		}
		out := map[string]any{"ok": true}
		if r.Method == "DELETE" {
			out["message"] = "Archived. Private original is retained."
		}
		event := "document_metadata_updated"
		if r.Method == "DELETE" {
			event = "document_archived_recoverable"
		} else if action == "unpublish" {
			event = "document_unpublished"
		}
		audit(event, id)
		jsonResponse(w, 200, out)
		return
	}
	snapshot, err := ref.Get(ctx)
	if status.Code(err) == codes.NotFound {
		fail(404, "Document not found")
	}
	must(err)
	current := snapshot.Data()
	if current["ownerUid"] != uid {
		fail(404, "Document not found")
	}
	if !canPublish(current, uid, id) {
		fail(409, "This document is not ready to publish")
	}
	path := "published/" + id + "/" + str(current["sha256"]) + "/" + uuid.NewString()
	dest := s.services.Bucket.Object(path)
	// Bounded copy works with both GCS and Firebase's Storage emulator. Verify the original
	// against the recorded digest before making a new publication object.
	reader, err := s.services.Bucket.Object(str(current["privatePath"])).NewReader(ctx)
	must(err)
	original, err := io.ReadAll(io.LimitReader(reader, maxFile+1))
	_ = reader.Close()
	must(err)
	digest := sha256.Sum256(original)
	if int64(len(original)) != number(current["size"]) || hex.EncodeToString(digest[:]) != str(current["sha256"]) {
		fail(409, "Document changed during publication")
	}
	writer := dest.If(storage.Conditions{DoesNotExist: true}).NewWriter(ctx)
	writer.ContentType = str(current["mime"])
	writer.CacheControl = "private,no-store"
	writer.ContentDisposition = "attachment; filename=\"" + safeName(str(current["filename"])) + "\""
	_, err = writer.Write(original)
	if err != nil {
		_ = writer.Close()
		must(err)
	}
	must(writer.Close())

	committed := false
	defer func() {
		if !committed {
			_ = dest.Delete(context.WithoutCancel(ctx))
		}
	}()
	must(s.services.DB.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		d, err := ownedDocument(tx, ref, uid)
		if err != nil {
			return err
		}
		v := d.Data()
		if !d.UpdateTime.Equal(snapshot.UpdateTime) || !canPublish(v, uid, id) || v["sha256"] != current["sha256"] {
			return &HTTPError{409, "Document changed during publication"}
		}
		v["published"] = true
		v["publicPath"] = path
		v["publishedAt"] = stamp()
		v["updatedAt"] = stamp()
		return tx.Set(ref, v)
	}))
	committed = true
	audit("document_published", id)
	jsonResponse(w, 200, map[string]any{"ok": true, "url": "/files/" + id})
}
func (s *Server) sendFile(w http.ResponseWriter, r *http.Request, v map[string]any, path string, inline bool) {
	reader, err := s.services.Bucket.Object(path).NewReader(r.Context())
	must(err)
	defer reader.Close()
	b, err := io.ReadAll(io.LimitReader(reader, maxFile+1))
	must(err)
	if len(b) > maxFile {
		fail(503, "File temporarily unavailable")
	}
	w.Header().Set("Content-Type", str(v["mime"]))
	mode := "attachment"
	if inline {
		mode = "inline"
	}
	w.Header().Set("Content-Disposition", mode+"; filename=\""+safeName(str(v["filename"]))+"\"")
	w.Header().Set("Cache-Control", "private,no-store")
	w.WriteHeader(200)
	_, _ = w.Write(b)
}
func (s *Server) publicFile(w http.ResponseWriter, r *http.Request) {
	defer func() {
		if p := recover(); p != nil {
			code, message := 503, "File temporarily unavailable"
			if e, ok := p.(*HTTPError); ok {
				if e.Status == 404 {
					code, message = 404, "Not found"
				}
				if e.Status == 429 {
					code, message = 429, "Daily download limit reached"
				}
			}
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			w.WriteHeader(code)
			_, _ = io.WriteString(w, message)
		}
	}()

	id := r.PathValue("id")
	if os.Getenv("ENABLE_PUBLIC_FILES") != "true" || !idPattern.MatchString(id) {
		fail(404, "Not found")
	}
	s.open()

	v := s.get(r.Context(), "documents", id)
	inline := strings.HasPrefix(r.URL.Path, "/media/")
	path := str(v["publicPath"])
	parts := strings.Split(path, "/")
	if v == nil || v["published"] != true || v["archived"] != false || !strings.HasPrefix(path, "published/"+id+"/"+str(v["sha256"])+"/") || len(parts) != 4 || !idPattern.MatchString(parts[3]) || !allowedTypes[str(v["mime"])] || number(v["size"]) <= 0 || number(v["size"]) > maxFile || (inline && !strings.HasPrefix(str(v["mime"]), "image/")) {
		fail(404, "Not found")
	}
	s.quota(r.Context(), "public-download-bytes", 64*1024*1024, number(v["size"]))
	s.sendFile(w, r, v, path, inline)
}
