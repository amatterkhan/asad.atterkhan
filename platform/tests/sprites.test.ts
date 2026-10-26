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
    assert.ok(bytes.length < 40000);
    assert.ok(state.anchor[0] < state.frameWidth && state.anchor[1] < state.frameHeight);
  }
});
