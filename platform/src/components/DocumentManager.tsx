"use client";
import { OwnerSignIn } from "./OwnerSignIn";
import { apiResponseError, UserFacingError, userErrorMessage } from "@/lib/user-errors";
import { AchievementManager } from "./AchievementManager";
import { useState } from "react";
import type { User } from "firebase/auth";
import type { DocumentRecord } from "@/lib/document-policy";
export function DocumentManager() {
  const [user, setUser] = useState<User | null>(null);
  const [records, setRecords] = useState<DocumentRecord[]>([]);
  const [status, setStatus] = useState("Not signed in.");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  async function request(url: string, init: RequestInit = {}) {
    if (!user) throw new UserFacingError("sign_in_required");
    const token = await user.getIdToken();
    const res = await fetch(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json();
      throw apiResponseError(res.status, body);
    }
    return res;
  }
  async function refresh() {
    const res = await request("/api/admin/documents");
    setRecords(await res.json());
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setStatus(userErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="owner-actions">
        <OwnerSignIn
          key={user?.uid || "signed-out"}
          user={user}
          onUser={setUser}
          onStatus={setStatus}
        />
        {user && (
          <>
            <button onClick={() => run(refresh)} disabled={busy}>
              Load documents
            </button>
            <button
              onClick={() =>
                run(async () => {
                  const { getAuth, signOut } = await import("firebase/auth");
                  await signOut(getAuth());
                  setUser(null);
                  setRecords([]);
                  setStatus("Signed out.");
                })
              }
            >
              Sign out
            </button>
          </>
        )}
      </div>
      <p role="status" className="status">
        {status}
      </p>
      {user && <AchievementManager user={user} />}
      {user && (
        <form
          className="owner-form"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              if (!file) throw new UserFacingError("missing_file");
              const form = new FormData();
              form.set("file", file);
              form.set("title", title);
              form.set(
                "tags",
                JSON.stringify(
                  tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                ),
              );
              await request("/api/admin/documents", {
                method: "POST",
                body: form,
              });
              setStatus("Uploaded privately. Review before publishing.");
              setTitle("");
              await refresh();
            });
          }}
        >
          <label>
            Document title
            <input
              required
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            Tags, separated by commas
            <input value={tags} onChange={(e) => setTags(e.target.value)} />
          </label>
          <label>
            File · PDF, PNG, JPEG, or WebP · up to 8 MiB
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button type="submit" disabled={busy}>
            Upload privately
          </button>
        </form>
      )}
      {records.map((record) => (
        <DocumentRow
          key={record.id}
          record={record}
          busy={busy}
          onSave={async (meta) =>
            run(async () => {
              await request(`/api/admin/documents/${record.id}`, {
                method: "PATCH",
                body: JSON.stringify(meta),
              });
              setStatus("Metadata saved.");
              await refresh();
            })
          }
          onDownload={() =>
            run(async () => {
              const res = await request(
                `/api/admin/documents/${record.id}/download`,
              );
              const url = URL.createObjectURL(await res.blob());
              const a = document.createElement("a");
              a.href = url;
              a.download = record.filename;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            })
          }
          onPublish={(action) =>
            run(async () => {
              await request(`/api/admin/documents/${record.id}/publish`, {
                method: "POST",
                body: JSON.stringify({ action, confirm: true }),
              });
              setStatus(
                action === "publish"
                  ? `Published deliberately: /files/${record.id}`
                  : "Public access removed. Previously downloaded copies cannot be recalled.",
              );
              await refresh();
            })
          }
          onArchive={() =>
            run(async () => {
              await request(`/api/admin/documents/${record.id}`, {
                method: "DELETE",
              });
              setStatus("Archived; private original retained.");
              await refresh();
            })
          }
        />
      ))}
    </>
  );
}
function DocumentRow({
  record,
  busy,
  onSave,
  onDownload,
  onPublish,
  onArchive,
}: {
  record: DocumentRecord;
  busy: boolean;
  onSave: (meta: { title: string; tags: string[] }) => Promise<void>;
  onDownload: () => void;
  onPublish: (action: "publish" | "unpublish") => void;
  onArchive: () => void;
}) {
  const [title, setTitle] = useState(record.title);
  const [tags, setTags] = useState(record.tags.join(", "));
  const [reviewed, setReviewed] = useState(false);
  return (
    <section className="document-record">
      <h2>{record.title}</h2>
      <p className="meta">
        {record.archived ? "Archived" : record.published ? "Public" : "Private"}{" "}
        · {Math.ceil(record.size / 1024)} KiB · {record.mime}
      </p>
      <details>
        <summary>Edit metadata</summary>
        <form
          className="owner-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              title,
              tags: tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            });
          }}
        >
          <label>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label>
            Tags
            <input value={tags} onChange={(e) => setTags(e.target.value)} />
          </label>
          <button disabled={busy}>Save metadata</button>
        </form>
      </details>
      <div className="owner-actions">
        <button onClick={onDownload} disabled={busy}>
          Download private original
        </button>
        {record.published ? (
          <button onClick={() => onPublish("unpublish")} disabled={busy}>
            Unpublish
          </button>
        ) : (
          !record.archived && (
            <>
              <label>
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />{" "}
                I reviewed this file and intend it to be public.
              </label>
              <button
                disabled={busy || !reviewed}
                onClick={() => onPublish("publish")}
              >
                Publish public copy
              </button>
            </>
          )
        )}
        {!record.archived && (
          <button onClick={onArchive} disabled={busy}>
            Archive · retain original
          </button>
        )}
      </div>
      {record.published && (
        <a href={`/files/${record.id}`}>Public download ↗</a>
      )}
    </section>
  );
}
