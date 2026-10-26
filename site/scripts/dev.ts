import { createServer as createHttpServer } from "node:http";
import path from "node:path";
import { createServer } from "vite";

// Development server: Vite in middleware mode, each page server-rendered on request (so content
// and component edits show on reload), islands hydrated with HMR. /api is proxied to the Go API.
const root = path.resolve(import.meta.dirname, "..");
const port = Number(process.env.PORT || 4190);
const vite = await createServer({ root, server: { middlewareMode: true }, appType: "custom" });
const tags = `<link rel="stylesheet" href="/src/styles/app.css">\n    <script type="module" src="/@vite/client"></script>\n    <script type="module" src="/src/entry-client.ts"></script>`;

createHttpServer((req, res) => {
  vite.middlewares(req, res, async () => {
    const url = req.url || "/";
    try {
      const { render } = await vite.ssrLoadModule("/src/entry-server.ts");
      const { status, html } = await render(url.split("?")[0], { dev: true, root }, { tags });
      res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      console.error(e);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(String((e as Error).stack));
    }
  });
}).listen(port, "127.0.0.1", () => console.log(`site dev server: http://127.0.0.1:${port}`));
