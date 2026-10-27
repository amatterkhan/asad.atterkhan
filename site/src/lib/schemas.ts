import { z } from "zod";
import { SECTION_ICONS } from "./icons";

// Content schemas. Every record from Git or from a Firestore export passes these before it reaches a page.

export const ArticleSchema = z
  .object({
    title: z.string().min(1).max(160),
    description: z.string().min(1).max(300),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    status: z.enum(["draft", "published"]),
    publishedAt: z.iso.date().optional(),
    updatedAt: z.iso.date().optional(),
    tags: z.array(z.string().min(1).max(40)).max(12).default([]),
    // A Lab section id and a category id inside it (content/lab.json). Unknown ids fall back at build
    // time (see resolveShelf), so editing the Lab map never breaks a rebuild.
    section: z.string().max(50).optional(),
    category: z.string().max(50).optional(),
    // A 16:9 image file: content/thumbnails/<file> from Git, or a thumbnails/<sha256>.<ext> export.
    thumbnail: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*\.(webp|png|jpg)$/)
      .optional(),
    featured: z.boolean().default(false),
  })
  .superRefine((a, ctx) => {
    if (a.status === "published" && (!a.publishedAt || new Date(a.publishedAt) > new Date()))
      ctx.addIssue({ code: "custom", message: "Published articles need a non-future publication date" });
    if (a.updatedAt && a.publishedAt && a.updatedAt < a.publishedAt)
      ctx.addIssue({ code: "custom", message: "Update cannot precede publication" });
  });
export type ArticleMeta = z.infer<typeof ArticleSchema>;
export type Article = ArticleMeta & {
  body: string;
  readingMinutes: number;
  searchText: string;
  /** Set by getArticles: the resolved Lab section/category and the public thumbnail URL. */
  shelf?: { section: string; sectionName: string; icon: LabSection["icon"]; category?: string; categoryName?: string };
  thumb?: string;
};

const slugId = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(40);
const unique = (ids: string[]) => new Set(ids).size === ids.length;
/** The Lab map: sections (Writeups, Tooling…) and the categories inside each. The last section also
 *  holds articles whose section is missing or no longer exists. */
export const LabSchema = z.object({
  sections: z
    .array(
      z.object({
        id: slugId,
        name: z.string().min(1).max(40),
        blurb: z.string().max(200),
        icon: z.enum(SECTION_ICONS),
        categories: z
          .array(z.object({ id: slugId, name: z.string().min(1).max(40) }))
          .max(24)
          .refine((c) => unique(c.map((x) => x.id)), "Category ids must be unique within a section"),
      }),
    )
    .min(1)
    .max(12)
    .refine((s) => unique(s.map((x) => x.id)), "Section ids must be unique"),
});
export type Lab = z.infer<typeof LabSchema>;
export type LabSection = Lab["sections"][number];

export const ProjectSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string(),
  date: z.iso.date(),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  featured: z.boolean(),
  writeup: z
    .string()
    .regex(/^[a-z0-9-]+\.md$/)
    .optional(),
  writeupBody: z.string().optional(),
  links: z.array(
    z.object({
      type: z.string(),
      url: z.url().refine((u) => u.startsWith("https://")),
    }),
  ),
});
export type Project = z.infer<typeof ProjectSchema>;

export const SiteCopySchema = z.object({
  role: z.string().max(600),
  company: z.string().max(600),
  location: z.string().max(600),
  heroTitle: z.string().max(600),
  heroLede: z.string().max(600),
  heroBody: z.string().max(600),
  roomHint: z.string().max(600),
  closingTitle: z.string().max(600),
  closingBody: z.string().max(600),
  labIntro: z.string().max(600),
  workbenchIntro: z.string().max(600),
  experienceIntro: z.string().max(600),
  achievementsIntro: z.string().max(600),
  aboutBody: z.string().max(8000),
});
export type SiteCopy = z.infer<typeof SiteCopySchema>;

export const AchievementSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(["certification", "badge", "award"]),
  title: z.string().min(1).max(200),
  issuer: z.string().min(1).max(160),
  link: z.url().refine((url) => url.startsWith("https://"), "Use an HTTPS credential link"),
  earnedAt: z.iso.date().optional(),
});
export type Achievement = z.infer<typeof AchievementSchema>;

export const featuredSchema = (achievements: Achievement[]) =>
  z
    .object({
      featuredIds: z
        .array(z.string())
        .max(6)
        .refine((ids) => new Set(ids).size === ids.length, "Choose each achievement once")
        .refine((ids) => ids.every((id) => achievements.some((a) => a.id === id)), "Unknown achievement"),
    })
    .strict();

export const RoleSchema = z.object({
  id: z.number(),
  title: z.string(),
  company: z.string(),
  dateRange: z.string(),
  responsibilities: z.array(z.string()).min(1),
  promotionFrom: z.number().optional(),
  isCurrent: z.boolean().optional(),
});
export type Role = z.infer<typeof RoleSchema>;

export const EducationSchema = z.object({
  degree: z.string(),
  field: z.string(),
  university: z.string(),
  classification: z.string(),
  degreeLink: z.url(),
  graduationDate: z.string(),
  isGraduated: z.boolean(),
});
export type Education = z.infer<typeof EducationSchema>;

export const SkillsSchema = z.object({
  skills: z.array(z.object({ category: z.string(), items: z.string() })),
});
