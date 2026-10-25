"use client";
import { useState } from "react";
import reports from "../../docs/layout-checks.json";
export function ResponsiveReview() {
  const [path, setPath] = useState("/");
  const selected = reports.filter((r) => r.path === path);
  return (
    <>
      <label>
        Review page{" "}
        <select value={path} onChange={(e) => setPath(e.target.value)}>
          {[
            ["/", "Home"],
            ["/lab", "The Lab"],
            ["/preview/reading-layout", "Article fixture"],
            ["/workbench", "Workbench"],
            ["/experience", "Experience"],
            ["/about", "About"],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p className="quiet-note">
        Recorded desktop Chrome checks from 25 October 2026, using actual
        browser viewport overrides and axe WCAG A/AA analysis. These are
        implementation evidence, not live monitoring or physical iPhone results.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Viewport</th>
              <th>Page overflow</th>
              <th>Automated findings</th>
            </tr>
          </thead>
          <tbody>
            {selected
              .sort((a, b) => a.width - b.width)
              .map((r) => (
                <tr key={r.width}>
                  <td>{r.width} px</td>
                  <td>
                    {r.scrollWidth > r.contentWidth ? "Detected" : "None"}
                  </td>
                  <td>{r.violations.length}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="text-links">
        <a href={path}>Open page →</a>
        <a href={`${path}?qa=1`}>Run accessibility probe →</a>
      </div>
      <p className="quiet-note">
        The probe exposes a screen-reader-only JSON output after checking the
        page. CI additionally contains Chromium, Firefox, WebKit, and
        iPhone-emulation projects.
      </p>
    </>
  );
}
