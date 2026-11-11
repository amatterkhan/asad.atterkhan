import { describe, expect, it } from "vitest";
import { currentRole } from "../../src/lib/experience";
import { personJsonLd } from "../../src/lib/person";
import { profileView, recognise, sameAs } from "../../src/lib/profiles";
import { ProfilesSchema, type Profile, type Role } from "../../src/lib/schemas";

const p = (kind: Profile["kind"], value: string, label = "", id = "x"): Profile => ({ id, kind, value, label });
const role = (title: string, isCurrent?: boolean): Role => ({ id: 1, title, company: "Acme", dateRange: "2020 - Present", responsibilities: ["x"], isCurrent });

describe("recognising a platform from its link", () => {
  it.each([
    ["https://app.hackthebox.com/profile/1", "Hack The Box", "terminal"],
    ["https://tryhackme.com/p/sdnull", "TryHackMe", "flag"],
    ["https://hackerone.com/sdnull", "HackerOne", "bug"],
    ["https://bugcrowd.com/sdnull", "Bugcrowd", "shield"],
    ["https://www.credly.com/users/x", "Credly", "medal"],
    ["https://github.com/x", "GitHub", "github"],
  ])("%s", (url, label, icon) => expect(recognise(url)).toEqual({ label, icon }));

  it("does not match a lookalike host", () => {
    expect(recognise("https://nothackerone.com/x")).toBeUndefined();
    expect(recognise("https://evil.example/hackerone.com")).toBeUndefined();
  });
});

describe("what a profile renders", () => {
  it("falls back to a globe and the host for an unknown link", () => {
    expect(profileView(p("other", "https://www.example.org/me"))).toMatchObject({ icon: "globe", label: "example.org", external: true });
  });
  it("names a website Website, and uses the owner's label first", () => {
    expect(profileView(p("website", "https://example.org")).label).toBe("Website");
    expect(profileView(p("other", "https://hackerone.com/x", "My reports")).label).toBe("My reports");
  });
  it("recognises a famous platform whatever kind it was filed under", () => {
    expect(profileView(p("website", "https://github.com/x")).icon).toBe("github");
  });
  it("makes an email a mailto link that is not external", () => {
    expect(profileView(p("email", "a@b.co"))).toMatchObject({ href: "mailto:a@b.co", icon: "mail", external: false });
  });
  it("keeps addresses out of the search-engine list", () => {
    expect(sameAs([p("email", "a@b.co"), p("github", "https://github.com/x")])).toEqual(["https://github.com/x"]);
  });
});

describe("the profiles schema", () => {
  const parse = (profiles: unknown[]) => ProfilesSchema.safeParse({ profiles });
  it("accepts the shipped file", async () => {
    const seed = (await import("../../content/profiles.json")).default;
    expect(ProfilesSchema.safeParse(seed).success).toBe(true);
  });
  it("accepts an empty list", () => expect(parse([]).success).toBe(true));
  it.each([
    ["http link", { id: "a", kind: "website", value: "http://e.com" }],
    ["javascript link", { id: "a", kind: "other", value: "javascript:alert(1)" }],
    ["github elsewhere", { id: "a", kind: "github", value: "https://evil.example/github.com" }],
    ["linkedin elsewhere", { id: "a", kind: "linkedin", value: "https://example.com" }],
    ["bad email", { id: "a", kind: "email", value: "nope" }],
    ["mailto as email", { id: "a", kind: "email", value: "mailto:a@b.co" }],
    ["unknown kind", { id: "a", kind: "twitter", value: "https://e.com" }],
    ["unknown field", { id: "a", kind: "website", value: "https://e.com", extra: 1 }],
    ["long label", { id: "a", kind: "website", value: "https://e.com", label: "x".repeat(41) }],
  ])("refuses %s", (_name, entry) => expect(parse([entry]).success).toBe(false));
  it("refuses duplicate ids and more than 12 links", () => {
    const one = { id: "a", kind: "website", value: "https://e.com" };
    expect(parse([one, one]).success).toBe(false);
    expect(parse(Array.from({ length: 13 }, (_, i) => ({ ...one, id: `a${i}` }))).success).toBe(false);
  });
});

describe("the job title", () => {
  it("is the current role, so editing it in the console changes it", () => {
    expect(currentRole([role("Analyst"), role("Security Operations Analyst", true)])).toEqual({ title: "Security Operations Analyst", company: "Acme" });
    expect(personJsonLd([], [role("Security Engineer", true)]).jobTitle).toBe("Security Engineer");
  });
  it("is left out when no role is current", () => {
    const ld = personJsonLd([], [role("Analyst")]);
    expect(ld).not.toHaveProperty("jobTitle");
    expect(ld).not.toHaveProperty("worksFor");
  });
  it("lists only the profiles the owner added", () => {
    expect(personJsonLd([], []).sameAs).toEqual([]);
    expect(personJsonLd([p("github", "https://github.com/x")], []).sameAs).toEqual(["https://github.com/x"]);
  });
});
