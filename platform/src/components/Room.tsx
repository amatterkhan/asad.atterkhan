"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AsadSprite, StormSprite } from "./Sprites";
import { site } from "@/lib/site";

type Sky = "day" | "dusk" | "night";
const skies: Sky[] = ["day", "dusk", "night"];
const skyAt = (h: number): Sky =>
  h >= 6 && h < 17 ? "day" : h >= 17 && h < 19 ? "dusk" : "night";
const mauritiusTime = () =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Indian/Mauritius",
  }).format(new Date());

const mrrps = ["mrrp?", "*purr*", "mew.", "…supervising", "prrrt!", "(blink)"];
const W = 192;
const H = 108;

const R = ({
  x,
  y,
  w,
  h,
  f,
  c,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  f?: string;
  c?: string;
}) => <rect x={x} y={y} width={w} height={h} fill={f} className={c} />;

type Spot = {
  id: string;
  label: string;
  box: [number, number, number, number];
  href?: string;
};
const spots: Spot[] = [
  { id: "lab", label: "The Lab", box: [106, 53, 22, 10], href: "/lab" },
  { id: "bench", label: "Workbench", box: [128, 49, 34, 14], href: "/workbench" },
  { id: "about", label: "About", box: [68, 9, 60, 16], href: "/about" },
  { id: "awards", label: "Achievements", box: [144, 12, 26, 24], href: "/achievements" },
  { id: "cv", label: "Experience", box: [172, 14, 16, 24], href: "/experience" },
  { id: "mail", label: "Say hello", box: [128, 28, 14, 12] },
];
const pos = ([x, y, w, h]: Spot["box"]): CSSProperties => ({
  left: `${(x / W) * 100}%`,
  top: `${(y / H) * 100}%`,
  width: `${(w / W) * 100}%`,
  height: `${(h / H) * 100}%`,
});

