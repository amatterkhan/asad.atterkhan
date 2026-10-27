export const site = {
  name: "Asad Atterkhan",
  title: "ASAD.EXE",
  url: (import.meta.env?.SITE_URL as string | undefined) || globalThis.process?.env?.SITE_URL || "https://asad.atterkhan.com",
  description:
    "Programmer, hacker and security person. I build things, break them, and write down what I learn.",
  email: "contact@asad.atterkhan.com",
  github: "https://github.com/amatterkhan",
  linkedin: "https://linkedin.com/in/amatterkhan",
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
