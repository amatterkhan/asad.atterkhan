import { ShiftCalendar } from "@/components/ShiftCalendar";
import { calendarToday } from "@/lib/calendar";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Calendar",
  description: "Asad’s shift calendar.",
  alternates: { canonical: "/calendar" },
};
export default function Calendar() {
  return (
    <>
      <div className="path">~/calendar</div>
      <h1>Shift calendar</h1>
      <p className="page-intro">My shift schedule, a month at a time.</p>
      <ShiftCalendar today={calendarToday()} />
    </>
  );
}
