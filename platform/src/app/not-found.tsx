import Link from "next/link";
export default function NotFound() {
  return (
    <>
      <div className="path">404 · path not found</div>
      <h1>Nothing here, yet.</h1>
      <p>This page may have moved, or the address may be wrong.</p>
      <div className="text-links">
        <Link href="/">Back home →</Link>
        <Link href="/lab">Explore The Lab →</Link>
      </div>
    </>
  );
}
