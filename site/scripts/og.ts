import fs from "node:fs/promises";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import type { Article } from "../src/lib/schemas";

// Open Graph images, built at build time. /opengraph-image.png is the homepage room in daylight,
// drawn from the same layers and sprite sheets (first frame) with nearest-neighbour scaling, so a
// shared link shows the pixel art. /lab/<slug>/opengraph-image.png is a text card (satori + resvg,
// the Geist font next/og falls back to).
type Server = { getArticles(): Promise<Article[]>; getActiveOutfit(): Promise<string> };
type Write = (file: string, body: Buffer) => Promise<void>;
type El = { type: string; props: { style?: Record<string, unknown>; children?: unknown } };
const div = (style: Record<string, unknown>, children: unknown): El => ({ type: "div", props: { style, children } });

export async function ogImages(server: Server, root: string, dist: string, write: Write) {
  const font = await fs.readFile(path.join(root, "scripts/assets/Geist-Regular.ttf"));
  const png = async (tree: El) => {
    const svg = await satori(tree as never, { width: 1200, height: 630, fonts: [{ name: "Geist", data: font, weight: 400, style: "normal" }] });
    return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng());
  };
  await write(path.join(dist, "opengraph-image.png"), await roomCard(root, await server.getActiveOutfit()));
  const frame = { display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: 80, background: "#151827", color: "#e3e3ef", fontFamily: "Geist" };
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

// The room is 384x216 (16:9); 1200 wide is a 3.125x scale, 675 tall, so 45px is trimmed: a sliver of
// ceiling above the curtain rod and some empty floor. Positions match the homepage (Room.vue / app.css).
async function roomCard(root: string, outfit: string) {
  const pub = path.join(root, "public");
  const uri = async (file: string) => `data:image/png;base64,${(await fs.readFile(path.join(pub, file))).toString("base64")}`;
  const layer = async (name: string, opacity = 1) =>
    `<image href="${await uri(`room/${name}.png`)}" width="384" height="216" opacity="${opacity}" image-rendering="optimizeSpeed"/>`;
  // frame 0 of a sprite sheet: the sheet inside a one-frame viewport
  const sprite = async (file: string, frames: number, size: number, x: number, y: number, draw = size) =>
    `<svg x="${x}" y="${y}" width="${draw}" height="${draw}" viewBox="0 0 ${size} ${size}"><image href="${await uri(file)}" width="${size * frames}" height="${size}" image-rendering="optimizeSpeed"/></svg>`;
  const mug = `<svg x="332" y="110" width="17" height="14" viewBox="332 110 17 14">${await layer("room")}</svg>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 6 384 201.6">
    ${await layer("sky-day")}${await layer("clouds")}${await layer("room")}${await layer("sunbeam")}
    ${await sprite(`art/outfits/${outfit}/asad-typing.png`, 8, 128, 66, 78)}
    ${await sprite("sprites/robot-idle.png", 8, 48, 286, 80)}
    ${mug}
    ${await sprite("sprites/storm-idle.png", 8, 64, 198, 146)}
    ${await layer("glow", 0.45)}${await layer("bulb")}
  </svg>`;
  return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng());
}
