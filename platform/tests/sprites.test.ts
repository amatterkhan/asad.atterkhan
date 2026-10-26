import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import manifest from "../public/sprites/manifest.json";
test("all sprite sheets use fixed RGBA cells, valid PNG headers and small runtime payloads", async () => {
  for (const state of Object.values(manifest.states)) {
    const bytes = await fs.readFile("public" + state.sheet);
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    assert.equal(bytes.readUInt32BE(16), state.frameWidth * state.frames);
    assert.equal(bytes.readUInt32BE(20), state.frameHeight);
    assert.equal(bytes[25], 6);
    assert.ok(bytes.length < 64000); // 8 frames of 128px art fit comfortably
    assert.ok(state.anchor[0] < state.frameWidth && state.anchor[1] < state.frameHeight);
  }
});

test("every outfit has Asad's sheets in the classic layout and timing; classic is untouched", async () => {
  const { default: wardrobe } = await import("../public/art/outfits/index.json");
  const ids = wardrobe.outfits.map((o) => o.id);
  assert.ok(ids.includes("classic") && ids.includes(wardrobe.default));
  assert.equal(new Set(ids).size, ids.length);
  for (const outfit of wardrobe.outfits) {
    const meta = JSON.parse(await fs.readFile(`public/art/outfits/${outfit.id}/outfit.json`, "utf8"));
    assert.equal(meta.id, outfit.id);
    const own = JSON.parse(await fs.readFile(`public/art/outfits/${outfit.id}/manifest.json`, "utf8"));
    for (const [name, state] of Object.entries(manifest.states).filter(([n]) => n.startsWith("asad-"))) {
      const sheet = own.states[name];
      assert.equal(sheet.sheet, `/art/outfits/${outfit.id}/${name}.png`);
      assert.deepEqual(sheet.durationsMs, state.durationsMs);
      const bytes = await fs.readFile("public" + sheet.sheet);
      const classic = await fs.readFile("public" + state.sheet);
      assert.equal(bytes.readUInt32BE(16), classic.readUInt32BE(16));
      assert.equal(bytes.readUInt32BE(20), classic.readUInt32BE(20));
      assert.equal(bytes[25], 6);
      if (outfit.id === "classic") assert.ok(bytes.equals(classic));
    }
    await fs.access("public" + outfit.preview);
  }
});

test("an unknown or missing outfit id falls back to the wardrobe default", async () => {
  const { resolveOutfit, DEFAULT_OUTFIT, outfitSheet } = await import("../src/lib/outfits");
  assert.equal(resolveOutfit("classic"), "classic");
  assert.equal(resolveOutfit("../../etc"), DEFAULT_OUTFIT);
  assert.equal(resolveOutfit(undefined), DEFAULT_OUTFIT);
  assert.equal(resolveOutfit(42), DEFAULT_OUTFIT);
  assert.match(outfitSheet("nope", "asad-idle"), new RegExp(`^/art/outfits/${DEFAULT_OUTFIT}/asad-idle\\.png\\?v=`));
});
