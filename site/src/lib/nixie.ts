// The Nixie clock under the bookshelf, a Steins;Gate divergence meter telling the time: HH.MM.SS
// across eight tubes, digit tubes 5px wide, the dot tubes 3px, 1px apart, on a dark plinth. Drawn on
// the room's own 384x216 grid, but each SVG covers only the clock's box, so the lit digits repaint a
// few pixels a second rather than the whole room.
export const NIXIE_X = 157;
export const NIXIE_Y = 67;

export const tubes = (() => {
  let x = NIXIE_X + 2;
  return ["d", "d", ".", "d", "d", ".", "d", "d"].map((kind) => {
    const t = { kind, x, w: kind === "d" ? 5 : 3 };
    x += t.w + 1;
    return t;
  });
})();
export const NIXIE_W = tubes.at(-1)!.x + 5 + 2 - NIXIE_X;
export const NIXIE_H = 15;
/** The clock's box in room pixels: x, y, width, height. */
export const NIXIE_BOX = [NIXIE_X, NIXIE_Y, NIXIE_W, NIXIE_H] as const;

// 3x7 digits, narrow like real Nixie numerals.
const DIGITS: Record<string, string[]> = {
  "0": ["111", "101", "101", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "010", "010", "111"],
  "2": ["111", "001", "001", "111", "100", "100", "111"],
  "3": ["111", "001", "001", "111", "001", "001", "111"],
  "4": ["101", "101", "101", "111", "001", "001", "001"],
  "5": ["111", "100", "100", "111", "001", "001", "111"],
  "6": ["111", "100", "100", "111", "101", "101", "111"],
  "7": ["111", "001", "001", "001", "001", "001", "001"],
  "8": ["111", "101", "101", "111", "101", "101", "111"],
  "9": ["111", "101", "101", "111", "001", "001", "111"],
};
/** A pixel glyph as an SVG path, one 1x1 square per lit pixel. */
export const glyph = (ch: string, x: number, y: number, font: Record<string, string[]> = DIGITS) =>
  (font[ch] ?? [])
    .flatMap((row, dy) => [...row].map((on, dx) => (on === "1" ? `M${x + dx} ${y + dy}h1v1h-1z` : "")))
    .join("");

const digitTubes = tubes.filter((t) => t.kind === "d");
export const unlitPath = digitTubes.map((t) => glyph("8", t.x + 1, NIXIE_Y + 2)).join("");
const dots = tubes
  .filter((t) => t.kind === ".")
  .map((t) => `M${t.x + 1} ${NIXIE_Y + 8}h1v1h-1z`)
  .join("");
/** The lit digits for "HHMMSS"; empty until the client knows the time. */
export const litPath = (time: string) =>
  time ? digitTubes.map((t, i) => glyph(time[i], t.x + 1, NIXIE_Y + 2)).join("") + dots : "";

/** "HHMMSS" in Mauritius. */
export const mauritiusTime = () =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: "Indian/Mauritius",
  })
    .format(new Date())
    .replace(/\D/g, "");

export const clockLabel = (time: string) =>
  time ? `A Nixie tube clock reading ${time.slice(0, 2)}:${time.slice(2, 4)} in Mauritius` : "A Nixie tube clock";
