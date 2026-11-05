/** True for an absolute https:// URL with a host. Used by the content schemas and to guard public `:href` bindings. */
export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string" || !/^https:\/\/[^/\\?#@\s]/.test(value)) return false; // the WHATWG parser would read "https:///x" as host "x"
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname !== "" && !u.username && !u.password;
  } catch {
    return false;
  }
}

/** The URL when it is a safe https link, otherwise undefined (bind `:href` to this). */
export function safeHref(value: unknown): string | undefined {
  return isHttpsUrl(value) ? value : undefined;
}
