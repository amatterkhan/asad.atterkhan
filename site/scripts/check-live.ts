export {};
// Checks the deployed site from the outside: security headers, robots, security.txt and every
// sitemap URL. No dependencies and no credentials; Node 24 runs it directly:
//
//   node scripts/check-live.ts                      # https://asad.atterkhan.com
//   node scripts/check-live.ts http://127.0.0.1:4191 --local   # a local preview (skips HTTPS-only checks)
//
// The weekly site-watch workflow runs it, so a failure reaches the owner as a GitHub email.
const base = (process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "https://asad.atterkhan.com").replace(/\/$/, "");
const local = process.argv.includes("--local");
const failures: string[] = [];
const check = (ok: boolean, message: string) => {
  if (!ok) failures.push(message);
  console.log(`${ok ? "ok  " : "FAIL"} ${message}`);
};
const get = (path: string) => fetch(base + path, { redirect: "manual" });

const home = await get("/");
const h = (name: string) => home.headers.get(name) ?? "";
const csp = h("content-security-policy");
check(home.status === 200, "home page returns 200");
check(/style-src 'self'(;|$)/.test(csp), "CSP: styles from this origin only");
check(!/unsafe-inline|unsafe-eval/.test(csp), "CSP: no unsafe-inline or unsafe-eval on public pages");
check(/script-src 'self' 'sha256-[A-Za-z0-9+/=]+'(;|$)/.test(csp), "CSP: scripts from this origin plus one hashed inline script");
check(/object-src 'none'/.test(csp) && /base-uri 'self'/.test(csp) && /frame-ancestors 'none'/.test(csp), "CSP: object-src, base-uri and frame-ancestors locked");
check(/require-trusted-types-for 'script'/.test(csp), "CSP: Trusted Types required");
check(h("x-content-type-options") === "nosniff", "X-Content-Type-Options: nosniff");
check(h("cross-origin-opener-policy") === "same-origin", "Cross-Origin-Opener-Policy: same-origin");
check(h("cross-origin-resource-policy") === "same-origin", "Cross-Origin-Resource-Policy: same-origin");
check(/camera=\(\)/.test(h("permissions-policy")) && /payment=\(\)/.test(h("permissions-policy")), "Permissions-Policy switches features off");
check(h("referrer-policy") === "strict-origin-when-cross-origin", "Referrer-Policy set");
if (!local) check(/max-age=\d{8,}; includeSubDomains; preload/.test(h("strict-transport-security")), "HSTS: two years, subdomains, preload");

const html = await home.text();
check(!/<[a-z][^<>]*\sstyle=/i.test(html), "home page has no inline style attribute");
const offOrigin = [...html.matchAll(/<(?:script|link|img|iframe|source|video|audio)\b[^>]*\s(?:src|href)="(https?:)?\/\/([^"/]+)/gi)]
  .map((m) => m[2])
  .filter((host) => host !== new URL(base).host && host !== "asad.atterkhan.com");
check(offOrigin.length === 0, `home page loads nothing from another origin${offOrigin.length ? ` (found ${[...new Set(offOrigin)].join(", ")})` : ""}`);

if (!local) {
  const robots = await (await get("/robots.txt")).text();
  check(/^Allow: \/$/m.test(robots) && !/^Disallow: \/$/m.test(robots), "robots.txt allows indexing (INDEX_SITE=true reached production)");
  check(/<meta name="robots" content="index, follow"/.test(html), "home page is marked index, follow");
}
for (const path of ["/admin", "/calendar"]) {
  const res = await get(path);
  check(/noindex/.test(res.headers.get("x-robots-tag") ?? ""), `${path} is noindex`);
}

const sec = await get("/.well-known/security.txt");
const secBody = sec.status === 200 ? await sec.text() : "";
const expires = Date.parse(/^Expires: (\S+)$/m.exec(secBody)?.[1] ?? "");
check(sec.status === 200 && /^Contact: /m.test(secBody), "security.txt is served with a Contact");
check(expires - Date.now() > 30 * 86_400_000, "security.txt has more than 30 days before it expires (any deploy renews it)");

const og = await get("/opengraph-image.png");
check(og.status === 200 && og.headers.get("cross-origin-resource-policy") === "cross-origin", "share image is readable by other sites");

const sitemap = await (await get("/sitemap.xml")).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
const broken: string[] = [];
for (const path of urls) {
  const res = await get(path);
  if (res.status !== 200) broken.push(`${path} → ${res.status}`);
}
check(urls.length > 0 && broken.length === 0, `all ${urls.length} sitemap URLs return 200${broken.length ? `: ${broken.join(", ")}` : ""}`);

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
