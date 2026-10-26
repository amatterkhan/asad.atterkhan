"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AsadSprite, StormSprite } from "./Sprites";
import manifest from "../../public/sprites/manifest.json";
import { site } from "@/lib/site";

// The room is a 384x216 pixel-art scene drawn in LibreSprite (art/ase/room.ase), one PNG per layer.
const W = 384;
const H = 216;
const STRETCH_MS =
  manifest.states["storm-stretch"].frames * manifest.states["storm-stretch"].frameMs;
const SIP_MS = manifest.states["asad-coffee"].frames * manifest.states["asad-coffee"].frameMs;
// Storm's planted paws travel one stride per walk cycle, so he moves at exactly that speed.
const WALK_SPEED = manifest.strideRoomPx / manifest.walkCycleMs;

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

type StormMode = "idle" | "standing" | "sleeping" | "stretch";

export function Room() {
  const root = useRef<HTMLDivElement>(null);
  const storm = useRef<HTMLDivElement>(null);
  const target = useRef(230);
  const lastInput = useRef(0);
  const [sky, setSky] = useState<"day" | "night">("night");
  const [clock, setClock] = useState("");
  const [lamp, setLamp] = useState(true);
  const [mode, setMode] = useState<StormMode>("idle");
  const [asad, setAsad] = useState<"typing" | "coffee">("typing");
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

  // Asad types, and every so often takes a sip of coffee.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const typing = () => {
      setAsad("typing");
      t = setTimeout(sip, 14000 + Math.random() * 12000);
    };
    const sip = () => {
      setAsad("coffee");
      t = setTimeout(typing, SIP_MS);
    };
    t = setTimeout(sip, 9000);
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
      if (current === "sleeping") {
        if (idle < 400) stretch(now);
        raf = requestAnimationFrame(loop);
        return;
      }
      if (idle > 6000 && now > wander) {
        target.current = 30 + Math.random() * 320;
        wander = now + 7000 + Math.random() * 6000;
      }
      const dx = target.current - x;
      if (Math.abs(dx) > 1) {
        x += reduce ? dx : Math.sign(dx) * Math.min(Math.abs(dx), dt * WALK_SPEED);
        set("standing");
        storm.current?.style.setProperty("--flip", dx > 0 ? "-1" : "1");
      } else if (current === "standing" && idle > 6000 && Math.random() < 0.35) {
        stretch(now);
      } else if (idle > 22000) set("sleeping");
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
          <AsadSprite animation={asad} size={96} />
        </div>
        <div className="actor storm" ref={storm} data-mode={mode}>
          <span className="storm-shadow" aria-hidden="true" />
          <button
            type="button"
            aria-label="Pet Storm"
            onClick={() => {
              lastInput.current = performance.now();
              setSaid((n) => (n + 1) % mrrps.length);
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
        <span className="fx fx-antenna" style={at([326, 99, 1, 2])} />
        <span className="fx fx-steam" style={at([335, 104, 1, 3])} />
        <span className="fx fx-steam two" style={at([339, 102, 1, 3])} />

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
        <span className="hint">Poke around: everything on the desk is a door.</span>
      </figcaption>
    </figure>
  );
}
