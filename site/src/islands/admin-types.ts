export type SiteCopyForm = Record<string, string>;
export type Summary = {
  slug: string;
  title: string;
  description: string;
  status: "draft" | "published";
  tags: string[];
  section?: string;
  category?: string;
  thumbnail?: string;
  featured: boolean;
  publishedAt?: string;
  modifiedAt: string;
  version: number;
  publishedVersion?: number;
};
export type Draft = Summary & { body: string };
export type Outfit = { id: string; name: string; description: string; createdAt: string; preview: string };
export type WardrobeState = { outfits: Outfit[]; defaultOutfit: string; activeOutfit: string; updatedAt?: string };
export type LabCategory = { id: string; name: string };
export type LabSection = { id: string; name: string; blurb: string; icon: string; categories: LabCategory[] };
export type LabMap = { sections: LabSection[]; updatedAt?: string };
export type Api = <T>(path: string, init?: RequestInit) => Promise<T>;
/** The signed-in fetch behind Api, for uploads and images (no JSON). */
export type Authed = (path: string, init?: RequestInit) => Promise<Response>;
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
export type ThoughtContext = "general" | "night" | "storm" | "steins-gate";
export type ThoughtLine = { id: string; text: string; enabled: boolean; context: ThoughtContext };
export type ThoughtsState = { thoughts: ThoughtLine[]; featured: string | null; updatedAt?: string };
