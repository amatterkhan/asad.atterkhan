"use client";
import { useEffect } from "react";

/** Pauses CSS animation while the tab is hidden (reduced-motion is handled in CSS). */
export function TabVisibility() {
  useEffect(() => {
    const update = () => {
      document.documentElement.dataset.visibility = document.hidden ? "hidden" : "visible";
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return null;
}
