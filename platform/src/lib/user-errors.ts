export const USER_ERRORS = {
  sign_in_required: "Sign in to continue.",
  sign_in_failed: "We couldn’t sign you in. Please try again.",
  sign_in_expired: "Your sign-in session expired. Sign in again to continue.",
  verify_code: "That code didn’t work. Enter the latest code from your authenticator and try again.",
  verification_expired: "This verification session expired. Start sign-in again.",
  popup_blocked: "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.",
  sign_in_cancelled: "Sign-in was cancelled. Try again when you’re ready.",
  authenticator_required: "Set up your authenticator before continuing.",
  authenticator_setup_failed: "We couldn’t set up your authenticator. Please try again.",
  network_error: "We couldn’t connect. Check your connection and try again.",
  rate_limited: "Too many attempts. Wait a while before trying again.",
  access_denied: "You don’t have access to this page.",
  service_unavailable: "This feature is temporarily unavailable. Please try again later.",
  operation_failed: "Something went wrong. Please try again.",
  invalid_input: "Check the information you entered and try again.",
  not_found: "This item is no longer available.",
  conflict: "This item changed. Reload it before trying again.",
  content_too_large: "The content is too large. Try a smaller file or shorter text.",
  unsupported_file: "Choose a PDF, PNG, JPEG or WebP file.",
  invalid_file: "Choose a non-empty file no larger than 8 MiB.",
  missing_file: "Choose a file to upload.",
  reauthenticate: "Sign in again to confirm this action.",
  empty_article: "Write some content before publishing this article.",
  address_taken: "An article with that address already exists. Choose another address.",
  address_locked: "An article’s address can’t be changed after it is created.",
  unpublish_first: "Unpublish this article before deleting it.",
  not_published: "This article is not published.",
  not_ready: "This item isn’t ready to publish. Review it and try again.",
} as const;

export type UserErrorCode = keyof typeof USER_ERRORS;

export class UserFacingError extends Error {
  constructor(public readonly code: UserErrorCode) {
    super(USER_ERRORS[code]);
    this.name = "UserFacingError";
  }
}

const AUTH_CODES: Record<string, UserErrorCode> = {
  "auth/invalid-verification-code": "verify_code",
  "auth/missing-verification-code": "verify_code",
  "auth/code-expired": "verify_code",
  "auth/invalid-multi-factor-session": "verification_expired",
  "auth/missing-multi-factor-session": "verification_expired",
  "auth/session-expired": "verification_expired",
  "auth/requires-recent-login": "reauthenticate",
  "auth/user-token-expired": "sign_in_expired",
  "auth/invalid-user-token": "sign_in_expired",
  "auth/popup-blocked": "popup_blocked",
  "auth/popup-closed-by-user": "sign_in_cancelled",
  "auth/cancelled-popup-request": "sign_in_cancelled",
  "auth/network-request-failed": "network_error",
  "auth/too-many-requests": "rate_limited",
  // Identical responses avoid revealing whether an account exists or is disabled.
  "auth/user-disabled": "sign_in_failed",
  "auth/user-not-found": "sign_in_failed",
  "auth/wrong-password": "sign_in_failed",
  "auth/invalid-email": "sign_in_failed",
  "auth/invalid-credential": "sign_in_failed",
  "auth/email-already-in-use": "sign_in_failed",
  "auth/account-exists-with-different-credential": "sign_in_failed",
  "auth/admin-restricted-operation": "sign_in_failed",
  "auth/operation-not-allowed": "sign_in_failed",
  "auth/internal-error": "service_unavailable",
  "auth/invalid-api-key": "service_unavailable",
  "auth/app-not-authorized": "service_unavailable",
  "auth/unauthorized-domain": "service_unavailable",
  "auth/configuration-not-found": "service_unavailable",
  "storage/unauthenticated": "sign_in_required",
  "storage/unauthorized": "access_denied",
  "storage/quota-exceeded": "service_unavailable",
  "permission-denied": "access_denied",
};

export function userErrorMessage(error: unknown, fallback: UserErrorCode = "operation_failed"): string {
  if (error instanceof UserFacingError) return USER_ERRORS[error.code];
  if (error && typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && Object.hasOwn(AUTH_CODES, code))
      return USER_ERRORS[AUTH_CODES[code]];
  }
  if (error instanceof TypeError && /^(Failed to fetch|NetworkError when attempting to fetch resource\.|Load failed)$/.test(error.message))
    return USER_ERRORS.network_error;
  // Never display an unknown exception's message, stack, response body or provider data.
  return USER_ERRORS[fallback];
}

const STATUS_CODES: Record<number, UserErrorCode> = {
  400: "invalid_input", 401: "sign_in_required", 403: "access_denied",
  404: "not_found", 409: "conflict", 413: "content_too_large",
  415: "unsupported_file", 429: "rate_limited", 503: "service_unavailable",
};

const EXPECTED_DETAILS: Record<string, UserErrorCode> = {
  "Your session has expired. Sign in again.": "sign_in_expired",
  "Sign in again before publishing or archiving": "reauthenticate",
  "Choose a non-empty file up to 8 MiB": "invalid_file",
  "Write the article before publishing it": "empty_article",
  "An article with this slug already exists": "address_taken",
  "The slug cannot be changed": "address_locked",
  "Unpublish this article before deleting it": "unpublish_first",
  "This article is not published": "not_published",
  "This document is not ready to publish": "not_ready",
};

export function httpErrorCode(status: number, detail?: string): UserErrorCode {
  if (detail && Object.hasOwn(EXPECTED_DETAILS, detail)) return EXPECTED_DETAILS[detail];
  return STATUS_CODES[status] || "operation_failed";
}

export function apiResponseError(status: number, body?: unknown): UserFacingError {
  const code = body && typeof body === "object" ? (body as { code?: unknown }).code : undefined;
  return new UserFacingError(
    typeof code === "string" && Object.hasOwn(USER_ERRORS, code)
      ? code as UserErrorCode
      : httpErrorCode(status),
  );
}
