export const site = {
  name: "Asad Atterkhan",
  title: "ASAD.EXE",
  url: process.env.SITE_URL || "https://asad.atterkhan.com",
  description:
    "Security, software, cloud, and the notes along the way. A personal technical journal by Asad Atterkhan.",
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
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
