package main

import (
	"context"
	"encoding/json"
	"github.com/amatterkhan/asad-exe/api/internal/server"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestExportSnapshot(t *testing.T) {
	if os.Getenv("FIRESTORE_EMULATOR_HOST") == "" {
		t.Skip("requires Firebase emulators")
	}
	t.Setenv("FIREBASE_PROJECT_ID", "demo-asad-exe")
	t.Setenv("FIREBASE_STORAGE_BUCKET", "demo-asad-exe.appspot.com")
	t.Setenv("FIREBASE_OWNER_UID", "export-test")
	ctx := context.Background()
	services, err := server.Open(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer services.DB.Close()
	slug := "exported-fixture"
	ref := services.DB.Collection("publicArticles").Doc(slug)
	_, err = ref.Set(ctx, map[string]any{"slug": slug, "status": "published", "title": "Exported note", "description": "Snapshot fixture", "publishedAt": "2025-01-01", "tags": []string{}, "featured": false, "body": "## Exported"})
	if err != nil {
		t.Fatal(err)
	}
	defer ref.Delete(ctx)
	unrelated := t.TempDir()
	protected := filepath.Join(unrelated, "keep.txt")
	if err = os.WriteFile(protected, []byte("keep"), 0600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("CONTENT_EXPORT_DIR", unrelated)
	if err = run(); err == nil {
		t.Fatal("export overwrote a non-export directory")
	}
	if b, err := os.ReadFile(protected); err != nil || string(b) != "keep" {
		t.Fatal("unrelated directory changed")
	}
	dir := filepath.Join(t.TempDir(), "snapshot")
	t.Setenv("CONTENT_EXPORT_DIR", dir)
	if err = run(); err != nil {
		t.Fatal(err)
	}
	b, err := os.ReadFile(filepath.Join(dir, "articles", slug+".json"))
	if err != nil {
		t.Fatal(err)
	}
	var v map[string]any
	if err = json.Unmarshal(b, &v); err != nil || v["body"] != "## Exported" {
		t.Fatal(string(b), err)
	}
	if os.Getenv("VERIFY_SITE_BUILD") == "true" {
		cmd := exec.Command("npm", "run", "build")
		cmd.Dir = "../../../site"
		cmd.Env = append(os.Environ(), "CONTENT_SOURCE=firestore", "CONTENT_EXPORT_DIR="+dir)
		if output, buildErr := cmd.CombinedOutput(); buildErr != nil {
			t.Fatalf("exported site build failed: %v\n%s", buildErr, output)
		}
		rendered, readErr := os.ReadFile("../../../site/dist/lab/" + slug + "/index.html")
		if readErr != nil || !strings.Contains(string(rendered), `<h2 id="exported">Exported</h2>`) {
			t.Fatalf("exported publication not prerendered: %v", readErr)
		}
	}
	if _, err = ref.Delete(ctx); err != nil {
		t.Fatal(err)
	}
	if err = run(); err != nil {
		t.Fatal(err)
	}
	if _, err = os.Stat(filepath.Join(dir, "articles", slug+".json")); !os.IsNotExist(err) {
		t.Fatal("stale unpublished slug remains")
	}
}
