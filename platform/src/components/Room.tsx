"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AsadSprite, RobotSprite, StormSprite } from "./Sprites";
import manifest from "../../public/sprites/manifest.json";
import { site } from "@/lib/site";

// The room is a 384x216 pixel-art scene drawn in LibreSprite (art/ase/room.ase), one PNG per layer.
const W = 384;
const H = 216;
const STRETCH_MS =
  manifest.states["storm-stretch"].frames * manifest.states["storm-stretch"].frameMs;
const loopMs = (k: keyof typeof manifest.states) => manifest.states[k].frames * manifest.states[k].frameMs;
// Storm's planted paws travel one stride per walk cycle, so he moves at exactly that speed.
const WALK_SPEED = manifest.strideRoomPx / manifest.walkCycleMs;
// Nap spots on either side of Asad (he sits around x 104-156): rug end by the window, or by the chair.
const BEDS = [60, 188] as const;

const mauritiusTime = () =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Indian/Mauritius",
  }).format(new Date());

const mrrps = ["mrrp?", "*purr*", "mew.", "…supervising", "prrrt!", "(blink)"];

type Box = [number, number, number, number];
const spots: { id: string; label: string; box: Box; href?: string; below?: boolean }[] = [
  { id: "lab", label: "The Lab", box: [210, 110, 46, 16], href: "/lab" },
  { id: "bench", label: "Workbench", box: [258, 100, 72, 26], href: "/workbench" },
  { id: "about", label: "About", box: [146, 10, 112, 44], href: "/about", below: true },
  { id: "awards", label: "Achievements", box: [282, 12, 56, 56], href: "/achievements", below: true },
  { id: "cv", label: "Experience", box: [342, 22, 36, 60], href: "/experience", below: true },
  { id: "mail", label: "Say hello", box: [254, 60, 32, 26] },
];
const at = ([x, y, w, h]: Box): CSSProperties => ({
  left: `${(x / W) * 100}%`,
  top: `${(y / H) * 100}%`,
  width: `${(w / W) * 100}%`,
  height: `${(h / H) * 100}%`,
});
const layer = (name: string) => (
  <div
    key={name}
    className={`layer layer-${name}`}
    style={{ backgroundImage: `url(/room/${name}.png?v=${manifest.version})` }}
  />
);

const MUG: Box = [332, 110, 17, 14];
const clip = ([x, y, w, h]: Box) =>
  `inset(${(y / H) * 100}% ${100 - ((x + w) / W) * 100}% ${100 - ((y + h) / H) * 100}% ${(x / W) * 100}%)`;

type StormMode = "idle" | "standing" | "sleeping" | "dream" | "stretch";

