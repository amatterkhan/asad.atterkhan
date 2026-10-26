package server

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"firebase.google.com/go/v4/auth"
)

func TestDisabledAndDevelopment(t *testing.T) {
	for _, flag := range []string{"ENABLE_CONTENT_ADMIN", "ENABLE_DOCUMENT_ADMIN", "ENABLE_ACHIEVEMENT_ADMIN", "ENABLE_PUBLIC_FILES"} {
		t.Setenv(flag, "false")
	}
	t.Setenv("APP_ENV", "production")
	s := New()
	defer s.Close()
	h := s.Handler()
	for _, route := range protectedRoutes() {
		req := httptest.NewRequest(route.method, route.path, nil)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, req)
		if w.Code != 503 {
			t.Errorf("%s %s = %d", route.method, route.path, w.Code)
		}
		if w.Header().Get("Cache-Control") != "no-store" || w.Header().Get("X-Content-Type-Options") != "nosniff" {
			t.Fatal("missing security headers")
		}
	}
	t.Setenv("APP_ENV", "development")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/api/calendar?year=2025&month=10", nil))
	if w.Code != 200 {
		t.Fatal(w.Body.String())
	}
	var v map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &v)
	cells := v["cells"].([]any)
	if len(cells) != 35 {
		t.Fatal("bad calendar padding")
	}
	for _, query := range []string{"year=2019", "month=12", "month=1.5", "year=no"} {
		w = httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", "/api/calendar?"+query, nil))
		if w.Code != 400 {
			t.Fatal(query, w.Code)
		}
	}
	t.Setenv("K_SERVICE", "unsafe-development")
	defer func() {
		if recover() == nil {
			t.Fatal("Cloud Run must refuse development bypass")
		}
	}()
	New()
}

type route struct{ method, path string }

