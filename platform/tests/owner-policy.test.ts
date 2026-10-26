import { test } from "node:test";
import assert from "node:assert/strict";
import { ownerAccessError } from "../src/lib/owner-policy";

const owner = {
  uid: "owner",
  admin: true,
  email_verified: true,
  firebase: { sign_in_provider: "google.com", sign_in_second_factor: "totp" },
};

test("real owner access requires the exact UID, admin claim, verified Google identity and TOTP", () => {
  assert.equal(ownerAccessError(owner, "owner", false), null);
  for (const token of [
    { ...owner, uid: "other" },
    { ...owner, admin: false },
    { ...owner, admin: "true" },
    { ...owner, email_verified: false },
    { ...owner, firebase: { ...owner.firebase, sign_in_provider: "password" } },
    { ...owner, firebase: { sign_in_provider: "google.com" } },
    { ...owner, firebase: { ...owner.firebase, sign_in_second_factor: "phone" } },
  ]) assert.ok(ownerAccessError(token, "owner", false));
  assert.ok(ownerAccessError(owner, undefined, false));
});

test("emulator authentication still requires the UID and admin claim", () => {
  const emulated = { uid: "owner", admin: true };
  assert.equal(ownerAccessError(emulated, "owner", true), null);
  assert.ok(ownerAccessError(emulated, "other", true));
  assert.ok(ownerAccessError({ ...emulated, admin: false }, "owner", true));
});
