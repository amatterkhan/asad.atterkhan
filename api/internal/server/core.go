package server

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"cloud.google.com/go/firestore"
	"cloud.google.com/go/storage"
	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type HTTPError struct {
	Status  int
	Message string
}

func (e *HTTPError) Error() string { return e.Message }

// fail and must abort a handler by panicking; endpoint turns the panic into a JSON error.
// Never call them inside a RunTransaction callback: the Firestore client does not recover
// panics, so the transaction would not be rolled back. Callbacks return *HTTPError instead.
func fail(code int, message string) { panic(&HTTPError{code, message}) }
func must(err error) {
	if err != nil {
		panic(err)
	}
}

type Services struct {
	DB     *firestore.Client
	Auth   *auth.Client
	Bucket *storage.BucketHandle
}

func Open(ctx context.Context) (*Services, error) {
	project, bucket := os.Getenv("FIREBASE_PROJECT_ID"), os.Getenv("FIREBASE_STORAGE_BUCKET")
	if project == "" || bucket == "" || os.Getenv("FIREBASE_OWNER_UID") == "" {
		return nil, errors.New("content service is not configured")
	}
	if os.Getenv("FIREBASE_AUTH_EMULATOR_HOST") != "" && !strings.HasPrefix(project, "demo-") {
		return nil, errors.New("authentication emulator is only allowed for demo projects")
	}
	var opts []option.ClientOption
	if os.Getenv("FIREBASE_AUTH_EMULATOR_HOST") != "" {
		opts = append(opts, option.WithoutAuthentication())
	}
	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: project, StorageBucket: bucket}, opts...)
	if err != nil {
		return nil, err
	}
	a, err := app.Auth(ctx)
	if err != nil {
		return nil, err
	}
	db, err := app.Firestore(ctx)
	if err != nil {
		return nil, err
	}
	// The Google Storage client uses STORAGE_EMULATOR_HOST; Firebase's CLI supplies FIREBASE_STORAGE_EMULATOR_HOST.
	if host := os.Getenv("FIREBASE_STORAGE_EMULATOR_HOST"); host != "" {
		if !strings.HasPrefix(host, "http") {
			host = "http://" + host
		}
		must(os.Setenv("STORAGE_EMULATOR_HOST", host))
	}
	st, err := app.Storage(ctx)
	if err != nil {
		db.Close()
		return nil, err
	}
	b, err := st.Bucket(bucket)
	if err != nil {
		db.Close()
		return nil, err
	}
	return &Services{db, a, b}, nil
}

type Server struct {
	mu       sync.Mutex
	services *Services // set once by open, never replaced
	client   *http.Client
}

func New() *Server {
	if os.Getenv("APP_ENV") == "development" && os.Getenv("K_SERVICE") != "" {
		panic("APP_ENV=development is forbidden on Cloud Run")
	}
	return &Server{client: &http.Client{Timeout: 10 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}}
}

// open connects to Firebase on first use. A failed attempt is retried on the next request
// rather than cached, so a transient startup error does not break the instance until restart.
func (s *Server) open() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.services == nil {
		services, err := Open(context.Background())
		must(err)
		s.services = services
	}
}
func (s *Server) Close() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.services != nil {
		s.services.DB.Close()
	}
}
func (s *Server) owner(r *http.Request, service string, recent bool) string {
	flag := map[string]string{"content": "ENABLE_CONTENT_ADMIN", "documents": "ENABLE_DOCUMENT_ADMIN", "achievements": "ENABLE_ACHIEVEMENT_ADMIN", "calendar": "ENABLE_PRIVATE_CALENDAR"}[service]
	if os.Getenv(flag) != "true" {
		fail(503, "Content management is not enabled")
	}
	bearer := r.Header.Get("Authorization")
	if !strings.HasPrefix(bearer, "Bearer ") || len(bearer) > 9000 {
		fail(401, "Sign in required")
	}
	s.open()
	token, err := s.services.Auth.VerifyIDTokenAndCheckRevoked(r.Context(), strings.TrimPrefix(bearer, "Bearer "))
	if err != nil {
		fail(401, "Your session has expired. Sign in again.")
	}
	return authorizeOwner(token, recent)
}
func authorizeOwner(token *auth.Token, recent bool) string {
	if token.UID != os.Getenv("FIREBASE_OWNER_UID") || token.Claims["admin"] != true {
		fail(403, "Owner access required")
	}
	if recent && time.Now().Unix()-token.AuthTime > 300 {
		fail(401, "Sign in again before publishing or archiving")
	}
	emulator := os.Getenv("FIREBASE_AUTH_EMULATOR_HOST") != "" && strings.HasPrefix(os.Getenv("FIREBASE_PROJECT_ID"), "demo-")
	firebaseClaims, _ := token.Claims["firebase"].(map[string]any)
	if !emulator && firebaseClaims["sign_in_second_factor"] != "totp" {
		fail(403, "A second authentication factor is required")
	}
	return token.UID
}
func (s *Server) quota(ctx context.Context, key string, limit, amount int64) {
	day := time.Now().UTC().Format("2006-01-02")
	h := sha256.Sum256([]byte(key + day))
	ref := s.services.DB.Collection("_quotas").Doc(hex.EncodeToString(h[:]))
	must(s.services.DB.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(ref)
		if err != nil && status.Code(err) != codes.NotFound {
			return err
		}
		var count int64
		if err == nil {
			count = number(doc.Data()["count"])
		}
		if amount < 0 || count+amount > limit {
			return &HTTPError{429, "Daily operation limit reached"}
		}
		return tx.Set(ref, map[string]any{"count": count + amount, "day": day})
	}))
}
func readBody(w http.ResponseWriter, r *http.Request, max int64) []byte {
	if r.ContentLength > max {
		fail(413, "File is too large")
	}
	r.Body = http.MaxBytesReader(w, r.Body, max)
	b, err := io.ReadAll(r.Body)
	var tooBig *http.MaxBytesError
	if errors.As(err, &tooBig) {
		fail(413, "File is too large")
	}
	if err != nil {
		fail(400, "Invalid input")
	}
	if len(b) == 0 {
		fail(400, "A request body is required")
	}
	return b
}
func input(w http.ResponseWriter, r *http.Request, max int64, allowed ...string) map[string]any {
	var v map[string]any
	if json.Unmarshal(readBody(w, r, max), &v) != nil || v == nil {
		fail(400, "Invalid input")
	}
	keys(v, allowed...)
	return v
}
func keys(v map[string]any, allowed ...string) {
	for k := range v {
		ok := false
		for _, a := range allowed {
			if a == k {
				ok = true
				break
			}
		}
		if !ok {
			fail(400, "Invalid input")
		}
	}
}
func number(v any) int64 {
	switch n := v.(type) {
	case int64:
		return n
	case int:
		return int64(n)
	case float64:
		return int64(n)
	}
	return 0
}
func str(v any) string       { s, _ := v.(string); return s }
func audit(event, id string) { slog.Info(event, "id", id, "time", stamp()) }

