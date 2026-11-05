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

  it("lists the /admin CSP after the site-wide one so it wins", () => {
    const order = rules.map((r) => r.source);
    expect(order.indexOf("/admin")).toBeGreaterThan(order.indexOf("**"));
  });
});
