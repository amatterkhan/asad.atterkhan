import { apiError, requireOwner } from "@/lib/admin";
import { calendarMonth, calendarToday, shiftForDate } from "@/lib/calendar";

// Owner-only: the shift rotation never ships to the browser. Visitors get 401/403/503.
// Local development (127.0.0.1) skips sign-in so the page can be previewed.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (process.env.NODE_ENV !== "development") await requireOwner(request, { service: "calendar" });
    const url = new URL(request.url);
    const today = calendarToday();
    const year = Number(url.searchParams.get("year") ?? today.year);
    const month = Number(url.searchParams.get("month") ?? today.month);
    if (!Number.isInteger(year) || year < 2020 || year > 2100 || !Number.isInteger(month) || month < 0 || month > 11)
      return Response.json({ error: "Invalid month" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    const upcoming = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.UTC(today.year, today.month, today.day + i));
      const [y, m, day] = [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
      return { iso: d.toISOString().slice(0, 10), shift: shiftForDate(y, m, day) };
    });
    return Response.json(
      { year, month, today, cells: calendarMonth(year, month), upcoming },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
