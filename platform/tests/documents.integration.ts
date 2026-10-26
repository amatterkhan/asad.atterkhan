import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
const base = "http://127.0.0.1:4181";
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
test(
  "real HTTP achievements selection, upload, authorization, private download, publish, unpublish and archive",
  { timeout: 60000 },
  async () => {
    const email = `owner-${Date.now()}@example.test`;
    const password = "Test-only-password-23954";
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
    const server = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--port",
        "4181",
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
          ENABLE_DOCUMENT_ADMIN: "true",
          ENABLE_PUBLIC_FILES: "true",
          ENABLE_ACHIEVEMENT_ADMIN: "true",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let logs = "";
    server.stdout?.on("data", (data) => (logs += data));
    server.stderr?.on("data", (data) => (logs += data));
    try {
      let ready = false;
      for (let i = 0; i < 60; i++) {
        try {
          if ((await fetch(base)).ok) {
            ready = true;
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 250));
      }
      assert.ok(ready, logs);
      const call = (
        path: string,
        init: RequestInit = {},
        token = owner.idToken,
      ) =>
        fetch(base + path, {
          ...init,
          headers: { ...init.headers, Authorization: `Bearer ${token}` },
        });
      assert.equal((await fetch(base + "/api/admin/documents")).status, 401);
      assert.equal(
        (await call("/api/admin/documents", {}, other.idToken)).status,
        403,
      );
      assert.equal((await fetch(base + "/api/admin/achievements")).status, 401);
      assert.equal(
        (await call("/api/admin/achievements", {}, other.idToken)).status,
        403,
      );
      const initialSelection = await (
        await call("/api/admin/achievements")
      ).json();
      assert.equal(initialSelection.achievements.length, 5);
      assert.deepEqual(initialSelection.featuredIds, ["4", "3", "1"]);
      const updateSelection = (featuredIds: string[]) =>
        call("/api/admin/achievements", {
          method: "PATCH",
          body: JSON.stringify({ featuredIds }),
        });
      assert.equal((await updateSelection(["unknown"])).status, 400);
      assert.equal((await updateSelection(["4", "4"])).status, 400);
      assert.equal((await updateSelection(["5"])).status, 200);
      assert.deepEqual(
        (await (await call("/api/admin/achievements")).json()).featuredIds,
        ["5"],
      );
      const experience = await (await fetch(base + "/experience")).text();
      assert.ok(experience.includes("Oracle Certified Multicloud"));
      assert.ok(!experience.includes("Certified Cybersecurity Technician"));
      const allAchievements = await (
        await fetch(base + "/achievements")
      ).text();
      assert.ok(allAchievements.includes("Certified Cybersecurity Technician"));
      assert.ok(allAchievements.includes("Oracle Certified Multicloud"));
      assert.equal((await updateSelection([])).status, 200);
      assert.ok(
        !(await (await fetch(base + "/experience")).text()).includes(
          "Oracle Certified Multicloud",
        ),
      );
      const bytes = await fs.readFile("public/sprites/storm-idle-still.png");
      const form = new FormData();
      form.set(
        "file",
        new File([new Uint8Array(bytes)], "storm.png", { type: "image/png" }),
      );
      form.set("title", "Emulator-only reviewed image");
      form.set("tags", '["test"]');
      const uploaded = await call("/api/admin/documents", {
        method: "POST",
        body: form,
      });
      assert.equal(uploaded.status, 201, await uploaded.clone().text());
      const record = await uploaded.json();
      assert.equal(record.published, false);
      assert.equal((await fetch(base + "/files/" + record.id)).status, 404);
      const download = await call(`/api/admin/documents/${record.id}/download`);
      assert.equal(download.status, 200);
      assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
      const bad = new FormData();
      bad.set(
        "file",
        new File(["<script>alert(1)</script>"], "fake.png", {
          type: "image/png",
        }),
      );
      bad.set("title", "Disguised executable");
      assert.equal(
        (await call("/api/admin/documents", { method: "POST", body: bad }))
          .status,
        415,
      );
      assert.equal(
        (
          await call(`/api/admin/documents/${record.id}/publish`, {
            method: "POST",
            body: JSON.stringify({ action: "publish", confirm: false }),
          })
        ).status,
        400,
      );
      const publish = await call(`/api/admin/documents/${record.id}/publish`, {
        method: "POST",
        body: JSON.stringify({ action: "publish", confirm: true }),
      });
      assert.equal(publish.status, 200, await publish.clone().text());
      const publicFile = await fetch(base + "/files/" + record.id);
      assert.equal(publicFile.status, 200);
      assert.equal(publicFile.headers.get("cache-control"), "private,no-store");
      assert.deepEqual(Buffer.from(await publicFile.arrayBuffer()), bytes);
      assert.equal(
        (
          await call(`/api/admin/documents/${record.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              title: "Updated metadata",
              tags: ["edited"],
            }),
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await call(`/api/admin/documents/${record.id}/publish`, {
            method: "POST",
            body: JSON.stringify({ action: "unpublish", confirm: true }),
          })
        ).status,
        200,
      );
      assert.equal((await fetch(base + "/files/" + record.id)).status, 404);
      assert.equal(
        (await call(`/api/admin/documents/${record.id}`, { method: "DELETE" }))
          .status,
        200,
      );
      assert.equal(
        (await call(`/api/admin/documents/${record.id}/download`)).status,
        200,
      );
      assert.equal(
        (
          await call(`/api/admin/documents/${record.id}/publish`, {
            method: "POST",
            body: JSON.stringify({ action: "publish", confirm: true }),
          })
        ).status,
        409,
      );
    } catch (e) {
      console.error(logs);
      throw e;
    } finally {
      server.kill("SIGTERM");
      await new Promise((resolve) => server.on("exit", resolve));
    }
  },
);
