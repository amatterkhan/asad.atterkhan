import { z } from "zod";

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
    category: z.string().max(50).optional(),
    featured: z.boolean().default(false),
  })
  .superRefine((a, ctx) => {
    if (a.status === "published" && (!a.publishedAt || new Date(a.publishedAt) > new Date()))
      ctx.addIssue({ code: "custom", message: "Published articles need a non-future publication date" });
    if (a.updatedAt && a.publishedAt && a.updatedAt < a.publishedAt)
      ctx.addIssue({ code: "custom", message: "Update cannot precede publication" });
  });
export type ArticleMeta = z.infer<typeof ArticleSchema>;
export type Article = ArticleMeta & { body: string; readingMinutes: number; searchText: string };

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
