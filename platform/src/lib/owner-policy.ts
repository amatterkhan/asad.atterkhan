type OwnerToken = {
  uid: string;
  admin?: unknown;
  email_verified?: boolean;
  firebase?: { sign_in_provider?: string; sign_in_second_factor?: string };
};

export function ownerAccessError(
  token: OwnerToken,
  ownerUid: string | undefined,
  emulator: boolean,
): string | null {
  if (!ownerUid || token.uid !== ownerUid || token.admin !== true)
    return "Owner access required";
  if (!emulator) {
    if (token.firebase?.sign_in_provider !== "google.com" || !token.email_verified)
      return "Sign in with your verified owner Google account";
    if (token.firebase?.sign_in_second_factor !== "totp")
      return "A second authentication factor is required";
  }
  return null;
}
