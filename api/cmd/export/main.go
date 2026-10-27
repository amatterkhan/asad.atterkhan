// export produces a complete snapshot. Replacing the directory removes stale unpublished slugs.
package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"regexp"

	"cloud.google.com/go/storage"
	"github.com/amatterkhan/asad.atterkhan/api/internal/server"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
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
	thumbnail := regexp.MustCompile(`^([a-f0-9]{64})\.(webp|png|jpg)$`)
	if err = os.Mkdir(filepath.Join(tmp, "thumbnails"), 0755); err != nil {
		return err
	}
	// copyThumbnail writes a published article's thumbnail beside the snapshot. A missing object
	// drops the thumbnail (the article still builds); one that does not match its name fails.
	copyThumbnail := func(v map[string]any) error {
		name, _ := v["thumbnail"].(string)
		m := thumbnail.FindStringSubmatch(name)
		if m == nil {
			delete(v, "thumbnail")
			return nil
		}
		reader, err := services.Bucket.Object("thumbnails/" + name).NewReader(ctx)
		if errors.Is(err, storage.ErrObjectNotExist) {
			log.Printf("thumbnail %s for %s is missing; exporting without it", name, v["slug"])
			delete(v, "thumbnail")
			return nil
		}
		if err != nil {
			return err
		}
		defer reader.Close()
		b, err := io.ReadAll(io.LimitReader(reader, 512*1024+1))
		if err != nil {
			return err
		}
		if sum := sha256.Sum256(b); hex.EncodeToString(sum[:]) != m[1] {
			return fmt.Errorf("thumbnail %s does not match its digest", name)
		}
		return os.WriteFile(filepath.Join(tmp, "thumbnails", name), b, 0600)
	}
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
			if _, ok := v["thumbnail"]; ok && collection == "publicArticles" {
				if err = copyThumbnail(v); err != nil {
					return err
				}
			}
			if err = write(dir+"/"+doc.Ref.ID+".json", v); err != nil {
				return err
			}
		}
	}
	for id, name := range map[string]string{"public": "site.json", "achievements": "achievements.json", "wardrobe": "wardrobe.json", "lab": "lab.json", "thoughts": "thoughts.json"} {
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
