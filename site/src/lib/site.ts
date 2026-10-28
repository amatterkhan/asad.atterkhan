export const site = {
  name: "Asad Atterkhan",
  title: "Asad.exe",
  url: (import.meta.env?.SITE_URL as string | undefined) || globalThis.process?.env?.SITE_URL || "https://asad.atterkhan.com",
  /** The motto: the site's description and the footer's sign-off. Never explained. */
  description: "Somewhere between cloud nine and layer seven.",
  email: "contact@asad.atterkhan.com",
  github: "https://github.com/amatterkhan",
  linkedin: "https://linkedin.com/in/amatterkhan",
};
// Each page's fixed line under its heading. Deliberately code, not admin-editable copy, so they
// never drift or rotate (Thoughts are the lines that change).
export const subtitles = {
  home: "Human, allegedly.",
  about: "Still figuring out the source code.",
  lab: "Running experiments on reality.",
  notFound: "Lost in thought. Found in the logs.",
};
export const date = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
export const xml = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
/** JSON for an inline <script> or attribute: no "</script>" breakouts. */
export const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
