<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, type CSSProperties } from "vue";
import Sprite from "../components/Sprite.vue";
import NixieClock from "../components/NixieClock.vue";
import { glyph } from "../lib/nixie";
import { loopMs, manifest, type SpriteState } from "../lib/manifest";
import { spriteSheet } from "../lib/outfits";
import { site } from "../lib/site";

// The room is a 384x216 pixel-art scene drawn in LibreSprite (art/ase/room.ase), one PNG per layer.
const W = 384;
const H = 216;
const STRETCH_MS = loopMs("storm-stretch");
// Storm's planted paws travel one stride per walk cycle, so he moves at exactly that speed.
const WALK_SPEED = manifest.strideRoomPx / manifest.walkCycleMs;
// Nap spots on either side of Asad (he sits around x 104-156): rug end by the window, or by the chair.
const BEDS = [60, 188] as const;

const { hint, outfit } = defineProps<{ hint: string; outfit?: string }>();

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
const clip = ([x, y, w, h]: Box) =>
  `inset(${(y / H) * 100}% ${100 - ((x + w) / W) * 100}% ${100 - ((y + h) / H) * 100}% ${(x / W) * 100}%)`;

type StormMode = "idle" | "standing" | "sleeping" | "dream" | "stretch";

const root = useTemplateRef<HTMLDivElement>("root");
const storm = useTemplateRef<HTMLDivElement>("storm");
let target = 230;
let lastInput = 0;
// decide now rather than at the next tick, so a tap moves Storm at once (set up on mount)
let poke = () => {};
const sky = ref<"day" | "night">("night");
const lamp = ref(true);
const mode = ref<StormMode>("idle");
const asad = ref<"typing" | "coffee" | "idle">("typing");
const happy = ref(false);
const said = ref(-1);
let happyTimer: ReturnType<typeof setTimeout> | undefined;
const stops: (() => void)[] = [];

onMounted(() => {
  // Fetch and decode every sheet Asad and Storm switch between once the page is idle, so a new state
  // (Storm setting off on a walk, say) never waits on its image or hitches while it decodes.
  const preload = () =>
    (Object.keys(manifest.states) as SpriteState[])
      .filter((k) => /^(asad|storm)-/.test(k) && k !== "storm-nap")
      .forEach((k) => {
        const img = new Image();
        img.src = spriteSheet(k, outfit);
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

  // Asad types; every so often he sips coffee, or stops to think (and hum).
  let t: ReturnType<typeof setTimeout>;
  const typing = () => {
    asad.value = "typing";
    t = setTimeout(pause, 12000 + Math.random() * 12000);
  };
  const pause = () => {
    const next = Math.random() < 0.55 ? "coffee" : "idle";
    asad.value = next;
    t = setTimeout(typing, next === "coffee" ? loopMs("asad-coffee") : loopMs("asad-idle"));
  };
  t = setTimeout(pause, 8000);
  stops.push(() => clearTimeout(t));

  // Storm follows your pointer along the floor, wanders when ignored, naps, and stretches on waking.
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      duration: reduce ? 0 : Math.abs(to - x) / WALK_SPEED,
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
});
onBeforeUnmount(() => {
  stops.forEach((stop) => stop());
  clearTimeout(happyTimer);
});

const lure = (e: PointerEvent) => {
  if ((e.target as HTMLElement).closest("a,button")) return;
  if (e.type === "pointermove" && e.pointerType !== "mouse") return;
  const r = root.value!.getBoundingClientRect();
  target = Math.min(360, Math.max(24, ((e.clientX - r.left) / r.width) * W));
  lastInput = performance.now();
  if (e.type === "pointerdown") poke();
};

const pet = () => {
  lastInput = performance.now();
  poke();
  said.value = (said.value + 1) % mrrps.length;
  happy.value = true;
  clearTimeout(happyTimer);
  happyTimer = setTimeout(() => (happy.value = false), loopMs("asad-happy"));
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
      @pointermove="lure"
      @pointerdown="lure"
    >
      <p class="sr-only">
        A pixel-art room: Asad sits on a rug typing on his laptop while Storm the cat wanders. There is a window, a
        bookshelf with a Nixie tube clock beneath it, a framed certificate, a clipboard, and a desk with a notebook, an ESP32 board, a robot car, a mug
        and a lamp.
      </p>
      <div
        v-for="name in ['sky-night', 'stars-a', 'stars-b', 'sky-day', 'clouds', 'room', 'sunbeam']"
        :key="name"
        :class="`layer layer-${name}`"
        :style="layer(name)"
      />
      <!-- drawn on the wall, so the night and lamp layers darken them with the rest of the room -->
      <svg class="wall-art" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-hidden="true">
        <!-- initials pressed into two hardcover spines -->
        <path class="initial initial-a" :d="glyph('A', 165, 26, GLYPHS)" />
        <path class="initial initial-s" :d="glyph('S', 194, 29, GLYPHS)" />
      </svg>
      <NixieClock part="glass" />

      <div class="actor asad">
        <Sprite :state="happy ? 'asad-happy' : `asad-${asad}`" :outfit="outfit" :size="128" />
      </div>
      <div class="actor robot">
        <Sprite state="robot-idle" :size="48" />
      </div>
      <!-- the mug is redrawn over the robot, so QROVER drives behind it, not over it -->
      <div class="layer layer-room room-front" :style="{ ...layer('room'), clipPath: clip(MUG) }" />
      <div ref="storm" class="actor storm" :data-mode="mode">
        <span class="storm-shadow" aria-hidden="true" />
        <button type="button" aria-label="Pet Storm" data-cursor="plain" @click="pet">
          <span v-if="said >= 0" :key="said" class="storm-says" role="status">{{ mrrps[said] }}</span>
          <span v-if="mode === 'sleeping'" class="zzz" aria-hidden="true">z Z</span>
          <Sprite :state="`storm-${mode}`" :size="64" />
        </button>
      </div>

      <div v-for="name in ['night', 'dark', 'glow', 'bulb']" :key="name" :class="`layer layer-${name}`" :style="layer(name)" />
      <!-- the lit digits glow over the dark, like the LEDs; blank until the client knows the time -->
      <NixieClock part="lit" live />
      <span class="fx fx-led" :style="at([286, 119, 2, 1])" />
      <span class="fx fx-router a" :style="at([238, 42, 1, 1])" />
      <span class="fx fx-router b" :style="at([242, 42, 1, 1])" />
      <span class="fx fx-router c" :style="at([246, 42, 1, 1])" />
      <span class="fx fx-steam" :style="at([338, 106, 1, 3])" />
      <span class="fx fx-steam two" :style="at([342, 104, 1, 3])" />

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
    <figcaption class="room-caption">
      <span class="hint">{{ hint }}</span>
    </figcaption>
  </figure>
</template>
