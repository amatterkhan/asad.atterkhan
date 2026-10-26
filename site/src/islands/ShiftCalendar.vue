<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import type { User } from "firebase/auth";
import OwnerSignIn from "./OwnerSignIn.vue";

// Owner-only shift calendar. The rotation lives on the server: data comes from
// GET /api/owner/calendar after sign-in (`open` skips sign-in on the local dev server only).
type Shift = "day" | "night" | "off";
type Cell = { day: number; shift: Shift; iso: string } | null;
type Data = {
  year: number;
  month: number;
  today: { year: number; month: number; day: number };
  cells: Cell[];
  upcoming: { iso: string; shift: Shift }[];
};
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LABEL: Record<Shift, string> = { night: "Night", day: "Day", off: "Off" };
const ICON: Record<Shift, string> = { night: "☾", day: "☀", off: "·" };
const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z"));

const { open = false } = defineProps<{ open?: boolean }>();
const user = shallowRef<User | null>(null);
const status = ref("");
const data = shallowRef<Data | null>(null);
const view = ref<{ year: number; month: number } | null>(null);

async function load(target?: { year: number; month: number } | null) {
  const q = target ? `?year=${target.year}&month=${target.month}` : "";
  const headers: HeadersInit = user.value ? { Authorization: `Bearer ${await user.value.getIdToken()}` } : {};
  try {
    const res = await fetch(`/api/owner/calendar${q}`, { headers, cache: "no-store" });
    const body = await res.json();
    if (!res.ok) {
      status.value = body.error || "The calendar could not be loaded";
      return;
    }
    status.value = "";
    data.value = body;
  } catch {
    status.value = "The calendar could not be loaded";
  }
}
onMounted(() =>
  watch(
    [() => open, user, view],
    () => {
      if (open || user.value) void load(view.value);
    },
    { immediate: true },
  ),
);

const monthName = computed(() =>
  data.value
    ? new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
        new Date(Date.UTC(data.value.year, data.value.month, 1)),
      )
    : "",
);
const count = computed(() => {
  const c = { day: 0, night: 0, off: 0 };
  data.value?.cells.forEach((cell) => cell && c[cell.shift]++);
  return c;
});
const weeks = computed(() => {
  const cells = data.value?.cells ?? [];
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
});
const move = (delta: number) => {
  const d = new Date(Date.UTC(data.value!.year, data.value!.month + delta, 1));
  view.value = { year: d.getUTCFullYear(), month: d.getUTCMonth() };
};
const isToday = (c: Cell) =>
  !!c && !!data.value && c.day === data.value.today.day && data.value.month === data.value.today.month && data.value.year === data.value.today.year;
const next = computed(() => data.value?.upcoming.find((u, i) => i > 0 && u.shift !== "off"));
const goToday = () => (view.value = { year: data.value!.today.year, month: data.value!.today.month });
</script>
<template>
  <section v-if="!open && !user" class="calendar-locked" aria-label="Private calendar">
    <p class="eyebrow">Locked</p>
    <h2>This one is just for me.</h2>
    <p>Sign in with the owner account to see the rotation.</p>
    <OwnerSignIn :user="user" @user="(u) => (user = u)" @status="(s) => (status = s)" />
    <p v-if="status" class="calendar-status" role="status">{{ status }}</p>
  </section>
  <p v-else-if="!data" class="calendar-status" role="status">{{ status || "Loading the rotation…" }}</p>
  <section v-else class="shift-calendar" aria-label="Shift calendar">
    <div class="calendar-next">
      <p class="eyebrow">Next two weeks</p>
      <ol>
        <li v-for="(u, i) in data.upcoming" :key="u.iso" :class="`shift-${u.shift}${i === 0 ? ' is-today' : ''}`">
          <span class="d">{{ i === 0 ? "Today" : fmt(u.iso, { weekday: "short" }) }}</span>
          <span class="n">{{ fmt(u.iso, { day: "numeric" }) }}</span>
          <span class="s" :aria-label="LABEL[u.shift]">{{ ICON[u.shift] }}</span>
        </li>
      </ol>
      <p v-if="next" class="calendar-note">
        Next shift: {{ fmt(next.iso, { weekday: "long", day: "numeric", month: "long" }) }} · {{ LABEL[next.shift] }}
      </p>
    </div>

    <div class="calendar-toolbar">
      <button aria-label="Previous month" @click="move(-1)">←</button>
      <h2 aria-live="polite">{{ monthName }}</h2>
      <button aria-label="Next month" @click="move(1)">→</button>
      <button class="calendar-today" @click="goToday">Today</button>
    </div>

    <dl class="calendar-summary">
      <div>
        <dt>Work days</dt>
        <dd>{{ count.day + count.night }}</dd>
      </div>
      <div class="shift-night">
        <dt>Nights</dt>
        <dd>{{ count.night }}</dd>
      </div>
      <div class="shift-day">
        <dt>Days</dt>
        <dd>{{ count.day }}</dd>
      </div>
      <div>
        <dt>Off</dt>
        <dd>{{ count.off }}</dd>
      </div>
    </dl>

    <table class="calendar-grid">
      <caption class="sr-only">{{ monthName }}, shifts in Mauritius time</caption>
      <thead>
        <tr>
          <th v-for="d in DAYS" :key="d" scope="col">{{ d }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(week, w) in weeks" :key="w">
          <td v-for="(c, i) in week" :key="i" :class="c ? `shift-${c.shift}${isToday(c) ? ' is-today' : ''}` : 'calendar-blank'">
            <template v-if="c">
              <time :datetime="c.iso" :aria-current="isToday(c) ? 'date' : undefined">{{ c.day }}</time>
              <span v-if="c.shift !== 'off'" class="chip"><span aria-hidden="true">{{ ICON[c.shift] }}</span> {{ LABEL[c.shift] }}</span>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
    <p class="calendar-note">
      Alternating five-day and two-day weeks; four weeks of nights, then four weeks of days. Mauritius time.
    </p>
  </section>
</template>
