import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canPublish,
  MetadataSchema,
  PublicationSchema,
  safeName,
  type DocumentRecord,
} from "../src/lib/document-policy";
const record: DocumentRecord = {
  id: "5fceaf3a-11c9-45a2-8d5b-51a373e2cd25",
  ownerUid: "owner",
  title: "Reviewed file",
  tags: [],
  filename: "file.pdf",
  mime: "application/pdf",
  size: 100,
  sha256: "a".repeat(64),
  privatePath: "private/owner/5fceaf3a-11c9-45a2-8d5b-51a373e2cd25/hash.pdf",
  published: false,
  archived: false,
  createdAt: "2026-10-25",
  updatedAt: "2026-10-25",
};
test("publication rejects other users, archive, prepublished files and path confusion", () => {
  assert.equal(canPublish(record, "owner"), true);
  assert.equal(canPublish(record, "intruder"), false);
  assert.equal(canPublish({ ...record, archived: true }, "owner"), false);
  assert.equal(canPublish({ ...record, published: true }, "owner"), false);
  assert.equal(
    canPublish({ ...record, privatePath: "private/other/file.pdf" }, "owner"),
    false,
  );
  assert.equal(canPublish({ ...record, mime: "text/html" }, "owner"), false);
});
test("public action needs explicit confirmation and metadata cannot set privileges", () => {
  assert.equal(
    PublicationSchema.safeParse({ action: "publish", confirm: false }).success,
    false,
  );
  assert.equal(
    MetadataSchema.safeParse({ title: "Valid", tags: [], published: true })
      .success,
    false,
  );
  assert.equal(
    MetadataSchema.safeParse({ title: "x".repeat(161) }).success,
    false,
  );
  assert.equal(safeName('"../../a\r\nX-Header.html').includes("\n"), false);
});
