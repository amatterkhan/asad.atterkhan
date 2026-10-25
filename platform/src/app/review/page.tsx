import { notFound } from "next/navigation";
import { ResponsiveReview } from "@/components/ResponsiveReview";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Local responsive review",
  robots: { index: false, follow: false },
};
export default function Review() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <>
      <div className="path">~/review · local development only</div>
      <h1>Responsive review.</h1>
      <ResponsiveReview />
    </>
  );
}
