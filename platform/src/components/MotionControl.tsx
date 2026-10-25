"use client";
import { useEffect, useState } from "react";
export function MotionControl() {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.motion = paused ? "paused" : "running";
  }, [paused]);
  useEffect(() => {
    const update = () => {
      document.documentElement.dataset.visibility = document.hidden
        ? "hidden"
        : "visible";
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return (
    <button
      className="motion-control"
      type="button"
      aria-pressed={paused}
      onClick={() => setPaused((value) => !value)}
    >
      <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span>{" "}
      {paused ? "Resume motion" : "Pause motion"}
    </button>
  );
}
