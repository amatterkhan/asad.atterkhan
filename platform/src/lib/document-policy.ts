import { z } from "zod";
export const MAX_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_UPLOADS_PER_DAY = 25;
export const MetadataSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  })
  .strict();
export const IdSchema = z.uuid();
export const PublicationSchema = z
  .object({
    action: z.enum(["publish", "unpublish"]),
    confirm: z.literal(true),
  })
  .strict();
export const safeName = (name: string) =>
  name
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(0, 120) || "document";
export const allowedTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
export type DocumentRecord = {
  id: string;
  ownerUid: string;
  title: string;
  tags: string[];
  filename: string;
  mime: string;
  size: number;
  sha256: string;
  privatePath: string;
  publicPath?: string;
  published: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};
export function canPublish(record: DocumentRecord, uid: string) {
  return (
    record.ownerUid === uid &&
    !record.archived &&
    !record.published &&
    record.privatePath.startsWith(`private/${uid}/${record.id}/`) &&
    allowedTypes.has(record.mime) &&
    record.size > 0 &&
    record.size <= MAX_FILE_BYTES
  );
}
