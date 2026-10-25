"use client";
import Link from "next/link";
import { useState } from "react";
type ProjectEntry = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  categories: string[];
};
export function WorkbenchSearch({ projects }: { projects: ProjectEntry[] }) {
  const [query, setQuery] = useState("");
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const found = projects.filter((project) => {
    const text =
      `${project.title} ${project.description} ${project.tags.join(" ")} ${project.categories.join(" ")}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
  return (
    <>
      <div className="search notebook-search">
        <label className="sr-only" htmlFor="workbench-search">
          Find a project
        </label>
        <input
          id="workbench-search"
          type="search"
          placeholder="Search projects…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <p className="collection-count" role="status">
        {found.length} {found.length === 1 ? "project" : "projects"}
      </p>
      {found.map((project) => (
        <article className="entry project-entry" key={project.slug}>
          <div>
            <p className="meta">{project.categories.join(" · ")}</p>
            <h2>
              <Link href={`/workbench/${project.slug}`}>{project.title}</Link>
            </h2>
            <p>{project.description}</p>
            <div className="tag-list">
              {project.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </article>
      ))}
      {!found.length && (
        <div className="empty">
          <h2>No matching projects.</h2>
          <p>Try a title, topic, or technology.</p>
          <button onClick={() => setQuery("")}>Clear search</button>
        </div>
      )}
    </>
  );
}
