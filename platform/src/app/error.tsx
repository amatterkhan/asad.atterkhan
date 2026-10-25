"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <>
      <h1>Something interrupted this page.</h1>
      <p>Please try again. No private error details are shown here.</p>
      <button onClick={reset}>Try again</button>
    </>
  );
}
