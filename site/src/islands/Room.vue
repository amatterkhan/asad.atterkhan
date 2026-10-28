<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch, type CSSProperties } from "vue";
import Sprite from "../components/Sprite.vue";
import NixieClock from "../components/NixieClock.vue";
import { NIXIE_X, NIXIE_Y, divergenceTubes, glyph, plinthWidth } from "../lib/nixie";
import { loopMs, manifest, type SpriteState } from "../lib/manifest";
import { spriteSheet } from "../lib/outfits";
import { site } from "../lib/site";
import { nextPause, type Pause } from "../lib/pose";
import { nextWait, pickThought, readMs, type PublicThought } from "../lib/thoughts";
import type { ThoughtContext } from "../lib/schemas";
import { scramblePage } from "../lib/scramble";
import { DIVERGENCE, nextWorldline, scramble, shiftTimeline, worldlineLabel, type ShiftPhase, type Worldline } from "../lib/worldline";

// The room is a 384x216 pixel-art scene drawn in LibreSprite (art/ase/room.ase), one PNG per layer.
const W = 384;
const H = 216;
const STRETCH_MS = loopMs("storm-stretch");
// Storm's planted paws travel one stride per walk cycle, so he moves at exactly that speed.
const WALK_SPEED = manifest.strideRoomPx / manifest.walkCycleMs;
// Nap spots on either side of Asad (he sits around x 104-156): rug end by the window, or by the chair.
const BEDS = [60, 188] as const;
// Asad up and about. His middle is x 51 of his 128 px frame, so x 117 in the room when he sits; he
// walks at the pace his feet travel (about 37 px per 8-frame walk cycle). WINDOW_DX puts him at the
// glass's middle; following the pointer he keeps to the floor between the window and the desk's end.
const ASAD_HOME = 66 + 51;
const WINDOW_DX = -40;
const FLOOR_DX = [30 - ASAD_HOME, 300 - ASAD_HOME] as const;
const ASAD_SPEED = 37 / loopMs("asad-walk-left");
// a play-once sheet holds its last frame after (n - 1) frame times
const onceMs = (k: SpriteState) => (manifest.states[k].frames - 1) * manifest.states[k].frameMs;

const {
  hint,
  outfit,
  thoughts = [],
  featured = null,
} = defineProps<{ hint: string; outfit?: string; thoughts?: PublicThought[]; featured?: string | null }>();

// Pixel glyphs, 3x5 (the book initials), drawn straight onto the room's 384x216 grid as SVG paths.
const GLYPHS: Record<string, string[]> = {
  A: ["010", "101", "111", "101", "101"],
  S: ["011", "100", "010", "001", "110"],
};

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
const layer = (name: string) => ({ backgroundImage: `url(/room/${name}.png?v=${manifest.version})` });
const MUG: Box = [332, 110, 17, 14];
// The divergence meter's box (its wider, divergence layout) and the window's glass, in room px.
const METER: Box = [NIXIE_X, NIXIE_Y, plinthWidth(divergenceTubes), 15];
const GLASS: Box = [39, 26, 77, 70];
// Steins Gate's few sparkles: by the window, the shelf and the lamp.
const SPARKS: Box[] = [[52, 34, 1, 1], [104, 58, 1, 1], [226, 56, 1, 1], [318, 92, 1, 1], [364, 104, 1, 1]];
const clip = ([x, y, w, h]: Box) =>
  `inset(${(y / H) * 100}% ${100 - ((x + w) / W) * 100}% ${100 - ((y + h) / H) * 100}% ${(x / W) * 100}%)`;

type StormMode = "idle" | "standing" | "sleeping" | "dream" | "stretch";