export function Room() {
  const root = useRef<HTMLDivElement>(null);
  const storm = useRef<HTMLDivElement>(null);
  const target = useRef(112);
  const lastInput = useRef(0);
  const [sky, setSky] = useState<Sky>("night");
  const [clock, setClock] = useState("");
  const [lamp, setLamp] = useState(true);
  const [mode, setMode] = useState<"sit" | "standing" | "sleeping">("sit");
  const [said, setSaid] = useState(-1);

  /* eslint-disable react-hooks/set-state-in-effect -- client-only clock and saved lamp state avoid hydration mismatch */
  useEffect(() => {
    const tick = () => {
      setClock(mauritiusTime());
      setSky(skyAt(+mauritiusTime().slice(0, 2)));
    };
    tick();
    const id = setInterval(tick, 30000);
    try {
      if (localStorage.getItem("lamp") === "off") setLamp(false);
    } catch {}
    return () => clearInterval(id);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Storm: follows your pointer along the floor, wanders when idle, naps when ignored.
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let x = 112;
    let raf = 0;
    let last = performance.now();
    let current: typeof mode = "sit";
    let wander = 0;
    lastInput.current = last;
    const set = (m: typeof mode) => {
      if (m !== current) {
        current = m;
        setMode(m);
      }
    };
    const loop = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      const idle = now - lastInput.current;
      if (idle > 5000 && now > wander && current !== "sleeping") {
        target.current = 24 + Math.random() * 150;
        wander = now + 6000 + Math.random() * 5000;
      }
      const dx = target.current - x;
      if (Math.abs(dx) > 0.6 && !(current === "sleeping" && idle > 1000)) {
        x += reduce ? dx : Math.sign(dx) * Math.min(Math.abs(dx), dt * 0.028);
        set("standing");
        storm.current?.style.setProperty("--flip", dx < 0 ? "-1" : "1");
      } else if (idle > 18000) set("sleeping");
      else set("sit");
      storm.current?.style.setProperty("--x", String(x));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const lure = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("a,button")) return;
    if (e.type === "pointermove" && e.pointerType !== "mouse") return;
    const r = root.current!.getBoundingClientRect();
    const ux = ((e.clientX - r.left) / r.width) * W;
    target.current = Math.min(176, Math.max(16, ux));
    lastInput.current = performance.now();
  };

  const toggleLamp = () => {
    setLamp((v) => {
      try {
        localStorage.setItem("lamp", v ? "off" : "on");
      } catch {}
      return !v;
    });
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
        <svg
          viewBox={`0 0 ${W} ${H}`}
          shapeRendering="crispEdges"
          role="img"
          aria-label="A pixel-art room: a window, a bookshelf, a desk with a notebook, an ESP32 board, a robot car and a lamp. Asad sits on a rug with his laptop while Storm the cat wanders."
        >
          {/* walls + floor */}
          <R x={0} y={0} w={W} h={86} f="#1a1e3c" />
          <R x={0} y={58} w={W} h={28} f="#161934" />
          <R x={0} y={56} w={W} h={2} f="#232852" />
          <R x={0} y={86} w={W} h={22} f="#2b2349" />
          <R x={0} y={84} w={W} h={2} f="#3d3263" />
          {[92, 98, 104].map((y) => (
            <R key={y} x={0} y={y} w={W} h={1} f="#241d40" />
          ))}

          {/* window */}
          <g className="sky">
            <R x={16} y={14} w={40} h={32} c="sky-fill" />
            <g className="stars">
              {[
                [20, 18], [27, 24], [33, 17], [44, 22], [50, 16], [38, 33], [24, 38], [48, 40],
              ].map(([x, y], i) => (
                <R key={i} x={x} y={y} w={1} h={1} f="#f5e0dc" c={`twinkle t${i % 3}`} />
              ))}
              {[[45, 18, 3, 1], [44, 19, 2, 4], [45, 23, 3, 1], [46, 20, 1, 2], [48, 19, 1, 1], [48, 22, 1, 1]].map(([x, y, w, h]) => (
                <R key={`${x}${y}`} x={x} y={y} w={w} h={h} f="#f5e0dc" />
              ))}
            </g>
            <g className="sun">
              <R x={22} y={20} w={8} h={8} f="#f9e2af" />
              <R x={20} y={22} w={12} h={4} f="#f9e2af" />
              <R x={24} y={18} w={4} h={12} f="#f9e2af" />
            </g>
            <R x={16} y={38} w={40} h={8} f="#2a3a5c" c="hills" />
          </g>
          <R x={35} y={14} w={2} h={32} f="#5b4a8a" />
          <R x={16} y={29} w={40} h={2} f="#5b4a8a" />
          <R x={14} y={12} w={44} h={2} f="#5b4a8a" />
          <R x={14} y={12} w={2} h={36} f="#5b4a8a" />
          <R x={56} y={12} w={2} h={36} f="#5b4a8a" />
          <R x={12} y={48} w={48} h={3} f="#6e5aa3" />

          {/* bookshelf */}
          <R x={70} y={24} w={56} h={2} f="#7a5a45" />
          <R x={72} y={13} w={3} h={11} f="#cba6f7" />
          <R x={75} y={15} w={3} h={9} f="#89dceb" />
          <R x={78} y={12} w={4} h={12} f="#fab387" />
          <R x={82} y={14} w={3} h={10} f="#a6e3a1" />
          <R x={85} y={13} w={5} h={11} f="#f38ba8" />
          <R x={90} y={16} w={3} h={8} f="#f9e2af" />
          <R x={94} y={14} w={3} h={10} f="#74c7ec" />
          <R x={112} y={18} w={8} h={6} f="#fab387" />
          <R x={113} y={11} w={2} h={7} f="#a6e3a1" />
          <R x={116} y={9} w={2} h={9} f="#94e2d5" />
          <R x={118} y={12} w={2} h={6} f="#a6e3a1" />

          {/* certificate + clipboard + postcard */}
          <R x={146} y={14} w={22} h={20} f="#8a6aa8" />
          <R x={148} y={16} w={18} h={16} f="#e8e4d4" />
          <R x={151} y={19} w={12} h={1} f="#8c8fa8" />
          <R x={151} y={22} w={12} h={1} f="#8c8fa8" />
          <R x={151} y={25} w={7} h={1} f="#8c8fa8" />
          <R x={159} y={26} w={4} h={4} f="#f38ba8" />
          <R x={173} y={16} w={14} h={20} f="#7a5a45" />
          <R x={175} y={19} w={10} h={15} f="#e8e4d4" />
          <R x={177} y={14} w={6} h={3} f="#9399b2" />
          {[22, 25, 28, 31].map((y) => (
            <R key={y} x={177} y={y} w={6} h={1} f="#8c8fa8" />
          ))}
          <R x={130} y={30} w={10} h={8} f="#f9e2af" />
          <R x={137} y={31} w={2} h={2} f="#f38ba8" />
          <R x={131} y={34} w={5} h={1} f="#a6733c" />
          <R x={131} y={36} w={4} h={1} f="#a6733c" />

          {/* rug */}
          <rect x={28} y={93} width={72} height={9} rx={3} fill="#3a2f66" />
          <rect x={31} y={95} width={66} height={5} rx={2} fill="#2f2858" />

          {/* desk */}
          <R x={100} y={62} w={92} h={4} f="#8a6244" />
          <R x={102} y={66} w={88} h={20} f="#6b4a34" />
          <R x={132} y={70} w={30} h={12} f="#5a3d2a" />
          <R x={145} y={75} w={4} h={2} f="#f9e2af" />

          {/* notebook */}
          <R x={108} y={59} w={9} h={3} f="#e8e4d4" />
          <R x={118} y={59} w={9} h={3} f="#e8e4d4" />
          <R x={117} y={59} w={1} h={3} f="#b4a8d6" />
          <R x={109} y={60} w={6} h={1} f="#9399b2" />
          <R x={119} y={60} w={5} h={1} f="#9399b2" />
          <R x={121} y={58} w={7} h={1} f="#f38ba8" />
          {/* ESP32-CAM */}
          <R x={130} y={59} w={14} h={3} f="#2d6a4f" />
          <R x={131} y={55} w={4} h={4} f="#11111b" />
          <R x={132} y={56} w={2} h={2} f="#89b4fa" />
          <R x={137} y={60} w={4} h={1} f="#11111b" />
          <R x={142} y={60} w={1} h={1} f="#f38ba8" c="blink" />
          {/* QROVER */}
          <R x={150} y={58} w={12} h={3} f="#cba6f7" />
          <R x={152} y={55} w={4} h={3} f="#e8e4d4" />
          <R x={153} y={56} w={1} h={1} f="#11111b" />
          <R x={155} y={55} w={1} h={1} f="#11111b" />
          <R x={158} y={56} w={3} h={2} f="#89dceb" />
          <R x={151} y={60} w={3} h={2} f="#11111b" />
          <R x={158} y={60} w={3} h={2} f="#11111b" />
          {/* mug + steam */}
          <R x={164} y={57} w={5} h={5} f="#f5e0dc" />
          <R x={169} y={58} w={1} h={3} f="#f5e0dc" />
          <R x={164} y={57} w={5} h={1} f="#7f5539" />
          <R x={165} y={54} w={1} h={2} f="#cdd6f4" c="steam s0" />
          <R x={167} y={53} w={1} h={2} f="#cdd6f4" c="steam s1" />
          {/* lamp */}
          <polygon points="170,50 182,50 190,64 164,64" fill="#f9e2af" className="beam" />
          <R x={176} y={60} w={8} h={2} f="#6c7086" />
          <R x={179} y={48} w={2} h={12} f="#6c7086" />
          <R x={170} y={44} w={11} h={2} f="#6c7086" />
          <R x={168} y={46} w={10} h={4} c="lamp-head" />
        </svg>

        <div className="room-light" aria-hidden="true" />

        {spots.map((s) =>
          s.href ? (
            <Link key={s.id} href={s.href} className="spot" data-label={s.label} style={pos(s.box)}>
              <span className="sr-only">{s.label}</span>
            </Link>
          ) : (
            <a key={s.id} href={`mailto:${site.email}`} className="spot" data-label={s.label} style={pos(s.box)}>
              <span className="sr-only">{s.label}: email Asad</span>
            </a>
          ),
        )}
        <button
          type="button"
          className="spot"
          data-label={lamp ? "Lights off" : "Lights on"}
          style={pos([164, 42, 20, 22])}
          aria-pressed={lamp}
          onClick={toggleLamp}
        >
          <span className="sr-only">Toggle the desk lamp</span>
        </button>
        <button
          type="button"
          className="spot"
          data-label="Change the sky"
          style={pos([14, 12, 46, 38])}
          onClick={() => setSky((s) => skies[(skies.indexOf(s) + 1) % 3])}
        >
          <span className="sr-only">Change the time of day in the window</span>
        </button>

        <div className="actor asad">
          <AsadSprite animation="typing" size={128} />
        </div>
        <div className="actor storm" ref={storm}>
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
            <StormSprite animation={mode} size={128} />
          </button>
        </div>
      </div>
      <figcaption className="room-caption">
        <span>It&apos;s {clock || "--:--"} in Mauritius.</span>
        <span className="hint">Poke around: everything on the desk is a door.</span>
      </figcaption>
    </figure>
  );
}
