import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }, info) => {
  const theme = info.project.name.endsWith("light") ? "light" : "dark";
  await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
});
for (const path of [
  "/",
  "/lab",
  "/workbench",
  "/experience",
  "/achievements",
  "/about",
  "/calendar",
  "/admin",
  "/workbench/qrover",
])
  test(`layout, accessibility and hydration ${path}`, async ({ page }) => {
    const warnings: string[] = [];
    page.on("console", (msg) => {
      if (/hydration|mismatch/i.test(msg.text())) warnings.push(msg.text());
    });
    page.on("pageerror", (err) => warnings.push(err.message));
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("main")).toHaveCSS("opacity", "1");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
        .violations,
    ).toEqual([]);
    expect(warnings).toEqual([]);
  });
test("mobile navigation Escape and focus return", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile);
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open navigation menu" });
  const menu = page.getByRole("dialog", { name: "Navigation menu" });
  await trigger.click();
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await menu.getByRole("link", { name: "The Lab", exact: true }).click();
  await expect(page).toHaveURL(/\/lab$/);
});
test("room pet, lamp and theme interactions", async ({ page }) => {
  await page.goto("/");
  const pet = page.getByRole("button", { name: "Pet Storm" });
  await pet.focus();
  await pet.press("Enter");
  await expect(page.locator(".storm-says")).toBeVisible();
  await expect(page.locator(".asad .sprite")).toHaveClass(/asad-happy/);
  const lamp = page.getByRole("button", { name: "Toggle the desk lamp" });
  const before = await page.locator(".room").getAttribute("data-lamp");
  await lamp.click();
  await expect(page.locator(".room")).toHaveAttribute(
    "data-lamp",
    before === "on" ? "off" : "on",
  );
  const theme = await page.locator("html").getAttribute("data-theme");
  await page
    .getByRole("button", { name: "Switch between light and dark mode" })
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    theme === "light" ? "dark" : "light",
  );
});
test("search filters and clears collections", async ({ page }) => {
  await page.goto("/workbench");
  const input = page.getByRole("searchbox", { name: "Find a project" });
  await input.fill("  ESP32 robotics  ");
  await expect(page.locator(".project-entry")).toHaveCount(1);
  await input.fill("no-such-project-98345");
  await expect(
    page.getByRole("heading", { name: "No matching projects." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.locator(".project-entry")).toHaveCount(4);
  await page.goto("/achievements");
  await page
    .getByRole("searchbox", { name: "Find an achievement" })
    .fill("CompTIA");
  await expect(page.locator(".achievement-collection > li")).toHaveCount(1);
  await page.goto("/lab");
  const notes = page.getByRole("searchbox", { name: "Find a note" });
  await notes.fill("no-such-note-98345");
  await expect(page.locator(".empty")).toBeVisible();
  await notes.fill("");
  await expect(notes).toHaveValue("");
});
test("redirects and missing pages", async ({ request }) => {
  const home = await request.get("/");
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");
  expect(home.headers()["content-security-policy"]).toContain(
    "script-src 'self' 'sha256-",
  );
  expect((await request.get("/calendar")).headers()["cache-control"]).toBe(
    "no-store",
  );
  for (const path of [
    "/missing-page",
    "/lab/missing-note",
    "/manage",
    "/review",
  ])
    expect((await request.get(path)).status()).toBe(404);
  for (const [from, to] of [
    ["/blog", "/lab"],
    ["/projects", "/workbench"],
    ["/resume", "/experience"],
  ]) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers().location).toBe(to);
  }
});
test("calendar development preview navigates mocked months", async ({
  page,
}) => {
  await page.route("**/api/calendar*", (route) => {
    const url = new URL(route.request().url());
    const year = Number(url.searchParams.get("year") ?? 2026),
      month = Number(url.searchParams.get("month") ?? 9);
    return route.fulfill({
      json: {
        year,
        month,
        today: { year: 2026, month: 9, day: 26 },
        cells: Array.from({ length: 35 }, (_, i) =>
          i < 31
            ? {
                day: i + 1,
                shift: "night",
                iso: `2026-10-${String(i + 1).padStart(2, "0")}`,
              }
            : null,
        ),
        upcoming: [
          { iso: "2026-10-26", shift: "night" },
          { iso: "2026-10-27", shift: "night" },
        ],
      },
    });
  });
  await page.goto("http://127.0.0.1:4193/calendar");
  const month = page.locator(".calendar-toolbar h2");
  await expect(month).toHaveText("October 2026");
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await expect(month).toHaveText("November 2026");
  await page
    .getByRole("button", { name: "Previous month", exact: true })
    .click();
  await expect(month).toHaveText("October 2026");
});
