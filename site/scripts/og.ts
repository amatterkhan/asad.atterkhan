import { createHash } from "node:crypto";
import zlib from "node:zlib";
import fs from "node:fs/promises";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import type { Article } from "../src/lib/schemas";
import { NIXIE_X, NIXIE_Y, divergenceTubes, glyph, plinthWidth, readingPath, unlitFor } from "../src/lib/nixie";

// Open Graph images, built before the pages so each page can link its image with a content hash
// (?v=…; every platform caches previews by image URL). /opengraph-image.png is a postcard from the
// room: the night room at 3x, drawn from the same layers and sprite sheets (first frame), with the
// divergence meter reading 1.048596, beside a dark-green panel with the Asad.exe wordmark (Departure
// Mono, rasterised once at its native 11px into scripts/assets/og-wordmark.png). Lab articles keep
// their own text cards (satori + resvg, the Geist font next/og falls back to).
type Server = { getArticles(): Promise<Article[]>; getActiveOutfit(): Promise<string> };
type Write = (file: string, body: Buffer) => Promise<void>;
type El = { type: string; props: { style?: Record<string, unknown>; children?: unknown } };
const div = (style: Record<string, unknown>, children: unknown): El => ({ type: "div", props: { style, children } });
const hash = (b: Buffer) => createHash("sha256").update(b).digest("hex").slice(0, 10);

/** Writes every Open Graph image; returns each one's public path and content hash. */
export async function ogImages(server: Server, root: string, dist: string, write: Write) {
  const versions = new Map<string, string>();
  const out = async (publicPath: string, png: Buffer) => {
    await write(path.join(dist, publicPath), png);
    versions.set(publicPath, hash(png));
  };
  const font = await fs.readFile(path.join(root, "scripts/assets/Geist-Regular.ttf"));
  const png = async (tree: El) => {
    const svg = await satori(tree as never, { width: 1200, height: 630, fonts: [{ name: "Geist", data: font, weight: 400, style: "normal" }] });
    return Buffer.from(new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng());
  };
  await out("/opengraph-image.png", await postcard(root, await server.getActiveOutfit()));
  const frame = { display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: 80, background: "#151827", color: "#e3e3ef", fontFamily: "Geist" };
  for (const a of await server.getArticles())
    await out(
      `/lab/${a.slug}/opengraph-image.png`,
      await png(
        div(frame, [
          div({ color: "#accfb8", fontSize: 28 }, "~/lab"),
          div({ fontSize: 56 }, a.title),
          div({ color: "#c3b2ed", fontSize: 26 }, "Asad.exe · The Lab"),
        ]),
      ),
    );
  return versions;
}

// The room part is room pixels x 15-281, y 6-216 at 3x (798x630): the moonlit window, Asad, Storm,
// the chair, the bookshelf (A and S books included), the meter and the start of the desk. Positions match Room.vue / app.css,
// in its normal night look with the lamp on. The panel takes the remaining 402px.
const ROOM = { x: 15, y: 6, w: 266, h: 210, scale: 3 };
const PANEL = "#14211a";
const SEAM = "#22362a";

