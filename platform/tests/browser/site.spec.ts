import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("navigation, layout and accessibility", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hey, I'm Asad." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveJSProperty(
    "scrollWidth",
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  const menuTrigger = page.getByRole("button", {
    name: "Open navigation menu",
  });
  if (await menuTrigger.isVisible()) await menuTrigger.click();
  await page.getByRole("link", { name: "The Lab", exact: true }).click();
  await expect(page.locator("#terminal-input")).toHaveCount(0);
  await expect(page).toHaveURL(/\/lab$/);
  await expect(page.getByRole("heading", { name: "The Lab" })).toBeVisible();
  const a11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(a11y.violations).toEqual([]);
});
test("drafts, owner tool, and files fail closed in production", async ({
  request,
}) => {
  for (const path of [
    "/preview/reading-layout",
    "/manage",
    "/files/5fceaf3a-11c9-45a2-8d5b-51a373e2cd25",
    "/lab/reading-layout",
  ])
    expect((await request.get(path)).status()).toBe(404);
  expect((await request.get("/api/admin/documents")).status()).toBe(503);
  const search = await request.get("/search.json");
  expect(JSON.stringify(await search.json())).not.toContain("reading-layout");
  const feed = await request.get("/rss.xml");
  expect(await feed.text()).not.toContain("reading-layout");
  expect((await request.get("/blog")).url()).toContain("/lab");
});
test("reduced motion freezes sprites and ambient background", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page
      .locator(".sprite")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await expect(page.locator(".ambient-dots")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(
    page.getByRole("button", { name: "Pause motion" }),
  ).not.toBeVisible();
});

test("paired sprites keep Storm at half Asad's display scale", async ({
  page,
}) => {
  await page.goto("/");
  const sizes = await page
    .locator(".sprite-scene .sprite")
    .evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().width),
    );
  expect(sizes).toHaveLength(2);
  expect(sizes[1]).toBe(sizes[0] / 2);
});

test("mobile menu supports Escape and ordinary navigation", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "The menu is a mobile navigation control");
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
  await expect(menu).not.toBeVisible();
});

test("shift calendar preserves month navigation and achievements are searchable", async ({
  page,
}) => {
  await page.goto("/calendar");
  const month = page.locator(".calendar-toolbar h2");
  const initial = await month.textContent();
  await page.getByRole("button", { name: "Next month", exact: true }).click();
  await expect(month).not.toHaveText(initial!);
  await page
    .getByRole("button", { name: "Previous month", exact: true })
    .click();
  await expect(month).toHaveText(initial!);
  await page.goto("/achievements");
  await page
    .getByRole("searchbox", { name: "Find an achievement" })
    .fill("CompTIA");
  await expect(
    page.getByRole("heading", { name: "Security+ ↗" }),
  ).toBeVisible();
  await expect(page.locator(".achievement-collection > li")).toHaveCount(1);
});

test("Workbench filters technologies, handles empty results, and clears search", async ({
  page,
}) => {
  await page.goto("/workbench");
  const input = page.getByRole("searchbox", { name: "Find a project" });
  await input.fill("  ESP32 robotics  ");
  await expect(page.locator(".project-entry")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "QROVER ROBOT" }),
  ).toBeVisible();
  await input.fill("no-such-project-98345");
  await expect(
    page.getByRole("heading", { name: "No matching projects." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(input).toHaveValue("");
  await expect(page.locator(".project-entry")).toHaveCount(4);
});

test("square search focus and motion control remain accessible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/lab");
  const input = page.getByRole("searchbox", { name: "Find a note" });
  await input.focus();
  await expect(input).toHaveCSS("border-radius", "0px");
  await expect(input).toHaveCSS("outline-style", "none");
  await expect(input).toHaveCSS("border-color", "rgb(194, 160, 245)");
  await expect(page.locator(".ambient-dots")).toHaveCSS(
    "animation-name",
    "notebook-drift",
  );
  await page.getByRole("button", { name: "Pause motion" }).click();
  await expect(page.locator(".ambient-dots")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.getByRole("button", { name: "Resume motion" }).click();
  await expect(page.locator(".ambient-dots")).toHaveCSS(
    "animation-name",
    "notebook-drift",
  );
});
