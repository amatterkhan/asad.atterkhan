export type SiteCopyForm = Record<string, string>;
export type Summary = {
  slug: string;
  title: string;
  description: string;
  status: "draft" | "published";
  tags: string[];
  category?: string;
  featured: boolean;
  publishedAt?: string;
  modifiedAt: string;
  version: number;
  publishedVersion?: number;
};
export type Draft = Summary & { body: string };
export type Outfit = { id: string; name: string; description: string; createdAt: string; preview: string };
export type WardrobeState = { outfits: Outfit[]; defaultOutfit: string; activeOutfit: string; updatedAt?: string };
export type Api = <T>(path: string, init?: RequestInit) => Promise<T>;
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