func protectedRoutes() []route {
	id := "12345678-1234-4234-8234-123456789012"
	return []route{{"GET", "/api/admin/site"}, {"PUT", "/api/admin/site"}, {"GET", "/api/admin/wardrobe"}, {"PUT", "/api/admin/wardrobe"}, {"GET", "/api/admin/articles"}, {"POST", "/api/admin/articles"}, {"GET", "/api/admin/articles/test"}, {"PUT", "/api/admin/articles/test"}, {"DELETE", "/api/admin/articles/test"}, {"POST", "/api/admin/articles/test/publish"}, {"POST", "/api/admin/articles/test/unpublish"}, {"POST", "/api/admin/preview"}, {"GET", "/api/admin/achievements"}, {"PATCH", "/api/admin/achievements"}, {"GET", "/api/admin/documents"}, {"POST", "/api/admin/documents"}, {"PATCH", "/api/admin/documents/" + id}, {"DELETE", "/api/admin/documents/" + id}, {"POST", "/api/admin/documents/" + id + "/publish"}, {"GET", "/api/admin/documents/" + id + "/download"}}
}
func TestShiftRotation(t *testing.T) {
	for date, want := range map[string]string{"2025-11-24": "night", "2025-11-26": "off", "2025-12-03": "night", "2025-12-05": "off", "2025-12-22": "day", "2025-11-19": "day"} {
		d, _ := time.Parse("2006-01-02", date)
		if got := shift(d); got != want {
			t.Errorf("%s got %s want %s", date, got, want)
		}
	}
}
func authREST(t *testing.T, method string, v any) map[string]any {
	t.Helper()
	b, _ := json.Marshal(v)
	res, err := http.Post("http://"+os.Getenv("FIREBASE_AUTH_EMULATOR_HOST")+"/identitytoolkit.googleapis.com/v1/accounts:"+method+"?key=demo-key", "application/json", bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var out map[string]any
	_ = json.NewDecoder(res.Body).Decode(&out)
	if res.StatusCode != 200 {
		t.Fatal(out)
	}
	return out
}
func TestEmulatorRoutes(t *testing.T) {
	if os.Getenv("FIRESTORE_EMULATOR_HOST") == "" || os.Getenv("FIREBASE_AUTH_EMULATOR_HOST") == "" || os.Getenv("FIREBASE_STORAGE_EMULATOR_HOST") == "" {
		t.Skip("requires Firebase Auth, Firestore and Storage emulators")
	}
	t.Setenv("FIREBASE_PROJECT_ID", "demo-asad-exe")
	t.Setenv("FIREBASE_STORAGE_BUCKET", "demo-asad-exe.appspot.com")
	t.Setenv("APP_ENV", "production")
	email := fmt.Sprintf("owner-%d@example.test", time.Now().UnixNano())
	password := "Test-password-23954"
	signed := authREST(t, "signUp", map[string]any{"email": email, "password": password, "returnSecureToken": true})
	uid := str(signed["localId"])
	t.Setenv("FIREBASE_OWNER_UID", uid)
	for _, flag := range []string{"ENABLE_CONTENT_ADMIN", "ENABLE_DOCUMENT_ADMIN", "ENABLE_ACHIEVEMENT_ADMIN", "ENABLE_PUBLIC_FILES"} {
		t.Setenv(flag, "true")
	}
	services, err := Open(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	defer services.DB.Close()
	ctx := context.Background()
	if err = services.Auth.SetCustomUserClaims(ctx, uid, map[string]any{"admin": true}); err != nil {
		t.Fatal(err)
	}
	owner := authREST(t, "signInWithPassword", map[string]any{"email": email, "password": password, "returnSecureToken": true})
	token := str(owner["idToken"])
	other := authREST(t, "signUp", map[string]any{"email": "other-" + email, "password": password, "returnSecureToken": true})
	var hooks atomic.Int64
	hook := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer test-secret" {
			t.Error("hook authorization missing")
		}
		hooks.Add(1)
		w.WriteHeader(204)
	}))
	defer hook.Close()
	t.Setenv("REBUILD_HOOK", hook.URL)
	t.Setenv("REBUILD_HOOK_SECRET", "test-secret")
	s := New()
	s.client = hook.Client()
	defer s.Close()
	ts := httptest.NewServer(s.Handler())
	defer ts.Close()
	call := func(method, path string, body any, token string) (int, map[string]any) {
		t.Helper()
		var reader io.Reader
		if body != nil {
			b, _ := json.Marshal(body)
			reader = bytes.NewReader(b)
		}
		req, _ := http.NewRequest(method, ts.URL+path, reader)
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		b, _ := io.ReadAll(res.Body)
		v := map[string]any{}
		_ = json.Unmarshal(b, &v)
		return res.StatusCode, v
	}
	check := func(method, path string, body any, want int) map[string]any {
		t.Helper()
		code, v := call(method, path, body, token)
		if code != want {
			t.Fatalf("%s %s got %d want %d: %v", method, path, code, want, v)
		}
		return v
	}
	for _, route := range protectedRoutes() {
		for _, a := range []struct {
			token string
			code  int
		}{{"", 401}, {"invalid", 401}, {str(other["idToken"]), 403}} {
			code, _ := call(route.method, route.path, nil, a.token)
			if code != a.code {
				t.Fatalf("%s %s auth got %d want %d", route.method, route.path, code, a.code)
			}
		}
	}
	check("GET", "/api/healthz", nil, 200)
	check("GET", "/api/calendar?year=2025&month=10", nil, 200)
	check("GET", "/api/calendar?month=12", nil, 400)
	copy := check("GET", "/api/admin/site", nil, 200)
	copy["heroTitle"] = "Emulator test"
	check("PUT", "/api/admin/site", copy, 200)
	copy["unknown"] = true
	check("PUT", "/api/admin/site", copy, 400)
	delete(copy, "unknown")
	copy["heroTitle"] = "bad\x00"
	check("PUT", "/api/admin/site", copy, 400)
	slug := fmt.Sprintf("test-%d", time.Now().UnixNano())
	path := "/api/admin/articles/" + slug
	create := map[string]any{"slug": slug, "title": "Test", "description": "Emulator only"}
	v := check("POST", "/api/admin/articles", create, 201)
	check("POST", "/api/admin/articles", create, 409)
	check("GET", path, nil, 200)
	check("GET", "/api/admin/articles", nil, 200)
	check("POST", path+"/publish", nil, 400)
	v["body"] = "## Hello\n\nA published note."
	v["tags"] = []string{"test", "test"}
	check("PUT", path, v, 400)
	v["tags"] = []string{"test"}
	v["unknown"] = true
	check("PUT", path, v, 400)
	delete(v, "unknown")
	v = check("PUT", path, v, 200)
	stale := clone(v)
	v["title"] = "Changed"
	v = check("PUT", path, v, 200)
	check("PUT", path, stale, 409)
	v = check("POST", path+"/publish", nil, 200)
	pub, err := services.DB.Collection("publicArticles").Doc(slug).Get(ctx)
	if err != nil || pub.Data()["body"] != v["body"] {
		t.Fatal("published snapshot missing", err)
	}
	check("DELETE", path, nil, 409)
	oldBody := v["body"]
	v["body"] = "Unpublished edits"
	v = check("PUT", path, v, 200)
	pub, err = services.DB.Collection("publicArticles").Doc(slug).Get(ctx)
	if err != nil || pub.Data()["body"] != oldBody {
		t.Fatal("save changed public copy")
	}
	if number(v["publishedVersion"]) >= number(v["version"]) {
		t.Fatal("published version not retained")
	}
	v = check("POST", path+"/unpublish", nil, 200)
	if _, ok := v["publishedVersion"]; ok {
		t.Fatal("unpublished version retained")
	}
	if _, err = services.DB.Collection("publicArticles").Doc(slug).Get(ctx); err == nil {
		t.Fatal("public snapshot retained")
	}
	check("POST", path+"/unpublish", nil, 409)
	check("DELETE", path, nil, 200)
	check("GET", path, nil, 404)
	check("POST", "/api/admin/preview", map[string]any{"body": "## Heading\n\n<script>unsafe</script>"}, 200)
	check("POST", "/api/admin/preview", map[string]any{"body": 3}, 400)
	check("POST", "/api/admin/preview", map[string]any{"body": "ok", "unknown": 1}, 400)
	check("POST", "/api/admin/preview", map[string]any{"body": strings.Repeat("x", 801025)}, 413)
	if got := check("GET", "/api/admin/wardrobe", nil, 200); got["activeOutfit"] != got["defaultOutfit"] {
		t.Fatalf("wardrobe before any save: %v", got)
	}
	check("PUT", "/api/admin/wardrobe", map[string]any{"activeOutfit": "../sprites"}, 400)
	check("PUT", "/api/admin/wardrobe", map[string]any{"activeOutfit": "classic", "extra": 1}, 400)
	check("PUT", "/api/admin/wardrobe", map[string]any{"activeOutfit": "classic"}, 200)
	if got := check("GET", "/api/admin/wardrobe", nil, 200); got["activeOutfit"] != "classic" {
		t.Fatalf("wardrobe after save: %v", got)
	}
	check("GET", "/api/admin/achievements", nil, 200)
	check("PATCH", "/api/admin/achievements", map[string]any{"featuredIds": []string{"unknown"}}, 400)
	check("PATCH", "/api/admin/achievements", map[string]any{"featuredIds": []string{"4", "4"}}, 400)
	check("PATCH", "/api/admin/achievements", map[string]any{"featuredIds": []string{"5"}}, 200)
	upload := func(b []byte, name string, want int) map[string]any {
		t.Helper()
		var buf bytes.Buffer
		form := multipart.NewWriter(&buf)
		part, _ := form.CreateFormFile("file", name)
		_, _ = part.Write(b)
		_ = form.WriteField("title", "Emulator image")
		_ = form.WriteField("tags", `["test"]`)
		_ = form.Close()
		req, _ := http.NewRequest("POST", ts.URL+"/api/admin/documents", &buf)
		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", form.FormDataContentType())
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		var v map[string]any
		_ = json.NewDecoder(res.Body).Decode(&v)
		if res.StatusCode != want {
			t.Fatalf("upload: %d %v", res.StatusCode, v)
		}
		return v
	}
	image, err := os.ReadFile("../../../site/public/sprites/storm-idle-still.png")
	if err != nil {
		t.Fatal(err)
	}
	upload([]byte("<script>fake</script>"), "fake.png", 415)
	record := upload(image, "storm.png", 201)
	id := str(record["id"])
	docPath := "/api/admin/documents/" + id
	check("GET", "/api/admin/documents", nil, 200)
	check("GET", "/files/"+id, nil, 404)
	check("GET", docPath+"/download", nil, 200)
	check("POST", docPath+"/publish", map[string]any{"action": "publish", "confirm": false}, 400)
	check("POST", docPath+"/publish", map[string]any{"action": "publish", "confirm": true}, 200)
	check("POST", docPath+"/publish", map[string]any{"action": "publish", "confirm": true}, 409)
	for _, prefix := range []string{"/files/", "/media/"} {
		res, err := http.Get(ts.URL + prefix + id)
		if err != nil {
			t.Fatal(err)
		}
		b, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if res.StatusCode != 200 || !bytes.Equal(b, image) || res.Header.Get("Cache-Control") != "private,no-store" {
			t.Fatal("public file mismatch")
		}
	}
	hashBytes := sha256.Sum256([]byte("public-download-bytes" + today()))
	downloadQuota := services.DB.Collection("_quotas").Doc(hex.EncodeToString(hashBytes[:]))
	_, err = downloadQuota.Set(ctx, map[string]any{"count": int64(64 * 1024 * 1024), "day": today()})
	if err != nil {
		t.Fatal(err)
	}
	check("GET", "/files/"+id, nil, 429)
	_, err = downloadQuota.Delete(ctx)
	if err != nil {
		t.Fatal(err)
	}
	check("PATCH", docPath, map[string]any{"title": "Edited", "unknown": true}, 400)
	check("PATCH", docPath, map[string]any{"title": "Edited", "tags": []string{}}, 200)
	check("POST", docPath+"/publish", map[string]any{"action": "unpublish", "confirm": true}, 200)
	check("GET", "/media/"+id, nil, 404)
	check("DELETE", docPath, nil, 200)
	check("GET", docPath+"/download", nil, 200)
	check("POST", docPath+"/publish", map[string]any{"action": "publish", "confirm": true}, 409)
	missing := "/api/admin/documents/12345678-1234-4234-8234-123456789012"
	check("PATCH", missing, map[string]any{"title": "x"}, 404)
	check("DELETE", missing, nil, 404)
	check("GET", missing+"/download", nil, 404)
	check("POST", missing+"/publish", map[string]any{"action": "publish", "confirm": true}, 404)
	check("PATCH", "/api/admin/documents/invalid", map[string]any{"title": "x"}, 400)
	check("PUT", "/api/admin/site", map[string]any{"heroTitle": strings.Repeat("x", 65537)}, 413)
	upload(bytes.Repeat([]byte("x"), maxFile+65536), "large.png", 413)
	check("POST", "/api/admin/documents", map[string]any{}, 415)
	uploadHash := sha256.Sum256([]byte(uid + ":upload" + today()))
	_, err = services.DB.Collection("_quotas").Doc(hex.EncodeToString(uploadHash[:])).Set(ctx, map[string]any{"count": int64(25), "day": today()})
	if err != nil {
		t.Fatal(err)
	}
	upload(image, "quota.png", 429)
	quotaKey := uid + ":content-read"
	hash := sha256.Sum256([]byte(quotaKey + today()))
	_, err = services.DB.Collection("_quotas").Doc(hex.EncodeToString(hash[:])).Set(ctx, map[string]any{"count": int64(999), "day": today()})
	if err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	codes := make(chan int, 10)
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			req, _ := http.NewRequest("GET", ts.URL+"/api/admin/articles", nil)
			req.Header.Set("Authorization", "Bearer "+token)
			res, err := http.DefaultClient.Do(req)
			if err != nil {
				codes <- 0
				return
			}
			res.Body.Close()
			codes <- res.StatusCode
		}()
	}
	wg.Wait()
	close(codes)
	allowed, limited := 0, 0
	for code := range codes {
		if code == 200 {
			allowed++
		} else if code == 429 {
			limited++
		} else {
			t.Errorf("unexpected quota response %d", code)
		}
	}
	if allowed != 1 || limited != 9 {
		t.Fatalf("transactional quota allowed %d, limited %d", allowed, limited)
	}
	check("GET", "/api/admin/articles", nil, 429)
	// Emulator accepts unsigned tokens: modify only auth_time to exercise recent-auth enforcement.
	parts := strings.Split(token, ".")
	raw, _ := base64.RawURLEncoding.DecodeString(parts[1])
	var payload map[string]any
	_ = json.Unmarshal(raw, &payload)
	payload["auth_time"] = time.Now().Unix() - 301
	raw, _ = json.Marshal(payload)
	parts[1] = base64.RawURLEncoding.EncodeToString(raw)
	code, _ := call("DELETE", path, nil, strings.Join(parts, "."))
	if code != 401 {
		t.Fatal("stale auth allowed", code)
	}
	if hooks.Load() != 5 {
		t.Errorf("rebuild hook calls got %d want 5", hooks.Load())
	}
	if _, err = services.Auth.UpdateUser(ctx, uid, (&auth.UserToUpdate{}).Disabled(true)); err != nil {
		t.Fatal(err)
	}
	check("GET", "/api/admin/site", nil, 401)
}

