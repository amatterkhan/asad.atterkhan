"use client";
import Link from "next/link";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main>
          <h1>This page couldn’t be loaded.</h1>
          <p>Please try again. If this keeps happening, come back later.</p>
          <button onClick={reset}>Try again</button>
          <p><Link href="/">Return home</Link></p>
        </main>
      </body>
    </html>
  );
}
