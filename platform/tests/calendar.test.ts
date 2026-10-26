import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shiftForDate,
  calendarMonth,
  calendarToday,
} from "../src/lib/calendar";
test("original rotation keeps alternate five/two day weeks and four-week day/night blocks", () => {
  const totals = { day: 0, night: 0, off: 0 };
  for (let offset = 0; offset < 56; offset++) {
    const date = new Date(Date.UTC(2025, 10, 24 + offset));
    const shift = shiftForDate(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
    totals[shift]++;
    if (shift !== "off") assert.equal(shift, offset < 28 ? "night" : "day");
  }
  assert.deepEqual(totals, { day: 14, night: 14, off: 28 });
  assert.equal(shiftForDate(2025, 10, 24), "night");
  assert.equal(shiftForDate(2025, 10, 26), "off");
  assert.equal(shiftForDate(2025, 11, 3), "night");
  assert.equal(shiftForDate(2025, 11, 22), "day");
  assert.equal(shiftForDate(2025, 10, 19), "day");
});
test("calendar uses Monday-first weeks, leap days and Mauritius day boundaries", () => {
  const october = calendarMonth(2026, 9);
  assert.equal(october.findIndex(Boolean), 3);
  assert.equal(october.filter(Boolean).length, 31);
  assert.equal(calendarMonth(2028, 1).filter(Boolean).length, 29);
  assert.equal(october.length % 7, 0);
  assert.deepEqual(calendarToday(new Date("2026-10-25T21:00:00Z")), {
    year: 2026,
    month: 9,
    day: 26,
  });
});
