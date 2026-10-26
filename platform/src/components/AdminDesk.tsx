"use client";
import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { OwnerSignIn } from "./OwnerSignIn";
import { apiResponseError, UserFacingError, userErrorMessage } from "@/lib/user-errors";

// Owner-only writing desk. Talks to /api/admin/* (docs/admin-contract.md) with the Firebase ID token.

type SiteCopy = Record<string, string>;
type Summary = {
  slug: string; title: string; description: string; status: "draft" | "published";
  tags: string[]; category?: string; featured: boolean; publishedAt?: string; modifiedAt: string; version: number;
  publishedVersion?: number;
};
type Draft = Summary & { body: string };

const COPY_GROUPS: { title: string; fields: [string, string, "line" | "text" | "markdown"][] }[] = [
  { title: "Who", fields: [["role", "Role", "line"], ["company", "Company", "line"], ["location", "Location", "line"]] },
  { title: "Hero", fields: [["heroTitle", "Title", "line"], ["heroLede", "Lead sentence", "text"], ["heroBody", "Paragraph", "text"]] },
  { title: "Room and closing", fields: [["roomHint", "Caption under the room", "line"], ["closingTitle", "Closing title", "line"], ["closingBody", "Closing text (before the email)", "text"]] },
  {
    title: "Page intros",
    fields: [["labIntro", "The Lab", "text"], ["workbenchIntro", "Workbench", "text"], ["experienceIntro", "Experience", "text"], ["achievementsIntro", "Achievements", "text"]],
  },
  { title: "About", fields: [["aboutBody", "About page (Markdown)", "markdown"]] },
];

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export function AdminDesk() {
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [status, setStatus] = useState("");
  const [tab, setTab] = useState<"copy" | "writing" | "wardrobe">("writing");

  const onUser = useCallback((nextUser: User | null) => {
    setAuthorized(false);
    setUser(nextUser);
    setSessionVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function verifyOwner() {
      try {
        const token = await user!.getIdToken(true);
        const response = await fetch("/api/admin/session", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok) throw apiResponseError(response.status, body);
        if (active) {
          setAuthorized(true);
          setStatus("");
        }
      } catch (error) {
        if (active) setStatus(userErrorMessage(error, "sign_in_failed"));
      }
    }
    void verifyOwner();
    return () => { active = false; };
  }, [user, sessionVersion]);

  const api = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      if (!user) throw new UserFacingError("sign_in_required");
      const res = await fetch(path, {
        ...init,
        headers: { ...init.headers, "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw apiResponseError(res.status, body);
      return body as T;
    },
    [user],
  );

  if (!user || !authorized)
    return (
      <section className="admin-locked">
        <p className="eyebrow">Owner only</p>
        <h2>{user ? "Secure your sign-in." : "Sign in to write."}</h2>
        <p>{user ? "Finish your authenticator step to open the writing desk." : "Continue with your Google account, then verify with your authenticator."}</p>
        <OwnerSignIn user={user} onUser={onUser} onStatus={setStatus} />
        {status && <p className="admin-status" role="status">{status}</p>}
      </section>
    );

  return (
    <section className="admin-desk">
      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        {(["writing", "copy", "wardrobe"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {{ writing: "Writing", copy: "Site copy", wardrobe: "Wardrobe" }[t]}
          </button>
        ))}
        <span className="admin-who">{user.email}</span>
        <button onClick={async () => {
          try {
            const { getAuth, signOut } = await import("firebase/auth");
            await signOut(getAuth());
            onUser(null);
          } catch (error) { setStatus(userErrorMessage(error)); }
        }}>Sign out</button>
      </div>
      {tab === "copy" ? <CopyEditor api={api} /> : tab === "wardrobe" ? <Wardrobe api={api} /> : <Writing api={api} />}
    </section>
  );
}

type Api = <T>(path: string, init?: RequestInit) => Promise<T>;

function CopyEditor({ api }: { api: Api }) {
  const [copy, setCopy] = useState<SiteCopy | null>(null);
  const [note, setNote] = useState("");
  useEffect(() => {
    api<SiteCopy>("/api/admin/site").then(setCopy, (e) => setNote(userErrorMessage(e)));
  }, [api]);
  if (!copy) return <p className="admin-status">{note || "Loading site copy…"}</p>;
  const save = async () => {
    setNote("Saving…");
    try {
      const saved = await api<SiteCopy>("/api/admin/site", { method: "PUT", body: JSON.stringify(copy) });
      setCopy(saved);
      setNote("Saved. Pages refresh within a few seconds.");
    } catch (e) {
      setNote(userErrorMessage(e));
    }
  };
  return (
    <form className="admin-form" onSubmit={(e) => (e.preventDefault(), save())}>
      {COPY_GROUPS.map((g) => (
        <fieldset key={g.title}>
          <legend>{g.title}</legend>
          {g.fields.map(([key, label, kind]) => (
            <label key={key} className={kind}>
              <span>{label}</span>
              {kind === "line" ? (
                <input value={copy[key] ?? ""} onChange={(e) => setCopy({ ...copy, [key]: e.target.value })} maxLength={600} />
              ) : (
                <textarea
                  value={copy[key] ?? ""}
                  rows={kind === "markdown" ? 12 : 3}
                  maxLength={kind === "markdown" ? 8000 : 600}
                  onChange={(e) => setCopy({ ...copy, [key]: e.target.value })}
                />
              )}
            </label>
          ))}
        </fieldset>
      ))}
      <div className="admin-actions">
        <button className="primary">Save site copy</button>
        <span className="admin-status" role="status">{note}{copy.updatedAt ? ` · last saved ${new Date(copy.updatedAt).toLocaleString()}` : ""}</span>
      </div>
    </form>
  );
}

type Outfit = { id: string; name: string; description: string; createdAt: string; preview: string };
type WardrobeState = { outfits: Outfit[]; defaultOutfit: string; activeOutfit: string; updatedAt?: string };

// Asad's outfits live as files in public/art/outfits/ (scripts/outfits.py); this picks the one the
// room and the About vignette show.
function Wardrobe({ api }: { api: Api }) {
  const [state, setState] = useState<WardrobeState | null>(null);
  const [picked, setPicked] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => {
    api<WardrobeState>("/api/admin/wardrobe").then(
      (w) => (setState(w), setPicked(w.activeOutfit)),
      (e) => setNote(userErrorMessage(e)),
    );
  }, [api]);
  if (!state) return <p className="admin-status" role="status">{note || "Loading the wardrobe…"}</p>;
  if (!state.outfits.length) return <p className="admin-status" role="status">No outfits found in public/art/outfits.</p>;
  const save = async () => {
    setNote("Saving…");
    try {
      const saved = await api<{ activeOutfit: string; updatedAt: string }>("/api/admin/wardrobe", {
        method: "PUT",
        body: JSON.stringify({ activeOutfit: picked }),
      });
      setState({ ...state, ...saved });
      setNote("Saved. The room changes within a few seconds.");
    } catch (e) {
      setNote(userErrorMessage(e));
    }
  };
  return (
    <form className="admin-form" onSubmit={(e) => (e.preventDefault(), save())}>
      <fieldset>
        <legend>What Asad is wearing</legend>
        <div className="wardrobe" role="radiogroup" aria-label="Outfits">
          {state.outfits.map((o) => (
            <label key={o.id} className={`wardrobe-item${picked === o.id ? " is-picked" : ""}`}>
              <input type="radio" name="outfit" value={o.id} checked={picked === o.id} onChange={() => setPicked(o.id)} />
              {/* eslint-disable-next-line @next/next/no-img-element -- 64x76 pixel art, scaled with nearest-neighbour */}
              <img src={o.preview} alt="" width={128} height={152} />
              <strong>{o.name}</strong>
              <small>{o.description}</small>
              <small className="wardrobe-tags">
                {o.id === state.activeOutfit && <span className="badge published">on the site</span>}
                {o.id === state.defaultOutfit && <span className="badge draft">default</span>}
              </small>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="admin-actions">
        <button className="primary" disabled={picked === state.activeOutfit}>Wear this outfit</button>
        <span className="admin-status" role="status">{note}{state.updatedAt ? ` · last changed ${new Date(state.updatedAt).toLocaleString()}` : ""}</span>
      </div>
    </form>
  );
}

function Writing({ api }: { api: Api }) {
  const [list, setList] = useState<Summary[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState({ title: "", description: "" });

  const refresh = useCallback(() => api<{ articles: Summary[] }>("/api/admin/articles").then((r) => setList(r.articles), (e) => setNote(userErrorMessage(e))), [api]);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setNote(label);
    try {
      await fn();
    } catch (e) {
      setNote(userErrorMessage(e));
    }
  };
  const open = (slug: string) => run("Opening…", async () => {
    setDraft(await api<Draft>(`/api/admin/articles/${slug}`));
    setPreview(null);
    setNote("");
  });
  const create = () => run("Creating…", async () => {
    const slug = slugify(creating.title);
    const d = await api<Draft>("/api/admin/articles", { method: "POST", body: JSON.stringify({ ...creating, slug }) });
    setCreating({ title: "", description: "" });
    setDraft(d);
    await refresh();
    setNote("New draft created.");
  });
  const save = () => run("Saving…", async () => {
    if (!draft) return;
    setDraft(await api<Draft>(`/api/admin/articles/${draft.slug}`, { method: "PUT", body: JSON.stringify(draft) }));
    await refresh();
    setNote("Draft saved.");
  });
  const act = (verb: "publish" | "unpublish") => run(verb === "publish" ? "Publishing…" : "Unpublishing…", async () => {
    if (!draft) return;
    await api(`/api/admin/articles/${draft.slug}`, { method: "PUT", body: JSON.stringify(draft) }).then((d) => setDraft(d as Draft));
    setDraft(await api<Draft>(`/api/admin/articles/${draft.slug}/${verb}`, { method: "POST" }));
    await refresh();
    setNote(verb === "publish" ? "Published. It's live at /lab/" + draft.slug : "Unpublished.");
  });
  const remove = () => run("Deleting…", async () => {
    if (!draft || !confirm(`Delete the draft “${draft.title}”? This can't be undone.`)) return setNote("");
    await api(`/api/admin/articles/${draft.slug}`, { method: "DELETE" });
    setDraft(null);
    await refresh();
    setNote("Draft deleted.");
  });
  const showPreview = () => run("Rendering preview…", async () => {
    if (!draft) return;
    const r = await api<{ html: string }>("/api/admin/preview", { method: "POST", body: JSON.stringify({ body: draft.body }) });
    setPreview(r.html);
    setNote("");
  });

  return (
    <div className="admin-writing">
      <aside className="admin-list">
        <form className="admin-new" onSubmit={(e) => (e.preventDefault(), create())}>
          <p className="eyebrow">New note</p>
          <input placeholder="Title" value={creating.title} onChange={(e) => setCreating({ ...creating, title: e.target.value })} required />
          <input placeholder="One-line description" value={creating.description} onChange={(e) => setCreating({ ...creating, description: e.target.value })} required />
          <small>{creating.title && `/lab/${slugify(creating.title)}`}</small>
          <button disabled={!creating.title || !creating.description}>Create draft</button>
        </form>
        <p className="eyebrow">Notes</p>
        {!list ? <p className="admin-status">Loading…</p> : !list.length ? <p className="admin-status">No notes yet.</p> : null}
        <ul>
          {list?.map((a) => (
            <li key={a.slug}>
              <button className={draft?.slug === a.slug ? "is-open" : ""} onClick={() => open(a.slug)}>
                <span className={`badge ${a.status}`}>{a.status}</span>
                <strong>{a.title}</strong>
                <small>{new Date(a.modifiedAt).toLocaleDateString()}</small>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {draft ? (
        <form className="admin-editor" onSubmit={(e) => (e.preventDefault(), save())}>
          <div className="admin-row">
            <label className="grow"><span>Title</span><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
            <label><span>Category</span><input value={draft.category ?? ""} onChange={(e) => setDraft({ ...draft, category: e.target.value || undefined })} /></label>
          </div>
          <label><span>Description</span><input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
          <div className="admin-row">
            <label className="grow">
              <span>Tags (comma separated)</span>
              <input value={draft.tags.join(", ")} onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
            </label>
            <label className="check"><input type="checkbox" checked={draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} /> <span>Featured</span></label>
          </div>
          <div className="admin-body">
            <label className="markdown">
              <span>Body (Markdown, ```mermaid and ```flow supported)</span>
              <textarea value={draft.body} rows={24} onChange={(e) => setDraft({ ...draft, body: e.target.value })} spellCheck />
            </label>
            {preview !== null && (
              <div className="admin-preview">
                <span>Preview</span>
                <div className="prose" dangerouslySetInnerHTML={{ __html: preview }} />
              </div>
            )}
          </div>
          <div className="admin-actions">
            <button className="primary">Save draft</button>
            <button type="button" onClick={showPreview}>Preview</button>
            <button type="button" onClick={() => act("publish")}>{draft.status === "draft" ? "Publish" : "Publish changes"}</button>
            {draft.status === "published" && <button type="button" onClick={() => act("unpublish")}>Unpublish</button>}
            {draft.status === "draft" && <button type="button" className="danger" onClick={remove}>Delete</button>}
            <span className="admin-status" role="status">{note ||
                `/lab/${draft.slug} · ${draft.status}${
                  draft.status === "published" && (draft.publishedVersion ?? draft.version) < draft.version ? " · edits not yet published" : ""
                }`}</span>
          </div>
        </form>
      ) : (
        <div className="admin-empty">
          <p>Pick a note on the left, or start a new one.</p>
          {note && <p className="admin-status">{note}</p>}
        </div>
      )}
    </div>
  );
}
