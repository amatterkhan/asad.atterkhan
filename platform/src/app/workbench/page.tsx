import { WorkbenchSearch } from "@/components/WorkbenchSearch";
import { getProjects } from "@/lib/content";
export const metadata = {
  title: "Workbench",
  alternates: { canonical: "/workbench" },
};
export default async function Projects() {
  const projects = (await getProjects()).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  return (
    <>
      <p className="eyebrow">Things I&apos;ve built</p>
      <h1>Workbench</h1>
      <p className="page-intro">
        Websites, tools, and the occasional piece of hardware.
        <br />
        Some are small experiments. Others have a life beyond my desk.
      </p>
      <WorkbenchSearch
        projects={projects.map(
          ({ slug, title, description, tags, categories }) => ({
            slug,
            title,
            description,
            tags,
            categories,
          }),
        )}
      />
    </>
  );
}