const root = useTemplateRef<HTMLDivElement>("root");
const storm = useTemplateRef<HTMLDivElement>("storm");
let target = 230;
let lastInput = 0;
// where the pointer last was on the floor (room px) and when: Asad follows it after a double tap
let asadTarget = ASAD_HOME;
let asadLured = 0;
// set up on mount: a double tap on Asad gets him up (or, if he's following, sends him back)
let callAsad = () => {};
// decide now rather than at the next tick, so a tap moves Storm at once (set up on mount)
let poke = () => {};
const sky = ref<"day" | "night">("night");
const lamp = ref(true);
const mode = ref<StormMode>("idle");
type Away = "standup" | "sitdown" | "walk-left" | "walk-right" | "window" | "stand";
const asad = ref<"typing" | Exclude<Pause, "walk"> | Away>("typing");
// up from the rug: from standing up until he has sat back down (his laptop waits on the rug)
const away = ref(false);
// how far his sprite has walked from his spot, and how long that walk takes
const asadWalk = ref({ dx: 0, ms: 0 });
const happy = ref(false);
const said = ref(-1);
// the bubble fades by CSS, but is also taken away after it, so it can never stay on screen
const saying = ref(false);
let sayTimer: ReturnType<typeof setTimeout> | undefined;
let happyTimer: ReturnType<typeof setTimeout> | undefined;
const stops: (() => void)[] = [];

// Worldlines (lib/worldline.ts): pressing the divergence meter shifts the room. Never saved.
const worldline = ref<Worldline>("normal");
const shift = ref<ShiftPhase>("idle");
// what the tubes read: undefined is the live clock
const reading = ref<string>();
const note = ref<Exclude<Worldline, "normal"> | null>(null);
// one polite announcement per shift, written when it settles (outside the button, never moving focus)
const announce = ref("");
/** A shift or its note is on screen: Thoughts and other bubbles wait. */
const shifting = computed(() => shift.value !== "idle");

// Asad's Thoughts (lib/thoughts.ts): now and then a one-liner in a bubble over his head. He sits at
// x 66 (his sprite's left edge); the bubble is placed from this, so it follows him if he ever moves.
const asadX = ref(66);
const thought = ref<{ text: string; key: number } | null>(null);
// set up on mount: hush him (Storm was petted, or a worldline shift began) and start a fresh wait
let hushThought = () => {};
let shiftTimers: ReturnType<typeof setTimeout>[] = [];
let cycle: ReturnType<typeof setInterval> | undefined;
// puts the page's text back if the room goes away mid-glitch
let unscramble = () => {};
// Steins Gate dresses Asad in the lab coat for as long as it lasts; the outfit the owner picked (the
// prop, from the build) is untouched and comes back the moment the room leaves Steins Gate.
const shownOutfit = computed(() => (worldline.value === "steins-gate" ? "labcoat" : outfit));
// Fetch and decode an outfit's sheets ahead of need, so a swap never waits on an image.
const preloadOutfit = (o: string | undefined) =>
  (Object.keys(manifest.states) as SpriteState[])
    .filter((k) => k.startsWith("asad-"))
    .forEach((k) => {
      const img = new Image();
      img.src = spriteSheet(k, o);
      img.decode().catch(() => {});
    });
const pressMeter = () => {
  if (shifting.value) return; // one shift at a time; presses during one are ignored
  const to = nextWorldline(worldline.value);
  // the coat goes on when the shift settles, ~1 s from now: start fetching it now
  if (to === "steins-gate") preloadOutfit("labcoat");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "paused";
  announce.value = "";
  const enter = (phase: ShiftPhase) => {
    shift.value = phase;
    // the glitch jolts the whole page, not just the room (app.css, html[data-glitch])
    document.documentElement.toggleAttribute("data-glitch", phase === "glitch");
    // and the words on screen rearrange themselves, then settle back letter by letter (lib/scramble.ts)
    if (phase === "glitch") unscramble = scramblePage(document.body, { ms: 800 });
    if (phase === "cycle") cycle = setInterval(() => (reading.value = scramble()), 70);
    if (phase === "settle") {
      clearInterval(cycle);
      worldline.value = to;
      reading.value = to === "normal" ? undefined : DIVERGENCE[to];
      announce.value = `${worldlineLabel(to)}.`;
    }
    if (phase === "note" && to !== "normal") note.value = to;
    if (phase === "idle") note.value = null;
  };
  // the first phase starts now, in this click, so a second press in the same instant is already locked out
  const [first, ...rest] = shiftTimeline(to, reduced);
  enter(first.phase);
  shiftTimers = rest.map(({ at, phase }) => setTimeout(() => enter(phase), at));
};

