import { describe, it, expect } from "vitest";
import fs from "node:fs";

type Rule = { source: string; headers: { key: string; value: string }[] };
const config = JSON.parse(fs.readFileSync(new URL("../../firebase.json", import.meta.url), "utf8"));
const rules: Rule[] = config.hosting.headers;
const header = (source: string, key: string) =>
  rules.find((r) => r.source === source)?.headers.find((h) => h.key === key)?.value ?? "";
const directive = (csp: string, name: string) => csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(name + " ")) ?? "";

describe("firebase.json security headers", () => {
  const publicCsp = header("**", "Content-Security-Policy");
  const adminCsp = header("/admin", "Content-Security-Policy");

  it("keeps Google hosts out of the site-wide CSP", () => {
    expect(publicCsp).not.toContain("apis.google.com");
    expect(publicCsp).not.toContain("*");
    expect(directive(publicCsp, "connect-src")).toBe("connect-src 'self'");
    expect(directive(publicCsp, "frame-src")).toBe("frame-src 'self'");
  });

  it("allows only the sign-in hosts on /admin", () => {
    expect(directive(adminCsp, "script-src")).toContain("https://apis.google.com");
    expect(directive(adminCsp, "connect-src")).toBe(
      "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://asad-atterkhan.firebaseapp.com",
    );
    expect(directive(adminCsp, "frame-src")).toBe("frame-src 'self' https://asad-atterkhan.firebaseapp.com");
    expect(adminCsp).not.toContain("*");
  });

  it("sends HSTS with subdomains and preload, and CORP same-origin", () => {
    expect(header("**", "Strict-Transport-Security")).toBe("max-age=63072000; includeSubDomains; preload");
    expect(header("**", "Cross-Origin-Resource-Policy")).toBe("same-origin");
  });

  it("allows no inline styles or scripts on public pages", () => {
    expect(directive(publicCsp, "style-src")).toBe("style-src 'self'");
    expect(publicCsp).not.toContain("unsafe-inline");
    expect(publicCsp).not.toContain("unsafe-eval");
    expect(directive(publicCsp, "script-src")).toMatch(/^script-src 'self' 'sha256-[A-Za-z0-9+/=]+'$/);
    expect(directive(publicCsp, "object-src")).toBe("object-src 'none'");
    expect(directive(publicCsp, "base-uri")).toBe("base-uri 'self'");
    expect(directive(publicCsp, "frame-ancestors")).toBe("frame-ancestors 'none'");
  });

  it("upgrades insecure requests everywhere and requires Trusted Types on public pages", () => {
    for (const csp of [publicCsp, adminCsp]) expect(csp.split(";").map((d) => d.trim())).toContain("upgrade-insecure-requests");
    expect(directive(publicCsp, "require-trusted-types-for")).toBe("require-trusted-types-for 'script'");
    expect(directive(publicCsp, "trusted-types")).toBe("trusted-types vue");
  });

  it("isolates the browsing context, with popups allowed only for the /admin sign-in", () => {
    expect(header("**", "Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(header("/admin", "Cross-Origin-Opener-Policy")).toBe("same-origin-allow-popups");
  });

  it("switches off every powerful feature the site does not use", () => {
    const policy = header("**", "Permissions-Policy");
    for (const feature of ["camera", "microphone", "geolocation", "payment", "usb", "display-capture", "browsing-topics"])
      expect(policy).toContain(`${feature}=()`);
    expect(policy).not.toMatch(/=\((self|\*)/);
  });

  it("lets other sites show share images, and nothing else", () => {
    expect(header("**/opengraph-image.png", "Cross-Origin-Resource-Policy")).toBe("cross-origin");
    const crossOrigin = rules.filter((r) => r.headers.some((h) => h.key === "Cross-Origin-Resource-Policy" && h.value !== "same-origin"));
    expect(crossOrigin.map((r) => r.source)).toEqual(["**/opengraph-image.png"]);
  });

  it("lists the /admin CSP after the site-wide one so it wins", () => {
    const order = rules.map((r) => r.source);
    expect(order.indexOf("/admin")).toBeGreaterThan(order.indexOf("**"));
  });
});
