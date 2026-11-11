import { z } from "zod";
import { SECTION_ICONS } from "./icons";
import { isHttpsUrl } from "./safe-url";

/** The one URL type for admin-editable links: absolute https with a host (no javascript:, data:, http:). */
export const httpsUrl = z.string().max(500).refine(isHttpsUrl, "Use an HTTPS link");

// Content schemas. Every record from Git or from a Firestore export passes these before it reaches a page.

/**
 * Hard rule 1 (nothing undisclosed), as data. Only the last three may be public.
 * - unresolved: not yet decided. The default for a draft; blocks CI and the build.
 * - disclosed: the program's rules allow a public write-up.
 * - no-vulnerability: a write-up, tool or note that describes no finding.
 * - redacted: a finding described without program or target details.
 */
export const DISCLOSURE_STATES = ["unresolved", "disclosed", "no-vulnerability", "redacted"] as const;
export type Disclosure = (typeof DISCLOSURE_STATES)[number];

export const ArticleSchema = z
  .object({
    title: z.string().min(1).max(160),
    description: z.string().min(1).max(300),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    status: z.enum(["draft", "published", "archived"]),
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
    // Set on entries written as Markdown in Git (EntrySchema); absent on older Firestore records.
    disclosure: z.enum(DISCLOSURE_STATES).optional(),
    series: z.string().max(50).optional(),
    position: z.number().int().min(1).optional(),
  })
  .superRefine((a, ctx) => {
    if ((a.status === "published" || a.status === "archived") && (!a.publishedAt || new Date(a.publishedAt) > new Date()))
      ctx.addIssue({ code: "custom", message: "Published articles need a non-future publication date" });
    if (a.updatedAt && a.publishedAt && a.updatedAt < a.publishedAt)
      ctx.addIssue({ code: "custom", message: "Update cannot precede publication" });
  });
export type ArticleMeta = z.infer<typeof ArticleSchema>;

const entryId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, digits and hyphens");
/**
 * The frontmatter of a Lab entry written as Markdown in Git (content/articles/<slug>.md). The slug is
 * the file name, so it cannot disagree with it. Unknown keys fail, so a typo never goes unnoticed.
 */
export const EntrySchema = z
  .strictObject({
    title: z.string().min(1).max(160),
    date: z.iso.date(),
    updated: z.iso.date().optional(),
    section: entryId.max(50),
    category: entryId.max(50).optional(),
    tags: z.array(z.string().max(40).regex(/[a-z0-9]/i, "A tag needs a letter or digit")).max(12).default([]),
    summary: z.string().min(1).max(300),
    series: entryId.max(50).optional(),
    position: z.number().int().min(1).max(99).optional(),
    status: z.enum(["draft", "published", "archived"]),
    disclosure: z.enum(DISCLOSURE_STATES),
    thumbnail: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*\.(webp|png|jpg)$/)
      .optional(),
    featured: z.boolean().default(false),
  })
  .superRefine((e, ctx) => {
    if (e.status !== "draft" && new Date(e.date) > new Date())
      ctx.addIssue({ code: "custom", path: ["date"], message: "Published entries need a non-future date" });
    if (e.updated && e.updated < e.date) ctx.addIssue({ code: "custom", path: ["updated"], message: "Update cannot precede the date" });
    if (!e.series !== !e.position)
      ctx.addIssue({ code: "custom", path: [e.series ? "position" : "series"], message: "Give both series and position, or neither" });
  });
export type Entry = z.infer<typeof EntrySchema>;
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

/** When a Thought may be said: any time, at night, with Storm near Asad, or in the Steins Gate worldline. */
export const THOUGHT_CONTEXTS = ["general", "night", "storm", "steins-gate"] as const;
export type ThoughtContext = (typeof THOUGHT_CONTEXTS)[number];
/** Asad's Thoughts: the one-liners he now and then says in the homepage room (siteSettings/thoughts). */
export const ThoughtsSchema = z
  .object({
    thoughts: z
      .array(z.object({ id: slugId, text: z.string().trim().min(1).max(80), enabled: z.boolean(), context: z.enum(THOUGHT_CONTEXTS) }))
      .max(60)
      .refine((t) => unique(t.map((x) => x.id)), "Thought ids must be unique"),
    featured: slugId.nullable(),
  })
  .refine((v) => v.featured === null || v.thoughts.some((t) => t.id === v.featured), "The featured Thought must be one of the list");
export type Thoughts = z.infer<typeof ThoughtsSchema>;
export type Thought = Thoughts["thoughts"][number];

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
      url: httpsUrl,
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
  resumeUrl: z.union([z.literal(""), httpsUrl]),
  aboutBody: z.string().max(8000),
  // the line under each page's title in a link preview (Open Graph, Twitter, search)
  shareHome: z.string().max(200),
  shareAbout: z.string().max(200),
  shareLab: z.string().max(200),
  shareWorkbench: z.string().max(200),
  shareExperience: z.string().max(200),
  shareAchievements: z.string().max(200),
});
export type SiteCopy = z.infer<typeof SiteCopySchema>;

export const AchievementSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(["certification", "badge", "award"]),
  title: z.string().min(1).max(200),
  issuer: z.string().min(1).max(160),
  link: httpsUrl,
  earnedAt: z.iso.date().optional(),
});
export type Achievement = z.infer<typeof AchievementSchema>;

/** The achievements and the ones pinned to Experience (siteSettings/achievements). */
export const AchievementsSchema = z
  .object({ achievements: z.array(AchievementSchema).max(100), featuredIds: z.array(z.string()).max(6) })
  .strict()
  .refine((v) => new Set(v.achievements.map((a) => a.id)).size === v.achievements.length, "Achievement ids must be unique")
  .refine((v) => new Set(v.featuredIds).size === v.featuredIds.length, "Choose each achievement once")
  .refine((v) => v.featuredIds.every((id) => v.achievements.some((a) => a.id === id)), "Unknown achievement");
export type Achievements = z.infer<typeof AchievementsSchema>;

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
  degreeLink: httpsUrl,
  graduationDate: z.string(),
  isGraduated: z.boolean(),
});
export type Education = z.infer<typeof EducationSchema>;

export const SkillsSchema = z.object({
  skills: z.array(z.object({ category: z.string(), items: z.string() })),
});

/** The Experience page: roles (oldest first), education and skills (siteSettings/experience). */
export const ExperienceSchema = z.object({
  work: z.array(RoleSchema),
  education: z.array(EducationSchema),
  skills: SkillsSchema.shape.skills,
});
export type Experience = z.infer<typeof ExperienceSchema>;
