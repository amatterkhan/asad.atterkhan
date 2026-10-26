import { WorkbenchSearch } from "@/components/WorkbenchSearch";
import { getProjects } from "@/lib/content";
import { RoomVignette } from "@/components/RoomVignette";
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
        Websites, tools, and the occasional piece of hardware. Some are small
        experiments; others have a life beyond my desk.
      </p>
      <RoomVignette corner="bench" />
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
