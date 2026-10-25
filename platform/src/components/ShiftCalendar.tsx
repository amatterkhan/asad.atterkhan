"use client";
import { useState } from "react";
import { calendarMonth, calendarToday } from "@/lib/calendar";
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export function ShiftCalendar({
  today,
}: {
  today: { year: number; month: number; day: number };
}) {
  const [selected, setSelected] = useState(today);
  const cells = calendarMonth(selected.year, selected.month);
  const monthName = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(selected.year, selected.month, 1)));
  const summary = { day: 0, night: 0, off: 0 };
  cells.forEach((cell) => {
    if (cell) summary[cell.shift]++;
  });
  function move(delta: number) {
    const next = new Date(Date.UTC(selected.year, selected.month + delta, 1));
    setSelected({
      year: next.getUTCFullYear(),
      month: next.getUTCMonth(),
      day: 1,
    });
  }
  return (
    <section className="shift-calendar" aria-label="Shift calendar">
      <div className="calendar-toolbar">
        <div>
          <button aria-label="Previous month" onClick={() => move(-1)}>
            ←
          </button>
          <h2 aria-live="polite">{monthName}</h2>
          <button aria-label="Next month" onClick={() => move(1)}>
            →
          </button>
        </div>
        <button onClick={() => setSelected(calendarToday())}>Today</button>
      </div>
      <dl className="calendar-summary">
        <div>
          <dt>Work days</dt>
          <dd>{summary.day + summary.night}</dd>
        </div>
        <div>
          <dt>Night shifts</dt>
          <dd>{summary.night}</dd>
        </div>
        <div>
          <dt>Day shifts</dt>
          <dd>{summary.day}</dd>
        </div>
        <div>
          <dt>Days off</dt>
          <dd>{summary.off}</dd>
        </div>
      </dl>
      <table className="calendar-grid">
        <caption className="sr-only">{monthName} · shifts in Mauritius</caption>
        <thead>
          <tr>
            {days.map((day) => (
              <th scope="col" key={day}>
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: cells.length / 7 }, (_, week) => (
            <tr key={week}>
              {cells.slice(week * 7, week * 7 + 7).map((cell, i) => {
                const isToday =
                  cell?.day === today.day &&
                  selected.month === today.month &&
                  selected.year === today.year;
                return (
                  <td
                    key={i}
                    className={
                      cell
                        ? `shift-${cell.shift}${isToday ? " is-today" : ""}`
                        : "calendar-blank"
                    }
                  >
                    {cell && (
                      <>
                        <time
                          dateTime={cell.iso}
                          aria-current={isToday ? "date" : undefined}
                        >
                          {cell.day}
                        </time>
                        <span>
                          {cell.shift === "night"
                            ? "☾ Night"
                            : cell.shift === "day"
                              ? "☀ Day"
                              : "Off"}
                        </span>
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="calendar-note">
        The original alternating five-day / two-day rotation, with four weeks of
        nights followed by four weeks of days. Dates use Mauritius time.
      </p>
    </section>
  );
}
