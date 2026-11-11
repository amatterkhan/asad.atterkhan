// Where Asad can be found: the profile links shown on Home and in the menu. The owner adds them in
// the console (siteSettings/profiles); nothing renders while the list is empty. A link's icon is
// recognised from its host, so a famous platform needs no setup. The glyphs are the site's own pixel
// icons, not the platforms' logos.
import type { IconName } from "./icons";
import type { Profile } from "./schemas";

export type ProfileView = { id: string; href: string; label: string; icon: IconName; external: boolean };

/** Known platforms by host (the domain and its subdomains). */
const PLATFORMS: readonly (readonly [domain: string, label: string, icon: IconName])[] = [
  ["github.com", "GitHub", "github"],
  ["gitlab.com", "GitLab", "code"],
  ["linkedin.com", "LinkedIn", "linkedin"],
  ["hackthebox.com", "Hack The Box", "terminal"],
  ["hackthebox.eu", "Hack The Box", "terminal"],
  ["tryhackme.com", "TryHackMe", "flag"],
  ["hackerone.com", "HackerOne", "bug"],
  ["bugcrowd.com", "Bugcrowd", "shield"],
  ["intigriti.com", "Intigriti", "bug"],
  ["yeswehack.com", "YesWeHack", "bug"],
  ["portswigger.net", "PortSwigger Academy", "book"],
  ["credly.com", "Credly", "medal"],
  ["medium.com", "Medium", "notebook"],
  ["substack.com", "Substack", "notebook"],
  ["dev.to", "DEV", "notebook"],
];

const hostOf = (value: string): string => {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** The platform a link belongs to, if it is a well-known one. */
export function recognise(value: string): { label: string; icon: IconName } | undefined {
  const host = hostOf(value);
  const hit = PLATFORMS.find(([domain]) => host === domain || host.endsWith(`.${domain}`));
  return hit && { label: hit[1], icon: hit[2] };
}

/** What the page renders for one profile: where it goes, its text, its icon. */
export function profileView(p: Profile): ProfileView {
  if (p.kind === "email") return { id: p.id, href: `mailto:${p.value}`, label: p.label || "Email", icon: "mail", external: false };
  const known = recognise(p.value);
  const fallback = p.kind === "website" ? "Website" : hostOf(p.value);
  return {
    id: p.id,
    href: p.value,
    label: p.label || known?.label || fallback,
    icon: known?.icon ?? "globe",
    external: true,
  };
}

/** Links for search engines' "same as" list: profiles that are web pages, not addresses. */
export const sameAs = (profiles: readonly Profile[]) => profiles.filter((p) => p.kind !== "email").map((p) => p.value);
