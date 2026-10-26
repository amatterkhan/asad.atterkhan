import { test } from "node:test";
import assert from "node:assert/strict";
import { apiResponseError, httpErrorCode, USER_ERRORS, UserFacingError, userErrorMessage } from "../src/lib/user-errors";

test("invalid authenticator codes get actionable text without provider details", () => {
  const text = userErrorMessage({ code: "auth/invalid-verification-code", message: "Firebase: Error (auth/invalid-verification-code).", customData: { secret: "private-key" } });
  assert.equal(text, USER_ERRORS.verify_code);
  assert.match(text, /latest code/);
  assert.doesNotMatch(text, /Firebase|auth\/|private-key/);
});

test("sign-in failures do not disclose account existence or account state", () => {
  const codes = ["auth/user-not-found", "auth/user-disabled", "auth/wrong-password", "auth/invalid-email", "auth/invalid-credential", "auth/email-already-in-use", "auth/account-exists-with-different-credential", "auth/admin-restricted-operation"];
  for (const code of codes) assert.equal(userErrorMessage({ code }), USER_ERRORS.sign_in_failed);
});

test("known recoverable failures explain the next action", () => {
  assert.equal(userErrorMessage({ code: "auth/popup-blocked" }), USER_ERRORS.popup_blocked);
  assert.equal(userErrorMessage({ code: "auth/invalid-multi-factor-session" }), USER_ERRORS.verification_expired);
  assert.equal(userErrorMessage({ code: "auth/too-many-requests" }), USER_ERRORS.rate_limited);
  assert.equal(userErrorMessage(new TypeError("Failed to fetch")), USER_ERRORS.network_error);
  assert.equal(userErrorMessage(new UserFacingError("missing_file")), USER_ERRORS.missing_file);
});

test("unknown errors and unexpected API bodies cannot expose internal text", () => {
  const secret = "database password=secret /private/internal-file token=private-token";
  for (const error of [new Error(secret), secret, { code: "auth/unknown", message: secret }, null, { code: "__proto__" }])
    assert.equal(userErrorMessage(error), USER_ERRORS.operation_failed);
  for (const code of ["__proto__", "constructor", "toString", "auth/internal-error", secret]) {
    const error = apiResponseError(500, { code, error: secret, stack: secret });
    assert.equal(userErrorMessage(error), USER_ERRORS.operation_failed);
  }
});

test("API messages come from the public catalog, with HTTP status fallbacks", () => {
  assert.equal(userErrorMessage(apiResponseError(403, { error: "UID owner-internal does not match" })), USER_ERRORS.access_denied);
  assert.equal(userErrorMessage(apiResponseError(409, { code: "unpublish_first", error: "ignore this untrusted text" })), USER_ERRORS.unpublish_first);
  assert.equal(httpErrorCode(400, "Choose a non-empty file up to 8 MiB"), "invalid_file");
  assert.equal(httpErrorCode(409, "An article with this slug already exists"), "address_taken");
  assert.equal(httpErrorCode(500, "Firestore failure with private details"), "operation_failed");
});