onMounted(() => {
  // Fetch and decode every sheet Asad and Storm switch between once the page is idle, so a new state
  // (Storm setting off on a walk, say) never waits on its image or hitches while it decodes.
  const preload = () =>
    [
      ...(Object.keys(manifest.states) as SpriteState[])
        .filter((k) => /^(asad|storm)-/.test(k) && k !== "storm-nap")
        .map((k) => spriteSheet(k, outfit)),
      // the laptop he leaves on the rug when he gets up
      "/sprites/laptop-floor.png",
    ].forEach((src) => {
      const img = new Image();
      img.src = src;
      img.decode().catch(() => {});
    });
  if ("requestIdleCallback" in window) requestIdleCallback(preload, { timeout: 3000 });
  else setTimeout(preload, 1500);
  // client-only theme and saved lamp state (the build renders night, lamp on)
  const syncSky = () => (sky.value = document.documentElement.dataset.theme === "light" ? "day" : "night");
  syncSky();
  // the nav's theme button changes it too
  const themeWatch = new MutationObserver(syncSky);
  themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  stops.push(() => themeWatch.disconnect());
  try {
    if (localStorage.getItem("lamp") === "off") lamp.value = false;
  } catch {}

  // Asad types; every so often he sips coffee or stops to think (and hum), now and then glances
  // toward the window (more often when Storm is napping over there), and rarely stretches.
  let t: ReturnType<typeof setTimeout>;
  let stretchedAt = performance.now();
  let walkedAt = performance.now();
  let following = false;
  const typing = () => {
    asad.value = "typing";
    t = setTimeout(pause, 12000 + Math.random() * 12000);
  };
  const pause = () => {
    const now = performance.now();
    // Storm is "over by the window" when he's well left of Asad (his middle is about x 130)
    const next = nextPause(Math.random(), now - stretchedAt, position() < asadX.value + 40, now - walkedAt);
    if (next === "stretch") stretchedAt = now;
    if (next === "walk") return getUp("window");
    asad.value = next;
    t = setTimeout(typing, loopMs(`asad-${next}`));
  };
  // Up from the rug: he stands (setting the laptop down) and either walks to the window, looks out
  // and comes back, or (tapped twice) walks after the pointer along the floor until it has been
  // still for a while, or half a minute has passed, then goes back and sits down. Walking is a CSS
  // transition at his stride's pace; a new heading mid-walk starts from wherever he has got to.
  let walking = { from: 0, to: 0, at: 0, ms: 0 };
  const dxNow = () => {
    const { from, to, at, ms } = walking;
    return ms ? from + (to - from) * Math.min(1, (performance.now() - at) / ms) : to;
  };
  const walkTo = (dx: number) => {
    const from = dxNow();
    const ms = Math.abs(dx - from) / ASAD_SPEED;
    walking = { from, to: dx, at: performance.now(), ms };
    asadWalk.value = { dx, ms };
    if (ms > 0) asad.value = dx < from ? "walk-left" : "walk-right";
    return ms;
  };
  const sitDown = () => {
    clearTimeout(t);
    following = false;
    t = setTimeout(() => {
      asadX.value = 66;
      asad.value = "sitdown";
      t = setTimeout(() => {
        away.value = false;
        walkedAt = performance.now();
        typing();
      }, onceMs("asad-standup") + 300);
    }, walkTo(0));
  };
  let followUntil = 0;
  const follow = () => {
    const now = performance.now();
    if (now > followUntil || now - asadLured > 8000) return sitDown();
    const to = Math.min(FLOOR_DX[1], Math.max(FLOOR_DX[0], asadTarget - ASAD_HOME));
    if (Math.abs(to - walking.to) > 6) walkTo(to);
    else if (now >= walking.at + walking.ms && asad.value !== "stand") {
      asad.value = "stand";
      asadX.value = 66 + walking.to;
    }
    t = setTimeout(follow, 150);
  };
  const startFollowing = () => {
    clearTimeout(t);
    following = true;
    asadLured = followUntil = performance.now();
    followUntil += 30000;
    follow();
  };
  const getUp = (why: "window" | "follow") => {
    clearTimeout(t);
    away.value = true;
    asad.value = "standup";
    t = setTimeout(() => {
      if (why === "follow") return startFollowing();
      t = setTimeout(() => {
        asad.value = "window";
        asadX.value = 66 + WINDOW_DX;
        t = setTimeout(sitDown, 7000 + Math.random() * 6000);
      }, walkTo(WINDOW_DX));
    }, onceMs("asad-standup") + 300);
  };
  callAsad = () => {
    if (!away.value) getUp("follow");
    else if (following) sitDown();
    // already up (at the window, or on his way there or back): he comes along instead
    else if (asad.value !== "standup" && asad.value !== "sitdown") startFollowing();
  };
  t = setTimeout(pause, 8000);
  stops.push(() => clearTimeout(t));

  // Storm follows your pointer along the floor, wanders when ignored, naps, and stretches on waking.
  let x = 230;
  let decide: ReturnType<typeof setTimeout> | undefined;
  // he decides ten times a second; the compositor does the walking in between
  const next = () => (decide = setTimeout(() => loop(performance.now()), 100));
  let current: StormMode = "idle";
  let wander = 0;
  let busyUntil = 0;
  let dreamAt = 0;
  let bed: number | null = null; // where he naps: beside Asad, never in front of him
  // Touch screens have no hover to lure him, so he gets restless sooner there.
  const WANDER_AFTER = matchMedia("(hover: none)").matches ? 2000 : 6000;
  // The loop below only decides where Storm goes. Each walk is one linear animation from where he is
  // to where he's heading, at the same speed, so the compositor moves him and no frame restyles the
  // page (which is what made him stutter on phones).
  let roomW = root.value!.clientWidth;
  let from = x;
  let heading = x;
  let walk: Animation | undefined;
  const px = (at: number) => `translate3d(${((at - 32) / W) * roomW}px, 0, 0)`;
  // where he is now, read off the running walk, so the logic and the picture never disagree
  const position = () => {
    if (!walk) return x;
    const d = Number(walk.effect?.getTiming().duration) || 0;
    return d ? from + (heading - from) * Math.min(1, Number(walk.currentTime ?? 0) / d) : heading;
  };
  const glide = (to: number) => {
    x = from = position();
    heading = to;
    walk?.cancel();
    walk = storm.value!.animate([{ transform: px(x) }, { transform: px(to) }], {
      duration: Math.abs(to - x) / WALK_SPEED,
      easing: "linear",
      fill: "forwards",
    });
  };
  const resize = new ResizeObserver(() => {
    roomW = root.value!.clientWidth;
    glide(heading);
  });
  resize.observe(root.value!);
  stops.push(() => resize.disconnect());
  // off screen the loop stops; coming back, it picks up from where he was
  let shown = true;
  const io = new IntersectionObserver(([e]) => {
    shown = e.isIntersecting;
    clearTimeout(decide);
    if (shown) next();
    if (shown) planThought();
    else stopThought();
  });
  io.observe(root.value!);
  stops.push(() => io.disconnect());
  let facing = 1;
  lastInput = performance.now();
  const set = (m: StormMode) => {
    if (m !== current) {
      current = m;
      mode.value = m;
    }
  };
  const stretch = (now: number) => {
    set("stretch");
    busyUntil = now + STRETCH_MS;
  };
  const loop = (now: number) => {
    if (!shown) return;
    const idle = now - lastInput;
    if (now < busyUntil) {
      next();
      return;
    }
    if (current === "sleeping" || current === "dream") {
      if (idle < 400) stretch(now);
      else if (now > dreamAt) {
        // mostly curled up in a ball; now and then a short dream with kneading paws
        set(current === "sleeping" ? "dream" : "sleeping");
        dreamAt = now + (current === "dream" ? 4500 : 12000 + Math.random() * 10000);
      }
      next();
      return;
    }
    if (idle > 22000) {
      bed ??= Math.abs(x - BEDS[0]) < Math.abs(x - BEDS[1]) ? BEDS[0] : BEDS[1];
      target = bed;
    } else bed = null;
    // wander only once he's got where he was going, so a tap isn't overridden halfway there
    if (idle > WANDER_AFTER && idle <= 22000 && now > wander && Math.abs(target - x) <= 1) {
      target = 30 + Math.random() * 320;
      wander = now + 7000 + Math.random() * 6000;
    }
    const dx = target - x;
    if (Math.abs(dx) > 1) {
      if (Math.abs(target - heading) > 0.5) glide(target);
      x = position();
      set("standing");
      const face = dx > 0 ? 1 : -1; // art faces right
      if (face !== facing) {
        facing = face;
        storm.value!.style.setProperty("--flip", String(face));
      }
    } else if (current === "standing" && idle > WANDER_AFTER && Math.random() < 0.35) {
      stretch(now);
    } else if (idle > 22000 && bed !== null && Math.abs(x - bed) <= 1) {
      set("sleeping");
      dreamAt = now + 12000 + Math.random() * 10000;
    } else set("idle");
    next();
  };
  next();
  poke = () => {
    if (!shown) return;
    clearTimeout(decide);
    loop(performance.now());
  };
  stops.push(() => {
    clearTimeout(decide);
    walk?.cancel();
  });

  // Thoughts: one timeout chain. The first comes 20-40 s after the room is on screen, then 60-150 s
  // apart. A hidden tab or the room scrolled away stops the chain and the bubble; coming back starts
  // a fresh wait rather than speaking at once.
  let thoughtTimer: ReturnType<typeof setTimeout> | undefined;
  let spoken = false;
  let feature = featured;
  let last: string | undefined;
  let n = 0;
  function planThought() {
    clearTimeout(thoughtTimer);
    if (!shown || document.hidden || shifting.value || !thoughts.length) return;
    thoughtTimer = setTimeout(speak, nextWait(spoken));
  }
  function stopThought() {
    clearTimeout(thoughtTimer);
    thought.value = null;
  }
  const speak = () => {
    // Storm has the room (the visitor petted him: one bubble at a time), Asad's arms are up in a
    // stretch where the bubble goes, or he's up and following the pointer or on the move: try again shortly
    if (saying.value || following || ["stretch", "standup", "sitdown", "walk-left", "walk-right", "stand"].includes(asad.value)) {
      thoughtTimer = setTimeout(speak, 3000 + Math.random() * 3000);
      return;
    }
    const now = new Set<ThoughtContext>(["general"]);
    if (sky.value === "night") now.add("night");
    if (worldline.value === "steins-gate") now.add("steins-gate");
    // Storm is "nearby" within about half a body of Asad's middle
    if (Math.abs(position() - (asadX.value + 64)) < 56) now.add("storm");
    const t = pickThought(thoughts, now, last, feature);
    if (!t) return planThought();
    if (t.id === feature) feature = null;
    last = t.id;
    spoken = true;
    thought.value = { text: t.text, key: ++n };
    thoughtTimer = setTimeout(() => {
      thought.value = null;
      planThought();
    }, readMs(t.text));
  };
  hushThought = () => {
    if (!thought.value) return;
    stopThought();
    planThought();
  };
  const onVisibility = () => (document.hidden ? stopThought() : planThought());
  document.addEventListener("visibilitychange", onVisibility);
  // a worldline shift (and its note) has the room: no Thought during it, none queued; afterwards a fresh wait
  const unwatch = watch(shifting, (busy) => (busy ? stopThought() : planThought()));
  stops.push(() => {
    document.removeEventListener("visibilitychange", onVisibility);
    unwatch();
    clearTimeout(thoughtTimer);
  });
});
onBeforeUnmount(() => {
  stops.forEach((stop) => stop());
  clearTimeout(happyTimer);
  clearTimeout(sayTimer);
  shiftTimers.forEach(clearTimeout);
  document.documentElement.removeAttribute("data-glitch");
  unscramble();
  clearInterval(cycle);
});

