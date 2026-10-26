import type { CSSProperties, ReactNode } from "react";
import manifest from "../../public/sprites/manifest.json";

// A close-up of one corner of the homepage room (same LibreSprite layers), used as the header art
// of the page that corner leads to. Crops are in room pixels (the room is 384x216).
const CROPS = {
  lab: [150, 84, 150, 46],
  bench: [240, 80, 144, 44],
  awards: [256, 4, 128, 39],
  cv: [236, 14, 148, 45],
  about: [24, 40, 184, 168],
} as const;

export type Corner = keyof typeof CROPS;

export function RoomVignette({ corner, children }: { corner: Corner; children?: ReactNode }) {
  const [x, y, w, h] = CROPS[corner];
  const v = manifest.version;
  return (
    <div
      className="vignette"
      aria-hidden="true"
      style={{ "--cw": w, "--ch": h, "--cx": x, "--cy": y } as CSSProperties}
    >
      <div className="vignette-room">
        {["sky-night", "sky-day", "room", "sunbeam"].map((n) => (
          <div key={n} className={`layer layer-${n}`} style={{ backgroundImage: `url(/room/${n}.png?v=${v})` }} />
        ))}
        {children}
        {["night", "glow", "bulb"].map((n) => (
          <div key={n} className={`layer layer-${n}`} style={{ backgroundImage: `url(/room/${n}.png?v=${v})` }} />
        ))}
      </div>
    </div>
  );
}

/** Places a child at room coordinates inside a vignette. */
export function At({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div className="vignette-at" style={{ "--x": x, "--y": y } as CSSProperties}>
      {children}
    </div>
  );
}
