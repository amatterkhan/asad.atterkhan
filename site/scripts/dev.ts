import { createServer as createHttpServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";

// Development server: Vite in middleware mode, each page server-rendered on request (so content
// and component edits show on reload), islands hydrated with HMR. /api is proxied to the Go API.
const root = path.resolve(import.meta.dirname, "..");
const port = Number(process.env.PORT || 4190);
const vite = await createServer({ root, server: { middlewareMode: true, hmr: { port: Number(process.env.HMR_PORT || 24678) } }, appType: "custom" });
const tags = `<link rel="stylesheet" href="/src/styles/app.css">\n    <script type="module" src="/@vite/client"></script>\n    <script type="module" src="/src/entry-client.ts"></script>`;

createHttpServer((req, res) => {
  vite.middlewares(req, res, async () => {
    const url = req.url || "/";
    try {
      if (url.startsWith("/lab-media/")) {
        const content = await vite.ssrLoadModule("/src/lib/content.server.ts");
        const name = url.slice(11).split("?")[0];
        // a reloaded module starts with an empty map; resolving the articles fills it again
        if (!content.thumbnailSources().has(name)) await content.getArticles();
        const source = (content.thumbnailSources() as Map<string, string>).get(name);
        if (!source) throw Object.assign(new Error("Not found"), { status: 404 });
        const ext = path.extname(source).slice(1);
        res.writeHead(200, { "Content-Type": `image/${ext === "jpg" ? "jpeg" : ext}` });
        res.end(await readFile(source));
        return;
      }
      const { render } = await vite.ssrLoadModule("/src/entry-server.ts");
      const { status, html } = await render(url.split("?")[0], { dev: true, root }, { tags });
      res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    } catch (e) {
      if ((e as { status?: number }).status === 404) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
        return;
      }
      vite.ssrFixStacktrace(e as Error);
      console.error(e);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(String((e as Error).stack));
    }
  });
}).listen(port, "127.0.0.1", () => console.log(`site dev server: http://127.0.0.1:${port}`));