const lure = (e: PointerEvent) => {
  if ((e.target as HTMLElement).closest("a,button")) return;
  if (e.type === "pointermove" && e.pointerType !== "mouse") return;
  const r = root.value!.getBoundingClientRect();
  target = Math.min(360, Math.max(24, ((e.clientX - r.left) / r.width) * W));
  lastInput = asadLured = performance.now();
  asadTarget = target;
  if (e.type === "pointerdown") poke();
};

const pet = () => {
  lastInput = performance.now();
  poke();
  // one bubble at a time, and Storm's (the visitor asked for it) wins; Asad's isn't queued
  hushThought();
  said.value = (said.value + 1) % mrrps.length;
  saying.value = true;
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => (saying.value = false), 2200);
  happy.value = true;
  clearTimeout(happyTimer);
  happyTimer = setTimeout(() => (happy.value = false), loopMs("asad-happy"));
};

// two presses on Asad within half a second (a double tap or double click, or Enter twice)
let tappedAt = 0;
const tapAsad = () => {
  const now = performance.now();
  if (now - tappedAt < 500) {
    tappedAt = 0;
    callAsad();
  } else tappedAt = now;
};

const toggleLamp = () => {
  try {
    localStorage.setItem("lamp", lamp.value ? "off" : "on");
  } catch {}
  lamp.value = !lamp.value;
};

