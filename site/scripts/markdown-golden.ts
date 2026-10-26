import fs from "node:fs/promises";
import path from "node:path";
import { renderMarkdown } from "../src/lib/markdown";
const dir = path.resolve("tests/fixtures/markdown");
await fs.mkdir(dir, { recursive: true });
for (const file of (await fs.readdir(dir)).filter((f) => f.endsWith(".md"))) {
  const rendered = await renderMarkdown(
    await fs.readFile(path.join(dir, file), "utf8"),
  );
  await fs.writeFile(
    path.join(dir, file.replace(/\.md$/, ".html")),
    rendered.html,
  );
  await fs.writeFile(
    path.join(dir, file.replace(/\.md$/, ".toc.json")),
    JSON.stringify(rendered.toc, null, 2) + "\n",
  );
}
