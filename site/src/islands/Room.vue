<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, type CSSProperties } from "vue";
import Sprite from "../components/Sprite.vue";
import { loopMs, manifest } from "../lib/manifest";
import { site } from "../lib/site";

// The room is a 384x216 pixel-art scene drawn in LibreSprite (art/ase/room.ase), one PNG per layer.
const W = 384;
const H = 216;
const STRETCH_MS = loopMs("storm-stretch");
// Storm's planted paws travel one stride per walk cycle, so he moves at exactly that speed.
const WALK_SPEED = manifest.strideRoomPx / manifest.walkCycleMs;
// Nap spots on either side of Asad (he sits around x 104-156): rug end by the window, or by the chair.
const BEDS = [60, 188] as const;

const { hint } = defineProps<{ hint: string }>();

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
const layer = (name: string) => ({ backgroundImage: `url(/room/${name}.png?v=${manifest.version})` });
const MUG: Box = [332, 110, 17, 14];
const clip = ([x, y, w, h]: Box) =>
  `inset(${(y / H) * 100}% ${100 - ((x + w) / W) * 100}% ${100 - ((y + h) / H) * 100}% ${(x / W) * 100}%)`;

type StormMode = "idle" | "standing" | "sleeping" | "dream" | "stretch";

const root = useTemplateRef<HTMLDivElement>("root");
const storm = useTemplateRef<HTMLDivElement>("storm");
let target = 230;
let lastInput = 0;
const sky = ref<"day" | "night">("night");
const clock = ref("");
const lamp = ref(true);
const mode = ref<StormMode>("idle");
const asad = ref<"typing" | "coffee" | "idle">("typing");
const happy = ref(false);
const said = ref(-1);
let happyTimer: ReturnType<typeof setTimeout> | undefined;
const stops: (() => void)[] = [];

onMounted(() => {
  // client-only clock, theme and saved lamp state (the build renders night, lamp on, no time)
  const tick = () => (clock.value = mauritiusTime());
  tick();
  sky.value = document.documentElement.dataset.theme === "light" ? "day" : "night";
  const clockId = setInterval(tick, 30000);
  try {
    if (localStorage.getItem("lamp") === "off") lamp.value = false;
  } catch {}
  stops.push(() => clearInterval(clockId));

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
  let raf = 0;
  let last = performance.now();
  let current: StormMode = "idle";
  let wander = 0;
  let busyUntil = 0;
  let dreamAt = 0;
  let bed: number | null = null; // where he naps: beside Asad, never in front of him
  lastInput = last;
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
    const dt = Math.min(now - last, 50);
    last = now;
    const idle = now - lastInput;
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
      target = bed;
    } else bed = null;
    if (idle > 6000 && idle <= 22000 && now > wander) {
      target = 30 + Math.random() * 320;
      wander = now + 7000 + Math.random() * 6000;
    }
    const dx = target - x;
    if (Math.abs(dx) > 1) {
      x += reduce ? dx : Math.sign(dx) * Math.min(Math.abs(dx), dt * WALK_SPEED);
      set("standing");
      storm.value?.style.setProperty("--flip", dx > 0 ? "1" : "-1"); // art faces right
    } else if (current === "standing" && idle > 6000 && Math.random() < 0.35) {
      stretch(now);
    } else if (idle > 22000 && bed !== null && Math.abs(x - bed) <= 1) {
      set("sleeping");
      dreamAt = now + 12000 + Math.random() * 10000;
    } else set("idle");
    storm.value?.style.setProperty("--x", x.toFixed(1));
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  stops.push(() => cancelAnimationFrame(raf));
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
};

const pet = () => {
  lastInput = performance.now();
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
        bookshelf, a framed certificate, a clipboard, and a desk with a notebook, an ESP32 board, a robot car, a mug
        and a lamp.
      </p>
      <div
        v-for="name in ['sky-night', 'stars-a', 'stars-b', 'sky-day', 'clouds', 'room', 'sunbeam']"
        :key="name"
        :class="`layer layer-${name}`"
        :style="layer(name)"
      />

      <div class="actor asad">
        <Sprite :state="happy ? 'asad-happy' : `asad-${asad}`" :size="128" />
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
      <span>It's {{ clock || "--:--" }} in Mauritius.</span>
      <span class="hint">{{ hint }}</span>
    </figcaption>
  </figure>
</template>
