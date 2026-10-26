import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
// Real HTTP against a built server (NEXT_DIST_DIR=.next-production npm run build) and the Auth and
// Firestore emulators, with CONTENT_SOURCE=firestore so public pages read what the admin writes.
const base = "http://127.0.0.1:4182";
async function authCall(method: string, data: object) {
  const r = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:${method}?key=demo-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  assert.ok(r.ok, await r.clone().text());
  return r.json();
}
/** Pages regenerate after revalidatePath; allow a few requests for the fresh render. */
async function eventually(check: () => Promise<boolean>, what: string) {
  for (let i = 0; i < 40; i++) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  assert.fail(`Timed out waiting for: ${what}`);
}
const page = async (path: string) => {
  const r = await fetch(base + path, { cache: "no-store" });
  return { status: r.status, text: await r.text() };
};
test(
  "content admin: site copy, article drafts, versions, publish, unpublish, delete, preview",
  { timeout: 120000 },
  async () => {
    const password = "Test-only-password-23954";
    const email = `owner-${Date.now()}@example.test`;
    const signed = await authCall("signUp", {
      email,
      password,
      returnSecureToken: true,
    });
    const admin = initializeApp({ projectId: "demo-asad-exe" });
    await getAuth(admin).setCustomUserClaims(signed.localId, { admin: true });
    const owner = await authCall("signInWithPassword", {
      email,
      password,
      returnSecureToken: true,
    });
    const other = await authCall("signUp", {
      email: `other-${Date.now()}@example.test`,
      password,
      returnSecureToken: true,
    });
    const db = getFirestore(admin);
    const start = (env: Record<string, string>) => {
      const child = spawn(
        process.execPath,
        [
          "node_modules/next/dist/bin/next",
          "start",
          "--port",
          "4182",
          "--hostname",
          "127.0.0.1",
        ],
        {
          env: {
            ...process.env,
            NEXT_DIST_DIR: ".next-production",
            FIREBASE_PROJECT_ID: "demo-asad-exe",
            FIREBASE_STORAGE_BUCKET: "demo-asad-exe.appspot.com",
            FIREBASE_OWNER_UID: owner.localId,
            ...env,
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      const state = { child, logs: "" };
      child.stdout?.on("data", (d) => (state.logs += d));
      child.stderr?.on("data", (d) => (state.logs += d));
      return state;
    };
    const ready = async (logs: () => string) => {
      for (let i = 0; i < 80; i++) {
        try {
          if ((await fetch(base + "/robots.txt")).ok) return;
        } catch {}
        await new Promise((r) => setTimeout(r, 250));
      }
      assert.fail(logs());
    };
    const stop = async (s: ReturnType<typeof start>) => {
      s.child.kill("SIGTERM");
      await new Promise((resolve) => s.child.on("exit", resolve));
    };

    // Flag off: the content service is unavailable even to the owner.
    const off = start({ ENABLE_CONTENT_ADMIN: "false" });
    try {
      await ready(() => off.logs);
      const r = await fetch(base + "/api/admin/site", {
        headers: { Authorization: `Bearer ${owner.idToken}` },
      });
      assert.equal(r.status, 503);
    } finally {
      await stop(off);
    }

    const server = start({
      ENABLE_CONTENT_ADMIN: "true",
      CONTENT_SOURCE: "firestore",
    });
    try {
      await ready(() => server.logs);
      const call = (
        path: string,
        init: RequestInit & { json?: unknown } = {},
        token = owner.idToken,
      ) =>
        fetch(base + path, {
          ...init,
          ...(init.json !== undefined
            ? { body: JSON.stringify(init.json) }
            : {}),
          headers: {
            ...init.headers,
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      const revalidated = (paths: string[]) =>
        server.logs
          .split("\n")
          .filter((l) => l.includes('"content_revalidated"'))
          .some((l) => JSON.parse(l).id === paths.join(","));

      // Every route: 401 without a token, 403 for a signed-in non-owner.
      const routes: [string, string][] = [
        ["GET", "/api/admin/session"],
        ["GET", "/api/admin/site"],
        ["PUT", "/api/admin/site"],
        ["GET", "/api/admin/wardrobe"],
        ["PUT", "/api/admin/wardrobe"],
        ["GET", "/api/admin/articles"],
        ["POST", "/api/admin/articles"],
        ["GET", "/api/admin/articles/hello-firestore"],
        ["PUT", "/api/admin/articles/hello-firestore"],
        ["DELETE", "/api/admin/articles/hello-firestore"],
        ["POST", "/api/admin/articles/hello-firestore/publish"],
        ["POST", "/api/admin/articles/hello-firestore/unpublish"],
        ["POST", "/api/admin/preview"],
      ];
      for (const [method, path] of routes) {
        const anon = await fetch(base + path, { method, body: method === "GET" ? undefined : "{}" });
        assert.equal(anon.status, 401, `${method} ${path} anonymous`);
        assert.equal(anon.headers.get("cache-control"), "no-store");
        const anonymousError = await anon.json();
        assert.equal(anonymousError.code, "sign_in_required");
        assert.equal(anonymousError.error, "Sign in to continue.");
        const denied = await call(path, { method, json: method === "GET" ? undefined : {} }, other.idToken);
        assert.equal(denied.status, 403, `${method} ${path} other user`);
        const deniedError = await denied.json();
        assert.equal(deniedError.code, "access_denied");
        assert.equal(deniedError.error, "You don’t have access to this page.");
      }

      const session = await call("/api/admin/session");
      assert.equal(session.status, 200);
      assert.equal(session.headers.get("cache-control"), "no-store");
      assert.deepEqual(await session.json(), { uid: owner.localId });

      // Site copy: starts from content/site.json, validates, saves, revalidates, shows publicly.
      const initial = await (await call("/api/admin/site")).json();
      assert.equal(initial.role, "Security Analyst");
      assert.equal(initial.updatedAt, undefined);
      const putSite = (json: unknown) => call("/api/admin/site", { method: "PUT", json });
      assert.equal((await putSite({ ...initial, role: "x".repeat(601) })).status, 400);
      assert.equal((await putSite({ ...initial, aboutBody: "x".repeat(8001) })).status, 400);
      assert.equal((await putSite({ ...initial, extra: "nope" })).status, 400);
      assert.equal((await putSite({ ...initial, heroTitle: "Bell\u0007" })).status, 400);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { heroLede, ...missing } = initial;
      assert.equal((await putSite(missing)).status, 400);
      assert.equal(
        (await call("/api/admin/site", { method: "PUT", body: "{not json" })).status,
        400,
      );
      const heroTitle = `Hello from the emulator ${Date.now()}`;
      const saved = await putSite({ ...initial, heroTitle, aboutBody: "About **me**." });
      assert.equal(saved.status, 200, await saved.clone().text());
      const savedCopy = await saved.json();
      assert.equal(savedCopy.heroTitle, heroTitle);
      assert.ok(savedCopy.updatedAt);
      assert.equal((await (await call("/api/admin/site")).json()).heroTitle, heroTitle);
      const stored = (await db.doc("siteSettings/public").get()).data()!;
      assert.equal(stored.ownerUid, owner.localId);
      assert.ok(
        revalidated(["/", "/lab", "/workbench", "/experience", "/achievements", "/about"]),
        server.logs,
      );
      await eventually(async () => (await page("/")).text.includes(heroTitle), "hero title on /");

      // Wardrobe: defaults until saved, rejects unknown outfits, switches the room's sheets.
      const wardrobe = await (await call("/api/admin/wardrobe")).json();
      assert.equal(wardrobe.activeOutfit, wardrobe.defaultOutfit);
      assert.ok(wardrobe.outfits.some((o: { id: string }) => o.id === "classic"));
      const wear = (json: unknown) => call("/api/admin/wardrobe", { method: "PUT", json });
      assert.equal((await wear({ activeOutfit: "../sprites" })).status, 400);
      assert.equal((await wear({ activeOutfit: "classic", extra: 1 })).status, 400);
      const worn = await wear({ activeOutfit: "classic" });
      assert.equal(worn.status, 200, await worn.clone().text());
      assert.equal((await worn.json()).activeOutfit, "classic");
      assert.equal((await db.doc("siteSettings/wardrobe").get()).get("ownerUid"), owner.localId);
      assert.ok(revalidated(["/", "/about"]), server.logs);
      await eventually(async () => (await page("/")).text.includes("/art/outfits/classic/asad-"), "classic outfit on /");
      await db.doc("siteSettings/wardrobe").set({ activeOutfit: "retired-outfit" });
      assert.equal((await (await call("/api/admin/wardrobe")).json()).activeOutfit, wardrobe.defaultOutfit);

      // Articles: create, validate, conflict on duplicate slug.
      const slug = `hello-firestore-${Date.now()}`;
      const create = (json: unknown) => call("/api/admin/articles", { method: "POST", json });
      assert.equal((await create({ slug: "Bad Slug", title: "T", description: "D" })).status, 400);
      assert.equal((await create({ slug, title: "", description: "D" })).status, 400);
      assert.equal((await create({ slug, title: "T", description: "D", body: "no" })).status, 400);
      const created = await create({ slug, title: "Hello Firestore", description: "A note stored in Firebase." });
      assert.equal(created.status, 201, await created.clone().text());
      let draft = await created.json();
      assert.equal(draft.status, "draft");
      assert.equal(draft.version, 1);
      assert.equal(draft.body, "");
      assert.equal((await create({ slug, title: "Again", description: "D" })).status, 409);
      assert.equal((await call(`/api/admin/articles/${slug}-missing`)).status, 404);
      assert.equal((await call("/api/admin/articles/NOT_A_SLUG")).status, 400);

      // Publishing an empty draft is refused.
      assert.equal((await call(`/api/admin/articles/${slug}/publish`, { method: "POST" })).status, 400);
      assert.equal((await call(`/api/admin/articles/${slug}/unpublish`, { method: "POST" })).status, 409);

      // Version-checked updates.
      const put = (json: unknown) => call(`/api/admin/articles/${slug}`, { method: "PUT", json });
      const body = "## First section\n\nWritten in the **admin** page.\n\n```ts\nconst x = 1;\n```\n";
      const edit = { ...draft, body, tags: ["firebase", "notes"], category: "Notes", featured: true };
      assert.equal((await put({ ...edit, tags: ["a", "a"] })).status, 400);
      assert.equal((await put({ ...edit, slug: "other-slug" })).status, 400);
      assert.equal((await put({ ...edit, version: undefined })).status, 400);
      assert.equal((await put({ ...edit, unknown: true })).status, 400);
      const first = await put(edit);
      assert.equal(first.status, 200, await first.clone().text());
      draft = await first.json();
      assert.equal(draft.version, 2);
      assert.equal(draft.body, body);
      assert.equal(draft.featured, true);
      const stale = await put({ ...edit, title: "Stale write" });
      assert.equal(stale.status, 409);
      assert.equal((await (await call(`/api/admin/articles/${slug}`)).json()).title, "Hello Firestore");

      // List: newest first, without bodies or owner fields.
      const older = `older-note-${Date.now()}`;
      assert.equal((await create({ slug: older, title: "Older", description: "D" })).status, 201);
      assert.equal((await put({ ...draft, title: "Hello Firestore, edited" })).status, 200);
      const list = (await (await call("/api/admin/articles")).json()).articles;
      assert.equal(list[0].slug, slug);
      assert.ok(list.some((a: { slug: string }) => a.slug === older));
      assert.equal(list[0].body, undefined);
      assert.equal(list[0].ownerUid, undefined);
      draft = await (await call(`/api/admin/articles/${slug}`)).json();
      assert.equal(draft.version, 3);

      // Drafts never reach the public site.
      assert.equal((await db.doc(`publicArticles/${slug}`).get()).exists, false);
      assert.equal((await page(`/lab/${slug}`)).status, 404);

      // Publish: public copy, dates, version bump, revalidation, visible on public pages.
      const published = await call(`/api/admin/articles/${slug}/publish`, { method: "POST" });
      assert.equal(published.status, 200, await published.clone().text());
      draft = await published.json();
      const today = new Date().toISOString().slice(0, 10);
      assert.equal(draft.status, "published");
      assert.equal(draft.publishedAt, today);
      assert.equal(draft.version, 4);
      assert.equal(draft.publishedVersion, 4);
      const copy = (await db.doc(`publicArticles/${slug}`).get()).data()!;
      assert.deepEqual(Object.keys(copy).sort(), [
        "body", "category", "description", "featured", "publishedAt", "slug", "status", "tags", "title",
      ]);
      assert.equal(copy.status, "published");
      assert.equal(copy.title, "Hello Firestore, edited");
      assert.ok(revalidated(["/", "/lab", `/lab/${slug}`, "/rss.xml", "/sitemap.xml", "/search.json"]), server.logs);
      await eventually(async () => {
        const p = await page(`/lab/${slug}`);
        return p.status === 200 && p.text.includes("Hello Firestore, edited") && p.text.includes('id="first-section"');
      }, "published article page");
      await eventually(async () => (await page("/lab")).text.includes(slug), "article in /lab");
      await eventually(async () => (await page("/search.json")).text.includes(slug), "article in search.json");
      await eventually(async () => (await page("/rss.xml")).text.includes(slug), "article in rss.xml");

      // Edits after publishing stay in the draft until the next publish.
      assert.equal((await put({ ...draft, title: "Unpublished edit" })).status, 200);
      assert.equal((await db.doc(`publicArticles/${slug}`).get()).get("title"), "Hello Firestore, edited");

      // Published articles cannot be deleted.
      assert.equal((await call(`/api/admin/articles/${slug}`, { method: "DELETE" })).status, 409);

      // Unpublish: public copy removed, page gone, publishedAt kept for the next publish.
      const unpublished = await call(`/api/admin/articles/${slug}/unpublish`, { method: "POST" });
      assert.equal(unpublished.status, 200, await unpublished.clone().text());
      draft = await unpublished.json();
      assert.equal(draft.status, "draft");
      assert.equal(draft.publishedAt, today);
      assert.equal(draft.publishedVersion, undefined);
      assert.equal(draft.title, "Unpublished edit");
      assert.equal((await db.doc(`publicArticles/${slug}`).get()).exists, false);
      await eventually(async () => (await page(`/lab/${slug}`)).status === 404, "unpublished page 404");
      await eventually(async () => !(await page("/lab")).text.includes(slug), "article gone from /lab");

      // Delete drafts; a deleted article is gone.
      assert.equal((await call(`/api/admin/articles/${slug}`, { method: "DELETE" })).status, 200);
      assert.equal((await call(`/api/admin/articles/${slug}`)).status, 404);
      assert.equal((await call(`/api/admin/articles/${older}`, { method: "DELETE" })).status, 200);
      assert.equal((await call(`/api/admin/articles/${slug}`, { method: "DELETE" })).status, 404);

      // Preview uses the site's renderer: sanitised HTML, slugs, table wrapper, table of contents.
      const preview = await call("/api/admin/preview", {
        method: "POST",
        json: { body: "## Heading\n\n<script>alert(1)</script>\n\n| a | b |\n|---|---|\n| 1 | 2 |\n" },
      });
      assert.equal(preview.status, 200);
      assert.equal(preview.headers.get("cache-control"), "no-store");
      const rendered = await preview.json();
      assert.ok(rendered.html.includes('id="heading"'));
      assert.ok(rendered.html.includes("table-wrap"));
      assert.ok(!rendered.html.includes("<script"));
      assert.deepEqual(rendered.toc, [{ id: "heading", title: "Heading", depth: 2 }]);
      assert.equal((await call("/api/admin/preview", { method: "POST", json: { body: 3 } })).status, 400);
      assert.equal(
        (await call("/api/admin/preview", { method: "POST", json: { body: "x".repeat(200_001) } })).status,
        400,
      );
    } catch (e) {
      console.error(server.logs);
      throw e;
    } finally {
      await stop(server);
    }
  },
);