func TestOwnerClaims(t *testing.T) {
	t.Setenv("FIREBASE_OWNER_UID", "owner")
	t.Setenv("FIREBASE_AUTH_EMULATOR_HOST", "")
	token := func() *auth.Token {
		return &auth.Token{UID: "owner", AuthTime: time.Now().Unix(), Claims: map[string]any{"admin": true, "firebase": map[string]any{"sign_in_second_factor": "totp"}}}
	}
	assertCode := func(want int, fn func()) {
		t.Helper()
		defer func() {
			p := recover()
			e, ok := p.(*HTTPError)
			if !ok || e.Status != want {
				t.Errorf("got %v want HTTP %d", p, want)
			}
		}()
		fn()
	}
	if authorizeOwner(token(), true) != "owner" {
		t.Fatal("owner rejected")
	}
	v := token()
	v.UID = "other"
	assertCode(403, func() { authorizeOwner(v, false) })
	v = token()
	v.Claims["admin"] = false
	assertCode(403, func() { authorizeOwner(v, false) })
	v = token()
	delete(v.Claims, "firebase")
	assertCode(403, func() { authorizeOwner(v, false) })
	v = token()
	v.Claims["firebase"] = map[string]any{"sign_in_second_factor": "phone"}
	assertCode(403, func() { authorizeOwner(v, false) })
	v = token()
	v.AuthTime = time.Now().Unix() - 301
	assertCode(401, func() { authorizeOwner(v, true) })
	t.Setenv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099")
	t.Setenv("FIREBASE_PROJECT_ID", "real-project")
	v = token()
	delete(v.Claims, "firebase")
	assertCode(403, func() { authorizeOwner(v, false) })
	t.Setenv("FIREBASE_PROJECT_ID", "demo-asad-exe")
	if authorizeOwner(v, false) != "owner" {
		t.Fatal("demo emulator exception rejected")
	}
	t.Setenv("FIREBASE_PROJECT_ID", "real-project")
	t.Setenv("FIREBASE_STORAGE_BUCKET", "test-bucket")
	if _, err := Open(context.Background()); err == nil {
		t.Fatal("real project accepted emulator configuration")
	}
}