export function Room({ hint }: { hint: string }) {
  const root = useRef<HTMLDivElement>(null);
  const storm = useRef<HTMLDivElement>(null);
  const target = useRef(230);
  const lastInput = useRef(0);
  const [sky, setSky] = useState<"day" | "night">("night");
  const [clock, setClock] = useState("");
  const [lamp, setLamp] = useState(true);
  const [mode, setMode] = useState<StormMode>("idle");
  const [asad, setAsad] = useState<"typing" | "coffee" | "idle">("typing");
  const [happy, setHappy] = useState(false);
  const happyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [said, setSaid] = useState(-1);

  /* eslint-disable react-hooks/set-state-in-effect -- client-only clock, theme and saved lamp state avoid hydration mismatch */
  useEffect(() => {
    const tick = () => setClock(mauritiusTime());
    tick();
    setSky(document.documentElement.dataset.theme === "light" ? "day" : "night");
    const id = setInterval(tick, 30000);
    try {
      if (localStorage.getItem("lamp") === "off") setLamp(false);
    } catch {}
    return () => clearInterval(id);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Asad types; every so often he sips coffee, or stops to think (and hum).
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const typing = () => {
      setAsad("typing");
      t = setTimeout(pause, 12000 + Math.random() * 12000);
    };
    const pause = () => {
      const next = Math.random() < 0.55 ? "coffee" : "idle";
      setAsad(next);
      t = setTimeout(typing, next === "coffee" ? loopMs("asad-coffee") : loopMs("asad-idle"));
    };
    t = setTimeout(pause, 8000);
    return () => clearTimeout(t);
  }, []);

  // Storm follows your pointer along the floor, wanders when ignored, naps, and stretches on waking.
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let x = 230;
    let raf = 0;
    let last = performance.now();
    let current: StormMode = "idle";
    let wander = 0;
    let busyUntil = 0;
    let dreamAt = 0;
    let bed: number | null = null; // where he naps: beside Asad, never in front of him
    lastInput.current = last;
    const set = (m: StormMode) => {
      if (m !== current) {
        current = m;
        setMode(m);
      }
    };
    const stretch = (now: number) => {
      set("stretch");
      busyUntil = now + STRETCH_MS;
    };
    const loop = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      const idle = now - lastInput.current;
      if (now < busyUntil) {
        raf = requestAnimationFrame(loop);
        return;
      }
      if (current === "sleeping" || current === "dream") {
        if (idle < 400) stretch(now);
        else if (now > dreamAt) {
          // mostly curled up in a ball; now and then a short dream with kneading paws
          set(current === "sleeping" ? "dream" : "sleeping");
          dreamAt = now + (current === "dream" ? 4500 : 12000 + Math.random() * 10000);
        }
        raf = requestAnimationFrame(loop);
        return;
      }
      if (idle > 22000) {
        bed ??= Math.abs(x - BEDS[0]) < Math.abs(x - BEDS[1]) ? BEDS[0] : BEDS[1];
        target.current = bed;
      } else bed = null;
      if (idle > 6000 && idle <= 22000 && now > wander) {
        target.current = 30 + Math.random() * 320;
        wander = now + 7000 + Math.random() * 6000;
      }
      const dx = target.current - x;
      if (Math.abs(dx) > 1) {
        x += reduce ? dx : Math.sign(dx) * Math.min(Math.abs(dx), dt * WALK_SPEED);
        set("standing");
        storm.current?.style.setProperty("--flip", dx > 0 ? "1" : "-1"); // art faces right
      } else if (current === "standing" && idle > 6000 && Math.random() < 0.35) {
        stretch(now);
      } else if (idle > 22000 && bed !== null && Math.abs(x - bed) <= 1) {
        set("sleeping");
        dreamAt = now + 12000 + Math.random() * 10000;
      }
      else set("idle");
      storm.current?.style.setProperty("--x", x.toFixed(1));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const lure = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("a,button")) return;
    if (e.type === "pointermove" && e.pointerType !== "mouse") return;
    const r = root.current!.getBoundingClientRect();
    target.current = Math.min(360, Math.max(24, ((e.clientX - r.left) / r.width) * W));
    lastInput.current = performance.now();
  };

  const toggleLamp = () =>
    setLamp((v) => {
      try {
        localStorage.setItem("lamp", v ? "off" : "on");
      } catch {}
      return !v;
    });

  const toggleTheme = () => {
    const next = sky === "day" ? "night" : "day";
    setSky(next);
    const t = next === "day" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("theme", t);
    } catch {}
  };

  return (
    <figure className="room-wrap">
      <div
        ref={root}
        className="room"
        data-sky={sky}
        data-lamp={lamp ? "on" : "off"}
        onPointerMove={lure}
        onPointerDown={lure}
      >
        <p className="sr-only">
          A pixel-art room: Asad sits on a rug typing on his laptop while Storm the cat wanders.
          There is a window, a bookshelf, a framed certificate, a clipboard, and a desk with a
          notebook, an ESP32 board, a robot car, a mug and a lamp.
        </p>
        {["sky-night", "stars-a", "stars-b", "sky-day", "clouds", "room", "sunbeam"].map(layer)}

        <div className="actor asad">
          <AsadSprite animation={happy ? "happy" : asad} size={128} />
        </div>
        <div className="actor robot">
          <RobotSprite size={48} />
        </div>
        {/* the mug is redrawn over the robot, so QROVER drives behind it, not over it */}
        <div className="layer layer-room room-front" style={{ backgroundImage: `url(/room/room.png?v=${manifest.version})`, clipPath: clip(MUG) }} />
        <div className="actor storm" ref={storm} data-mode={mode}>
          <span className="storm-shadow" aria-hidden="true" />
          <button
            type="button"
            aria-label="Pet Storm"
            data-cursor="plain"
            onClick={() => {
              lastInput.current = performance.now();
              setSaid((n) => (n + 1) % mrrps.length);
              setHappy(true);
              clearTimeout(happyTimer.current);
              happyTimer.current = setTimeout(() => setHappy(false), loopMs("asad-happy"));
            }}
          >
            {said >= 0 && (
              <span className="storm-says" role="status" key={said}>
                {mrrps[said]}
              </span>
            )}
            {mode === "sleeping" && (
              <span className="zzz" aria-hidden="true">
                z Z
              </span>
            )}
            <StormSprite animation={mode} size={64} />
          </button>
        </div>

        {["night", "dark", "glow", "bulb"].map(layer)}
        <span className="fx fx-led" style={at([286, 119, 2, 1])} />
        <span className="fx fx-router a" style={at([238, 42, 1, 1])} />
        <span className="fx fx-router b" style={at([242, 42, 1, 1])} />
        <span className="fx fx-router c" style={at([246, 42, 1, 1])} />
        <span className="fx fx-steam" style={at([338, 106, 1, 3])} />
        <span className="fx fx-steam two" style={at([342, 104, 1, 3])} />

        {spots.map((s) =>
          s.href ? (
            <Link
              key={s.id}
              href={s.href}
              className={`spot${s.below ? " below" : ""}`}
              data-label={s.label}
              style={at(s.box)}
            >
              <span className="sr-only">{s.label}</span>
            </Link>
          ) : (
            <a
              key={s.id}
              href={`mailto:${site.email}`}
              className="spot"
              data-label={s.label}
              style={at(s.box)}
            >
              <span className="sr-only">{s.label}: email Asad</span>
            </a>
          ),
        )}
        <button
          type="button"
          className="spot"
          data-label={lamp ? "Lights off" : "Lights on"}
          style={at([336, 82, 40, 44])}
          aria-pressed={lamp}
          onClick={toggleLamp}
        >
          <span className="sr-only">Toggle the desk lamp</span>
        </button>
        <button
          type="button"
          className="spot below"
          data-label={sky === "day" ? "Switch to night" : "Switch to day"}
          style={at([26, 16, 104, 92])}
          onClick={toggleTheme}
        >
          <span className="sr-only">Switch between light and dark mode</span>
        </button>
      </div>
      <figcaption className="room-caption">
        <span>It&apos;s {clock || "--:--"} in Mauritius.</span>
        <span className="hint">{hint}</span>
      </figcaption>
    </figure>
  );
}