const toggleTheme = () => {
  const next = sky.value === "day" ? "night" : "day";
  sky.value = next;
  const t = next === "day" ? "light" : "dark";
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("theme", t);
  } catch {}
};
</script>

<template>
  <figure class="room-wrap">
    <div
      ref="root"
      class="room"
      :data-sky="sky"
      :data-lamp="lamp ? 'on' : 'off'"
      :data-worldline="worldline"
      :data-shift="shift"
      @pointermove="lure"
      @pointerdown="lure"
    >
      <p class="sr-only">
        A pixel-art room: Asad sits on a rug typing on his laptop while Storm the cat wanders. There is a window, a
        bookshelf with a Nixie tube clock beneath it, a framed certificate, a clipboard, and a desk with a notebook, an ESP32 board, a robot car, a mug
        and a lamp.
      </p>
      <div
        v-for="name in ['sky-night', 'stars-a', 'stars-b', 'sky-day', 'clouds']"
        :key="name"
        :class="`layer layer-${name}`"
        :style="layer(name)"
      />
      <!-- Alpha's rain falls behind the window frame, so it only shows through the glass -->
      <div v-if="worldline === 'alpha'" class="wl-rain" :style="at(GLASS)">
        <span :style="{ backgroundImage: `url(/room/rain.png?v=${manifest.version})` }" />
      </div>
      <div v-for="name in ['room', 'sunbeam']" :key="name" :class="`layer layer-${name}`" :style="layer(name)" />
      <!-- drawn on the wall, so the night and lamp layers darken them with the rest of the room -->
      <svg class="wall-art" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-hidden="true">
        <!-- initials pressed into two hardcover spines -->
        <path class="initial initial-a" :d="glyph('A', 165, 26, GLYPHS)" />
        <path class="initial initial-s" :d="glyph('S', 194, 29, GLYPHS)" />
      </svg>
      <NixieClock part="glass" :reading="reading" />

      <div class="actor asad" :style="{ '--walk': asadWalk.dx, transitionDuration: `${asadWalk.ms}ms` }">
        <Sprite
          :state="happy && !away ? 'asad-happy' : asad === 'sitdown' ? 'asad-standup' : `asad-${asad}`"
          :outfit="shownOutfit"
          :size="128"
          :once="asad === 'standup' || asad === 'sitdown'"
          :reverse="asad === 'sitdown'"
        />
        <button type="button" class="asad-btn" aria-label="Asad (press twice to call him over)" data-cursor="plain" @click="tapAsad" />
      </div>
      <!-- the laptop he sets down on the rug while he's up (cut from the stand-up's last frame); it
           sits nearer than his feet, so he walks behind it, never over it -->
      <span v-if="away && asad !== 'standup' && asad !== 'sitdown'" class="laptop-floor" :style="at([137, 182, 28, 22])" aria-hidden="true" />
      <div class="actor robot">
        <Sprite state="robot-idle" :size="48" />
      </div>
      <!-- the mug is redrawn over the robot, so QROVER drives behind it, not over it -->
      <div class="layer layer-room room-front" :style="{ ...layer('room'), clipPath: clip(MUG) }" />
      <div ref="storm" class="actor storm" :data-mode="mode">
        <span class="storm-shadow" aria-hidden="true" />
        <button type="button" aria-label="Pet Storm" data-cursor="plain" @click="pet">
          <span v-if="saying" :key="said" class="storm-says" role="status">{{ mrrps[said] }}</span>
          <span v-if="mode === 'sleeping'" class="zzz" aria-hidden="true">z Z</span>
          <Sprite :state="`storm-${mode}`" :size="64" />
        </button>
      </div>

      <div v-for="name in ['night', 'dark', 'glow', 'bulb']" :key="name" :class="`layer layer-${name}`" :style="layer(name)" />
      <!-- a worldline's light over the whole room (Normal has none, so it stays exactly as drawn) -->
      <Transition name="wl">
        <div v-if="worldline !== 'normal'" :key="worldline" class="layer wl-tint" aria-hidden="true" />
      </Transition>
      <template v-if="worldline === 'steins-gate'">
        <div class="layer wl-gold" aria-hidden="true" />
        <span v-for="(b, i) in SPARKS" :key="i" class="wl-spark" :style="{ ...at(b), animationDelay: `${i * -0.9}s` }" />
      </template>
      <!-- the lit digits glow over the dark, like the LEDs; blank until the client knows the time -->
      <NixieClock part="lit" live :reading="reading" />
      <span class="fx fx-led" :style="at([286, 119, 2, 1])" />
      <span class="fx fx-router a" :style="at([238, 42, 1, 1])" />
      <span class="fx fx-router b" :style="at([242, 42, 1, 1])" />
      <span class="fx fx-router c" :style="at([246, 42, 1, 1])" />
      <span class="fx fx-steam" :style="at([338, 106, 1, 3])" />
      <span class="fx fx-steam two" :style="at([342, 104, 1, 3])" />

      <!-- flavour text, not content: hidden from screen readers and never announced -->
      <Transition name="thought">
        <span v-if="thought" :key="thought.key" class="asad-thought" :style="{ '--ax': asadX }" aria-hidden="true">{{
          thought.text
        }}</span>
      </Transition>

      <!-- the Easter egg: no label, just a faint glow on hover or focus -->
      <button
        type="button"
        class="meter"
        :style="at(METER)"
        aria-label="Divergence meter"
        aria-describedby="meter-state"
        @click="pressMeter"
      />
      <span id="meter-state" hidden>{{ worldlineLabel(worldline) }}. Activate to shift to the next worldline.</span>
      <Transition name="wl-note">
        <div v-if="note" :class="`wl-note wl-note-${note}`" aria-hidden="true">
          <template v-if="note === 'steins-gate'">
            <span>WORLDLINE <b>{{ DIVERGENCE[note] }}</b></span>
            <span>EL PSY KONGROO.</span>
            <small>STEINS GATE REACHED</small>
          </template>
          <template v-else>
            <span>{{ note === "alpha" ? "α" : "β" }} WORLDLINE</span>
            <b>{{ DIVERGENCE[note] }}</b>
          </template>
        </div>
      </Transition>

      <template v-for="s in spots" :key="s.id">
        <a v-if="s.href" :href="s.href" :class="`spot${s.below ? ' below' : ''}`" :data-label="s.label" :style="at(s.box)">
          <span class="sr-only">{{ s.label }}</span>
        </a>
        <a v-else :href="`mailto:${site.email}`" class="spot" :data-label="s.label" :style="at(s.box)">
          <span class="sr-only">{{ s.label }}: email Asad</span>
        </a>
      </template>
      <button
        type="button"
        class="spot"
        :data-label="lamp ? 'Lights off' : 'Lights on'"
        :style="at([336, 82, 40, 44])"
        :aria-pressed="lamp"
        @click="toggleLamp"
      >
        <span class="sr-only">Toggle the desk lamp</span>
      </button>
      <button
        type="button"
        class="spot below"
        :data-label="sky === 'day' ? 'Switch to night' : 'Switch to day'"
        :style="at([26, 16, 104, 92])"
        @click="toggleTheme"
      >
        <span class="sr-only">Switch between light and dark mode</span>
      </button>
    </div>
    <p class="sr-only" role="status">{{ announce }}</p>
    <figcaption class="room-caption">
      <span class="hint">{{ hint }}</span>
    </figcaption>
  </figure>
</template>
