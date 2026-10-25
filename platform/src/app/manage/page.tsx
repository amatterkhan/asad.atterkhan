import { notFound } from "next/navigation";
import { DocumentManager } from "@/components/DocumentManager";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Private content desk",
  robots: { index: false, follow: false },
};
export default function Manage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <>
      <div className="path">~/private · local owner tool</div>
      <h1>Content desk.</h1>
      <p className="page-intro">
        Choose the achievements shown on Experience and manage documents.
        Uploads start private. Publishing creates a separate, reviewed public
        copy. This interface is available only on the local development server.
      </p>
      <DocumentManager />
    </>
  );
}