async function postcard(root: string, outfit: string) {
  const pub = path.join(root, "public");
  const file = async (f: string) => `data:image/png;base64,${(await fs.readFile(f)).toString("base64")}`;
  const uri = (f: string) => file(path.join(pub, f));
  const layer = async (name: string, opacity = 1) =>
    `<image href="${await uri(`room/${name}.png`)}" width="384" height="216" opacity="${opacity}" image-rendering="optimizeSpeed"/>`;
  // frame 0 of a sprite sheet: the sheet inside a one-frame viewport
  const sprite = async (f: string, frames: number, size: number, x: number, y: number) =>
    `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><image href="${await uri(f)}" width="${size * frames}" height="${size}" image-rendering="optimizeSpeed"/></svg>`;
  const mug = `<svg x="332" y="110" width="17" height="14" viewBox="332 110 17 14">${await layer("room")}</svg>`;
  // the book initials, as Room.vue draws them on the wall
  const GLYPHS = { A: ["010", "101", "111", "101", "101"], S: ["011", "100", "010", "001", "110"] };
  const initials = `<path fill="#b27a50" d="${glyph("A", 165, 26, GLYPHS)}"/><path fill="#559e86" d="${glyph("S", 194, 29, GLYPHS)}"/>`;
  // the divergence meter in its Steins Gate reading: glass and tubes under the night, lit digits over it
  const tubes = divergenceTubes;
  const glass = `<rect fill="#2a2130" x="${NIXIE_X}" y="${NIXIE_Y + 12}" width="${plinthWidth(tubes)}" height="3"/>
    <rect fill="#54434f" x="${NIXIE_X}" y="${NIXIE_Y + 12}" width="${plinthWidth(tubes)}" height="1"/>
    ${tubes
      .map(
        (t) => `<rect fill="rgb(214,228,236)" fill-opacity=".28" x="${t.x}" y="${NIXIE_Y + 1}" width="${t.w}" height="9"/>
    <rect fill="rgb(214,228,236)" fill-opacity=".28" x="${t.x + 1}" y="${NIXIE_Y}" width="${t.w - 2}" height="1"/>
    <rect fill="#fff" fill-opacity=".32" x="${t.x}" y="${NIXIE_Y + 1}" width="1" height="8"/>
    <rect fill="#3b3442" x="${t.x}" y="${NIXIE_Y + 10}" width="${t.w}" height="2"/>`,
      )
      .join("")}
    <path fill="rgb(150,80,40)" fill-opacity=".35" d="${unlitFor(tubes)}"/>`;
  const lit = `<filter id="tube" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation=".6" result="b"/>
      <feFlood flood-color="rgb(255,110,20)" flood-opacity=".9"/><feComposite in2="b" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <path fill="#ffa04a" filter="url(#tube)" d="${readingPath("1.048596")}"/>`;
  const lights = `<rect fill="#f38ba8" x="286" y="119" width="2" height="1"/><rect fill="#a6e3a1" x="238" y="42" width="1" height="1"/>
    <rect fill="#a6e3a1" x="242" y="42" width="1" height="1"/><rect fill="#f9e2af" x="246" y="42" width="1" height="1"/>`;
  const room = `<svg x="0" y="0" width="${ROOM.w * ROOM.scale}" height="${ROOM.h * ROOM.scale}" viewBox="${ROOM.x} ${ROOM.y} ${ROOM.w} ${ROOM.h}">
    ${await layer("sky-night")}${await layer("stars-a")}${await layer("stars-b")}${await layer("room")}
    ${initials}${glass}
    ${await sprite(`art/outfits/${outfit}/asad-typing.png`, 8, 128, 66, 78)}
    ${await sprite("sprites/robot-idle.png", 8, 48, 286, 80)}
    ${mug}
    ${await sprite("sprites/storm-idle.png", 8, 64, 198, 146)}
    ${await layer("night")}${await layer("glow")}${await layer("bulb")}
    ${lit}${lights}
  </svg>`;
  // the wordmark at 5x, in the panel's lower half, left-aligned with a generous margin
  const mark = { w: 54 * 5, h: 8 * 5 };
  const panelX = ROOM.w * ROOM.scale;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="${PANEL}"/>
    ${room}
    <rect x="${panelX}" y="0" width="6" height="630" fill="${SEAM}"/>
    <image href="${await file(path.join(root, "scripts/assets/og-wordmark.png"))}" x="${panelX + 66}" y="${315 - mark.h / 2}" width="${mark.w}" height="${mark.h}" image-rendering="optimizeSpeed"/>
  </svg>`;
  const r = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render();
  return opaquePng(r.width, r.height, r.pixels);
}

// The postcard has no transparency, so it is written as an RGB PNG (no alpha channel): some link
// previews flatten alpha badly. A minimal encoder on node:zlib, one filter-0 row at a time.
function opaquePng(width: number, height: number, rgba: Buffer) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) rgba.copy(raw, y * (width * 3 + 1) + 1 + x * 3, (y * width + x) * 4, (y * width + x) * 4 + 3);
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer) => {
    let c = 0xffffffff;
    for (const v of b) c = crcTable[(c ^ v) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit RGB, no interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
