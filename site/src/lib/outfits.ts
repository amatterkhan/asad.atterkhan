import wardrobe from "../../public/art/outfits/index.json";
import { manifest, type SpriteState } from "./manifest";

// Asad's wardrobe: one folder per outfit in public/art/outfits/<id>/ (built by
// art/scripts/outfits.py), listed in public/art/outfits/index.json. Only the hoodie changes
// between outfits; frames and timing match public/sprites/manifest.json.

export const DEFAULT_OUTFIT = wardrobe.default;
export const isOutfit = (id: unknown): id is string => typeof id === "string" && wardrobe.outfits.some((o) => o.id === id);
/** A known outfit id, or the default for anything missing, removed or invalid. */
export const resolveOutfit = (id: unknown) => (isOutfit(id) ? id : DEFAULT_OUTFIT);
export const outfitSheet = (outfit: string, state: string) =>
  `/art/outfits/${resolveOutfit(outfit)}/${state}.png?v=${wardrobe.version}`;
/** The sheet for a sprite state; Asad's come from his outfit. */
export const spriteSheet = (state: SpriteState, outfit: string = DEFAULT_OUTFIT) =>
  state.startsWith("asad-") ? outfitSheet(outfit, state) : `/sprites/${state}.png?v=${manifest.version}`;
