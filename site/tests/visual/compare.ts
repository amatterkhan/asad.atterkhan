import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

// Side-by-side screenshots of the Next.js reference (REF, default :4180) and this site (NEW,
// default :4190): every page × desktop/mobile × night/day, motion reduced so frames are stable.
// Writes ref/new/diff PNGs and a summary to tests/visual/out/.
const REF = process.env.REF || "http://127.0.0.1:4180";
const NEW = process.env.NEW || "http://127.0.0.1:4190";
const paths = (process.env.PATHS || "/,/lab,/workbench,/workbench/textile-sewing-services,/workbench/qrover,/experience,/achievements,/about,/calendar,/admin,/preview/reading-layout,/nope").split(",");
const out = path.resolve(import.meta.dirname, "out");
fs.mkdirSync(out, { recursive: true });

const shoot = async (page: Page, url: string, file: string) => {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: ".cursor{display:none!important} *{caret-color:transparent!important}" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.screenshot({ path: file, fullPage: true });
};

const browser = await chromium.launch({ channel: "chrome" });
const rows: string[] = [];
for (const [vp, size] of [["desktop", { width: 1280, height: 900 }], ["mobile", { width: 390, height: 844 }]] as const)
  for (const theme of ["dark", "light"] as const) {
    const ctx = await browser.newContext({ viewport: size, reducedMotion: "reduce", colorScheme: theme, deviceScaleFactor: 1 });
    await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme);
    const page = await ctx.newPage();
    for (const p of paths) {
      const name = `${p === "/" ? "home" : p.slice(1).replace(/\//g, "_")}-${vp}-${theme}`;
      const a = path.join(out, `${name}-ref.png`);
      const b = path.join(out, `${name}-new.png`);
      await shoot(page, REF + p, a);
      await shoot(page, NEW + p, b);
      const ia = PNG.sync.read(fs.readFileSync(a));
      const ib = PNG.sync.read(fs.readFileSync(b));
      const w = Math.max(ia.width, ib.width);
      const h = Math.max(ia.height, ib.height);
      const pad = (img: PNG) => {
        const o = new PNG({ width: w, height: h });
        PNG.bitblt(img, o, 0, 0, img.width, img.height, 0, 0);
        return o;
      };
      const diff = new PNG({ width: w, height: h });
      const n = pixelmatch(pad(ia).data, pad(ib).data, diff.data, w, h, { threshold: 0.1 });
      fs.writeFileSync(path.join(out, `${name}-diff.png`), PNG.sync.write(diff));
      const pct = ((n / (w * h)) * 100).toFixed(3);
      rows.push(`${name.padEnd(48)} ref ${ia.width}x${ia.height}  new ${ib.width}x${ib.height}  diff ${pct}%`);
      console.log(rows.at(-1));
    }
    await ctx.close();
  }
await browser.close();
fs.writeFileSync(path.join(out, "summary.txt"), rows.join("\n") + "\n");