func stamp() string { return time.Now().UTC().Format("2006-01-02T15:04:05.000Z") }
func today() string { return time.Now().UTC().Format("2006-01-02") }
func clone(v map[string]any) map[string]any {
	n := map[string]any{}
	for k, x := range v {
		n[k] = x
	}
	return n
}
func jsonResponse(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	must(json.NewEncoder(w).Encode(v))
}
func endpoint(fn func(http.ResponseWriter, *http.Request)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if p := recover(); p != nil {
				if p == http.ErrAbortHandler {
					panic(p)
				}
				code, message := 500, "The operation could not be completed"
				if e, ok := p.(*HTTPError); ok {
					code, message = e.Status, e.Message
				} else {
					slog.Error("content_operation_failed", "kind", fmt.Sprintf("%T", p))
				}
				jsonResponse(w, code, map[string]any{"error": message})
			}
		}()
		fn(w, r)
	}
}
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/healthz", endpoint(func(w http.ResponseWriter, r *http.Request) { jsonResponse(w, 200, map[string]any{"ok": true}) }))
	for _, method := range []string{"GET", "PUT"} {
		mux.HandleFunc(method+" /api/admin/site", endpoint(s.site))
		mux.HandleFunc(method+" /api/admin/wardrobe", endpoint(s.wardrobe))
	}
	for _, method := range []string{"GET", "PATCH"} {
		mux.HandleFunc(method+" /api/admin/achievements", endpoint(s.achievements))
	}
	for _, method := range []string{"GET", "POST"} {
		mux.HandleFunc(method+" /api/admin/articles", endpoint(s.articles))
	}
	for _, method := range []string{"GET", "PUT", "DELETE"} {
		mux.HandleFunc(method+" /api/admin/articles/{slug}", endpoint(s.article))
	}
	mux.HandleFunc("POST /api/admin/articles/{slug}/publish", endpoint(s.article))
	mux.HandleFunc("POST /api/admin/articles/{slug}/unpublish", endpoint(s.article))
	mux.HandleFunc("POST /api/admin/preview", endpoint(s.preview))
	for _, method := range []string{"GET", "POST"} {
		mux.HandleFunc(method+" /api/admin/documents", endpoint(s.documents))
	}
	for _, method := range []string{"PATCH", "DELETE"} {
		mux.HandleFunc(method+" /api/admin/documents/{id}", endpoint(s.document))
	}
	mux.HandleFunc("POST /api/admin/documents/{id}/publish", endpoint(s.document))
	mux.HandleFunc("GET /api/admin/documents/{id}/download", endpoint(s.document))
	mux.HandleFunc("GET /api/owner/calendar", endpoint(s.calendar))
	mux.HandleFunc("GET /files/{id}", endpoint(s.publicFile))
	mux.HandleFunc("GET /media/{id}", endpoint(s.publicFile))
	mux.HandleFunc("/", endpoint(func(w http.ResponseWriter, r *http.Request) { fail(404, "Not found") }))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Content-Security-Policy", "default-src 'none'; sandbox")
		mux.ServeHTTP(w, r)
	})
}
