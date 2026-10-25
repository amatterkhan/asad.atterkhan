"use client";
import { useEffect, useState } from "react";
declare global {
  interface Window {
    axe: typeof import("axe-core");
  }
}
export function ViewportProbe() {
  const [report, setReport] = useState("");
  useEffect(() => {
    if (!location.search.includes("qa=1")) return;
    let cancelled = false;
    const script = document.createElement("script");
    script.src = "/api/dev/axe";
    script.onload = async () => {
      await document.fonts.ready;
      if (cancelled) return;
      const axe = window.axe;
      const result = await axe.run(document, {
        iframes: false,
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      });
      if (cancelled) return;
      const info = {
        type: "asad-layout-report",
        path: location.pathname,
        width: window.innerWidth,
        contentWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        violations: result.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.map((n) => n.target),
        })),
      };
      setReport(JSON.stringify(info));
      if (window.self !== window.top)
        window.parent.postMessage(info, location.origin);
    };
    document.head.append(script);
    return () => {
      cancelled = true;
      script.remove();
    };
  }, []);
  return (
    <output className="sr-only" data-qa-report>
      {report}
    </output>
  );
}
