"use client";
import { useState } from "react";
import type { Achievement } from "@/lib/achievements";
export function AchievementCollection({ records }: { records: Achievement[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const kinds = [...new Set(records.map((record) => record.kind))];
  const found = records.filter(
    (record) =>
      (kind === "all" || record.kind === kind) &&
      `${record.title} ${record.issuer}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="search notebook-search">
        <label className="sr-only" htmlFor="achievement-search">
          Find an achievement
        </label>
        <input
          id="achievement-search"
          type="search"
          placeholder="Search credentials…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {kinds.length > 1 && (
        <div className="filters" role="group" aria-label="Achievement types">
          {["all", ...kinds].map((value) => (
            <button
              key={value}
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
            >
              {value === "all"
                ? "All"
                : value === "certification"
                  ? "Certifications"
                  : value === "badge"
                    ? "Badges"
                    : "Awards"}
            </button>
          ))}
        </div>
      )}
      <p className="collection-count" role="status">
        {found.length} {found.length === 1 ? "achievement" : "achievements"}
      </p>
      <ul className="achievement-collection" role="list">
        {found.map((record) => (
          <li key={record.id}>
            <span className="credential-symbol" aria-hidden="true">
              {record.kind === "badge" ? "✧" : "◇"}
            </span>
            <div>
              <p className="meta">
                {record.issuer} · {record.kind}
              </p>
              <h2>
                <a href={record.link}>{record.title} ↗</a>
              </h2>
              {record.earnedAt && (
                <p className="meta">
                  <time dateTime={record.earnedAt}>{record.earnedAt}</time>
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
      {!found.length && (
        <p className="quiet-note">
          No matching achievements. Try a title or issuer.
        </p>
      )}
    </>
  );
}
