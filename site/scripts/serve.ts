import { createServer, request } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

// Serves dist/ the way Firebase Hosting does with site/firebase.json: clean URLs, 404.html,
// redirects for old paths, and /api, /files, /media forwarded to the Go API (API_ORIGIN).
const dist = path.resolve(import.meta.dirname, "../dist");
const port = Number(process.env.PORT || 4191);
const api = new URL(process.env.API_ORIGIN || "http://127.0.0.1:8081");
const config = JSON.parse(await fs.readFile(path.resolve(import.meta.dirname, "../firebase.json"), "utf8")).hosting;
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};
const file = async (p: string) => {
  try {
    const s = await fs.stat(p);
    return s.isFile() ? p : null;
  } catch {
    return null;
  }
};

createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://x");
  const p = decodeURIComponent(url.pathname);
  for (const r of config.redirects as { source: string; destination: string }[]) {
    const re = new RegExp("^" + r.source.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$");
    const m = p.match(re);
    if (m) {
      res.writeHead(301, { Location: r.destination.replace(/:(\w+)/g, (_, k) => m.groups![k]) });
      return res.end();
    }
  }
  if (/^\/(api|files|media)(\/|$)/.test(p)) {
    const proxied = request({ host: api.hostname, port: api.port, path: req.url, method: req.method, headers: req.headers }, (r) => {
      res.writeHead(r.statusCode || 502, r.headers);
      r.pipe(res);
    });
    proxied.on("error", () => {
      res.writeHead(502, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ error: "API is not running" }));
    });
    return req.pipe(proxied);
  }
  if (p.includes("..")) {
    res.writeHead(400);
    return res.end();
  }
  const found =
    (await file(path.join(dist, p))) ?? (await file(path.join(dist, p + ".html"))) ?? (await file(path.join(dist, p, "index.html")));
  const target = found ?? path.join(dist, "404.html");
  res.writeHead(found ? 200 : 404, {
    "Content-Type": types[path.extname(target)] || "application/octet-stream",
    "Cache-Control": p.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
  });
  res.end(await fs.readFile(target));
}).listen(port, "127.0.0.1", () => console.log(`dist/ preview: http://127.0.0.1:${port}`));
