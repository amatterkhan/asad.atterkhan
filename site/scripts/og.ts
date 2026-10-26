import fs from "node:fs/promises";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import type { Article } from "../src/lib/schemas";

// Open Graph images, drawn as the Next.js `ImageResponse` versions were (satori + resvg, the
// Geist font next/og falls back to), but at build time: /opengraph-image.png and
// /lab/<slug>/opengraph-image.png.
type Server = { getArticles(): Promise<Article[]> };
type Write = (file: string, body: Buffer) => Promise<void>;
type El = { type: string; props: { style?: Record<string, unknown>; children?: unknown } };
const div = (style: Record<string, unknown>, children: unknown): El => ({ type: "div", props: { style, children } });

export async function ogImages(server: Server, root: string, dist: string, write: Write) {
  const font = await fs.readFile(path.join(root, "scripts/assets/Geist-Regular.ttf"));
  const png = async (tree: El) => {
    const svg = await satori(tree as never, { width: 1200, height: 630, fonts: [{ name: "Geist", data: font, weight: 400, style: "normal" }] });
    return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng());
  };
  const frame = { display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: 80, background: "#151827", color: "#e3e3ef", fontFamily: "Geist" };
  await write(
    path.join(dist, "opengraph-image.png"),
    await png(
      div(frame, [
        div({ color: "#accfb8", fontSize: 26 }, "asad@atterkhan ~"),
        div({ display: "flex", flexDirection: "column", gap: 20 }, [
          div({ fontSize: 64 }, "Hey, I'm Asad."),
          div({ fontSize: 30, color: "#a7abc5" }, "Security, software, and the notes along the way."),
        ]),
        div({ color: "#c3b2ed", fontSize: 25 }, "ASAD.EXE · asad.atterkhan.com"),
      ]),
    ),
  );
  for (const a of await server.getArticles())
    await write(
      path.join(dist, "lab", a.slug, "opengraph-image.png"),
      await png(
        div(frame, [
          div({ color: "#accfb8", fontSize: 28 }, "~/lab"),
          div({ fontSize: 56 }, a.title),
          div({ color: "#c3b2ed", fontSize: 26 }, "Asad Atterkhan · The Lab"),
        ]),
      ),
    );
}
