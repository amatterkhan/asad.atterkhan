"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import manifest from "../../public/sprites/manifest.json";
type Shared = {
  size?: 64 | 96 | 128 | 192 | 256 | 384;
  description?: string;
  paused?: boolean;
};
type State =
  | "asad-idle"
  | "asad-typing"
  | "storm-idle"
  | "storm-sleeping"
  | "storm-standing"
  | "storm-sit"
  | "storm-stretch"
  | "asad-coffee";
function Sprite({
  state,
  size = 128,
  description,
  paused = false,
}: Shared & { state: State }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let onScreen = false;
    const update = () => setVisible(onScreen && !document.hidden);
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      update();
    });
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return (
    <span
      ref={ref}
      role={description ? "img" : undefined}
      aria-label={description}
      aria-hidden={!description ? true : undefined}
      className={`sprite ${state}`}
      style={
        {
          "--sprite-size": `${size}px`,
          "--sprite-sheet": `url(/sprites/${state}.png?v=${manifest.version})`,
          "--n": manifest.states[state].frames,
          "--ms": `${manifest.states[state].frameMs}ms`,
          animationPlayState: visible && !paused ? "running" : "paused",
        } as CSSProperties
      }
    />
  );
}
export function AsadSprite({
  animation = "idle",
  ...props
}: Shared & { animation?: "idle" | "typing" | "coffee" }) {
  return <Sprite state={`asad-${animation}`} {...props} />;
}
export function StormSprite({
  animation = "idle",
  ...props
}: Shared & { animation?: "idle" | "sleeping" | "standing" | "sit" | "stretch" }) {
  return <Sprite state={`storm-${animation}`} {...props} />;
}
const mrrps = ["mrrp?", "*purr*", "mew.", "…supervising", "prrrt!", "(blink)"];

export function SpriteScene({ large = false }: { large?: boolean }) {
  const [n, setN] = useState(-1);
  return (
    <figure className={`companion-scene${large ? " large" : ""}`}>
      <div
        className="sprite-scene"
        role="img"
        aria-label={
          large
            ? "Pixel-art Asad taking a coffee break with Storm sitting beside him"
            : "Pixel-art Asad working on his laptop with Storm sitting beside him"
        }
      >
        <AsadSprite animation={large ? "coffee" : "typing"} size={192} />
        <button
          type="button"
          className="storm-btn"
          aria-label="Pet Storm"
          onClick={() => setN((v) => (v + 1) % mrrps.length)}
        >
          {n >= 0 && (
            <span className="storm-says" role="status" key={n}>
              {mrrps[n]}
            </span>
          )}
          <StormSprite animation={large ? "idle" : "sit"} size={128} />
        </button>
      </div>
      <figcaption className="scene-note">
        {large ? "Still figuring things out. That's the fun part." : "Storm is supervising. Tap to say hi."}
      </figcaption>
    </figure>
  );
}
