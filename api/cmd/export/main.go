// export produces a complete snapshot. Replacing the directory removes stale unpublished slugs.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/amatterkhan/asad-exe/api/internal/server"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"log"
	"os"
	"path/filepath"
	"regexp"
)

func run() error {
	ctx := context.Background()
	services, err := server.Open(ctx)
	if err != nil {
		return err
	}
	defer services.DB.Close()
	target := os.Getenv("CONTENT_EXPORT_DIR")
	if target == "" {
		target = "../site/.content-export"
	}
	target, err = filepath.Abs(target)
	if err != nil {
		return err
	}
	if err = os.MkdirAll(filepath.Dir(target), 0755); err != nil {
		return err
	}
	tmp, err := os.MkdirTemp(filepath.Dir(target), ".content-export-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(tmp)
	write := func(path string, v any) error {
		b, err := json.MarshalIndent(v, "", "  ")
		if err != nil {
			return err
		}
		return os.WriteFile(filepath.Join(tmp, path), append(b, '\n'), 0600)
	}
	valid := regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
	for collection, dir := range map[string]string{"publicArticles": "articles", "publicProjects": "projects"} {
		if err = os.Mkdir(filepath.Join(tmp, dir), 0755); err != nil {
			return err
		}
		docs, err := services.DB.Collection(collection).Documents(ctx).GetAll()
		if err != nil {
			return err
		}
		for _, doc := range docs {
			v := doc.Data()
			if collection == "publicArticles" && v["status"] != "published" {
				continue
			}
			if !valid.MatchString(doc.Ref.ID) || v["slug"] != doc.Ref.ID {
				return fmt.Errorf("invalid %s document identity", collection)
			}
			if err = write(dir+"/"+doc.Ref.ID+".json", v); err != nil {
				return err
			}
		}
	}
	for id, name := range map[string]string{"public": "site.json", "achievements": "achievements.json"} {
		doc, err := services.DB.Collection("siteSettings").Doc(id).Get(ctx)
		if status.Code(err) == codes.NotFound {
			continue
		}
		if err != nil {
			return err
		}
		v := doc.Data()
		delete(v, "ownerUid")
		delete(v, "updatedAt")
		if err = write(name, v); err != nil {
			return err
		}
	}
	// The exporter is serialized by the workflow's concurrency group; preserve the old snapshot on error.
	const marker = ".asad-content-export"
	if err = os.WriteFile(filepath.Join(tmp, marker), []byte("published content snapshot\n"), 0600); err != nil {
		return err
	}
	if entries, readErr := os.ReadDir(target); readErr == nil && len(entries) > 0 {
		if _, markerErr := os.Stat(filepath.Join(target, marker)); markerErr != nil {
			return fmt.Errorf("refusing to replace non-export directory: %s", target)
		}
	} else if readErr != nil && !os.IsNotExist(readErr) {
		return readErr
	}
	backup := target + ".previous"
	if _, err = os.Stat(backup); err == nil {
		return fmt.Errorf("previous export backup exists: %s", backup)
	}
	hadOld := false
	if _, err = os.Stat(target); err == nil {
		if err = os.Rename(target, backup); err != nil {
			return err
		}
		hadOld = true
	} else if !os.IsNotExist(err) {
		return err
	}
	if err = os.Rename(tmp, target); err != nil {
		if hadOld {
			_ = os.Rename(backup, target)
		}
		return err
	}
	if hadOld {
		return os.RemoveAll(backup)
	}
	return nil
}
func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}
