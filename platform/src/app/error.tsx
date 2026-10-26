"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <>
      <h1>Something interrupted this page.</h1>
      <p>Please try again. If this keeps happening, come back later.</p>
      <button onClick={reset}>Try again</button>
    </>
  );
}
