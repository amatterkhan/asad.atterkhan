import { AdminDesk } from "@/components/AdminDesk";

// Owner-only writing desk: unlinked, not indexed. All data goes through /api/admin/* after sign-in.
export const dynamic = "force-dynamic";
export const metadata = { title: "Desk", robots: { index: false, follow: false } };

export default function Admin() {
  return (
    <>
      <p className="eyebrow">Private</p>
      <h1>Writing desk</h1>
      <p className="page-intro">Write notes for The Lab and edit the words on the site.</p>
      <AdminDesk />
    </>
  );
}
