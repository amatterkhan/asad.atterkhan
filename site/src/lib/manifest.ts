import manifest from "../../public/sprites/manifest.json";
export type SpriteState = keyof typeof manifest.states;
export { manifest };
export const loopMs = (k: SpriteState) => manifest.states[k].frames * manifest.states[k].frameMs;
