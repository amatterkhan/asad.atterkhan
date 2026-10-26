import { ShiftCalendar } from "@/components/ShiftCalendar";
import { RoomVignette } from "@/components/RoomVignette";

// Private: not linked anywhere, not in the sitemap, not indexed. Shifts load only for the owner.
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Calendar",
  robots: { index: false, follow: false },
};
export default function Calendar() {
  return (
    <>
      <p className="eyebrow">Private</p>
      <h1>Shift calendar</h1>
      <p className="page-intro">My rotation, a month at a time. Only I can see this page.</p>
      <RoomVignette corner="calendar" />
      <ShiftCalendar open={process.env.NODE_ENV === "development"} />
    </>
  );
}
