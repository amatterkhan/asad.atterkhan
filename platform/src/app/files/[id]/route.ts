import { publicFile } from "@/lib/public-file";
export const dynamic = "force-dynamic";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return publicFile((await params).id);
}
