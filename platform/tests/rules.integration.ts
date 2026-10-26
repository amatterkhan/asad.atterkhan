import { test, before, after } from "node:test";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, getBytes, uploadBytes } from "firebase/storage";
import fs from "node:fs/promises";
const ownerMfaClaims = {
  admin: true,
  firebase: {
    sign_in_provider: "google.com" as const,
    sign_in_second_factor: "totp",
  },
};
let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-asad-exe",
    firestore: { rules: await fs.readFile("firebase/firestore.rules", "utf8") },
    storage: { rules: await fs.readFile("firebase/storage.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "documents/test"), {
      ownerUid: "owner",
      title: "Private",
    });
    await uploadBytes(
      ref(ctx.storage(), "private/owner/test/file.png"),
      new Uint8Array([1, 2, 3]),
    );
  });
});
after(async () => env?.cleanup());
test("only owner admin can read private metadata; all client writes denied", async () => {
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), "documents/test")),
  );
  await assertFails(
    getDoc(
      doc(
        env.authenticatedContext("other", { admin: true }).firestore(),
        "documents/test",
      ),
    ),
  );
  await assertFails(
    getDoc(
      doc(env.authenticatedContext("owner").firestore(), "documents/test"),
    ),
  );
  await assertFails(
    getDoc(
      doc(
        env.authenticatedContext("owner", { admin: true }).firestore(),
        "documents/test",
      ),
    ),
  );
  const owner = env.authenticatedContext("owner", ownerMfaClaims);
  await assertSucceeds(getDoc(doc(owner.firestore(), "documents/test")));
  await assertFails(
    setDoc(doc(owner.firestore(), "documents/test"), {
      ownerUid: "owner",
      published: true,
    }),
  );
});
test("private storage denies anonymous, other-user and direct browser uploads", async () => {
  await assertFails(
    getBytes(
      ref(
        env.unauthenticatedContext().storage(),
        "private/owner/test/file.png",
      ),
    ),
  );
  await assertFails(
    getBytes(
      ref(
        env.authenticatedContext("other", { admin: true }).storage(),
        "private/owner/test/file.png",
      ),
    ),
  );
  const owner = env.authenticatedContext("owner", ownerMfaClaims);
  await assertSucceeds(
    getBytes(ref(owner.storage(), "private/owner/test/file.png")),
  );
  await assertFails(
    uploadBytes(
      ref(owner.storage(), "private/owner/test/evil.html"),
      new Uint8Array([1]),
    ),
  );
  await assertFails(
    getBytes(
      ref(env.unauthenticatedContext().storage(), "published/test/file.png"),
    ),
  );
});

test("achievement settings cannot be read or changed directly from a browser", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "siteSettings/achievements"), {
      ownerUid: "owner",
      featuredIds: ["4"],
    });
  });
  for (const context of [
    env.unauthenticatedContext(),
    env.authenticatedContext("owner", ownerMfaClaims),
  ]) {
    await assertFails(
      getDoc(doc(context.firestore(), "siteSettings/achievements")),
    );
    await assertFails(
      setDoc(doc(context.firestore(), "siteSettings/achievements"), {
        featuredIds: ["5"],
      }),
    );
  }
});

test("content collections are Admin SDK only: no browser reads or writes", async () => {
  const paths = [
    "articles/hello-world",
    "publicArticles/hello-world",
    "siteSettings/public",
  ];
  await env.withSecurityRulesDisabled(async (ctx) => {
    for (const path of paths)
      await setDoc(doc(ctx.firestore(), path), {
        ownerUid: "owner",
        title: "Hello",
      });
  });
  for (const context of [
    env.unauthenticatedContext(),
    env.authenticatedContext("other", { admin: true }),
    env.authenticatedContext("owner", ownerMfaClaims),
  ])
    for (const path of paths) {
      await assertFails(getDoc(doc(context.firestore(), path)));
      await assertFails(
        setDoc(doc(context.firestore(), path), {
          ownerUid: "owner",
          title: "Changed",
        }),
      );
    }
});
