import fs from "node:fs/promises";
import path from "node:path";
export const dynamic = "force-dynamic";
export async function GET() {
  if (process.env.NODE_ENV !== "development")
    return new Response("Not found", { status: 404 });
  return new Response(
    await fs.readFile(
      path.join(process.cwd(), "node_modules/axe-core/axe.min.js"),
      "utf8",
    ),
    {
      headers: {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
