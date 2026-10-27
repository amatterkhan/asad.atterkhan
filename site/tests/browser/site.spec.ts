import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }, info) => {
  const theme = info.project.name.endsWith("light") ? "light" : "dark";
  await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
});
for (const path of [
  "/",
  "/lab",
  "/lab/section/writeups",
  "/lab/section/writeups/hackthebox",
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
test("the divergence meter shifts worldlines and back", async ({ page }) => {
  await page.goto("/");
  const room = page.locator(".room");
  const meter = page.getByRole("button", { name: "Divergence meter" });
  const tubes = page.locator(".room .nixie-lit");
  const status = page.locator(".room-wrap > [role=status]");
  const idle = () => expect(room).toHaveAttribute("data-shift", "idle", { timeout: 6000 });
  await expect(room).toHaveAttribute("data-worldline", "normal");
  await expect(tubes).toHaveAttribute("aria-label", /Nixie tube clock reading/);
  await expect(meter).toHaveAccessibleDescription(/Normal worldline/);

  // the keyboard works, and presses during a shift are ignored
  await meter.focus();
  await meter.press("Enter");
  await meter.press("Enter");
  await meter.press("Enter");
  await expect(room).toHaveAttribute("data-worldline", "alpha");
  await expect(tubes).toHaveAttribute("aria-label", "A divergence meter reading 0.571024");
  await expect(page.locator(".wl-note")).toContainText("α WORLDLINE");
  await expect(status).toHaveText("Alpha worldline, divergence 0.571024.");
  await expect(page.locator(".wl-rain")).toBeAttached();
  await expect(meter).toBeFocused();
  await idle();
  await expect(room).toHaveAttribute("data-worldline", "alpha");
  await expect(page.locator(".wl-note")).toHaveCount(0);

  for (const [w, value] of [["beta", "1.130238"], ["steins-gate", "1.048596"]]) {
    await meter.click();
    await expect(room).toHaveAttribute("data-worldline", w);
    await expect(tubes).toHaveAttribute("aria-label", `A divergence meter reading ${value}`);
    await idle();
  }
  await expect(page.locator(".wl-rain")).toHaveCount(0);
  await expect(page.locator(".wl-spark").first()).toBeAttached();

  // back to Normal: the live clock, and no worldline layer left behind
  await meter.click();
  await expect(room).toHaveAttribute("data-worldline", "normal");
  await expect(tubes).toHaveAttribute("aria-label", /Nixie tube clock reading/);
  await expect(page.locator(".wl-tint, .wl-gold, .wl-spark, .wl-rain")).toHaveCount(0);
  await expect(page.locator(".initial-a, .initial-s")).toHaveCount(2);
});
test("reduced motion shifts without the glitch, and Steins Gate says El Psy Kongroo", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const room = page.locator(".room");
  const meter = page.getByRole("button", { name: "Divergence meter" });
  for (let i = 0; i < 2; i++) {
    await meter.click();
    await expect(room).toHaveAttribute("data-shift", "idle", { timeout: 6000 });
  }
  await room.evaluate((el) => {
    (window as never as { phases: string[] }).phases = [];
    new MutationObserver(() => (window as never as { phases: string[] }).phases.push(el.dataset.shift!)).observe(el, {
      attributeFilter: ["data-shift"],
    });
  });
  await meter.click();
  const note = page.locator(".wl-note");
  await expect(note).toContainText("WORLDLINE 1.048596");
  await expect(note).toContainText("EL PSY KONGROO.");
  await expect(note.locator("small")).toHaveText("STEINS GATE REACHED");
  await expect(room).toHaveAttribute("data-shift", "idle", { timeout: 6000 });
  const phases = await page.evaluate(() => (window as never as { phases: string[] }).phases);
  expect(phases).toEqual(["settle", "note", "idle"]);
});
test.describe("Asad's Thoughts", () => {
  const bubble = (page: import("@playwright/test").Page) => page.locator(".asad-thought:not(.thought-leave-active)");
  // stepping a fake clock through minutes of the room takes a while in real time
  test.describe.configure({ timeout: 150_000 });
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    await page.locator(".room").scrollIntoViewIfNeeded();
    // the room hydrates after its code loads; only then does its scheduler (and the fake clock's count) start
    await page.waitForFunction(() => !!(document.querySelector("[data-island=Room]") as { __vue_app__?: unknown } | null)?.__vue_app__);
    await page.waitForTimeout(300);
  });
  // step the fake clock 3 s at a time (a Thought stays up at least 4 s, so none slips by) until a
  // bubble shows; returns the seconds waited
  const waitForThought = async (page: import("@playwright/test").Page, max: number) => {
    for (let s = 3; s <= max + 2; s += 3) {
      await page.clock.runFor(3000);
      if (await bubble(page).count()) return s;
    }
    return Infinity;
  };
  test("come now and then, never on load, never twice in a row", async ({ page }) => {
    const first = await waitForThought(page, 45);
    expect(first).toBeGreaterThanOrEqual(20);
    expect(first).toBeLessThanOrEqual(43);
    await expect(bubble(page)).toHaveAttribute("aria-hidden", "true");
    const said = await bubble(page).textContent();
    // no controls to make him talk
    await expect(page.locator(".room").getByRole("button", { name: /refresh|next|previous|another/i })).toHaveCount(0);
    // the bubble stays inside the room
    const [b, r] = await Promise.all([bubble(page).boundingBox(), page.locator(".room").boundingBox()]);
    expect(b!.x).toBeGreaterThanOrEqual(r!.x);
    expect(b!.x + b!.width).toBeLessThanOrEqual(r!.x + r!.width);
    expect(b!.y).toBeGreaterThanOrEqual(r!.y);
    await page.clock.runFor(8_500);
    await expect(bubble(page)).toHaveCount(0);
    const next = await waitForThought(page, 160);
    expect(next).toBeGreaterThanOrEqual(56);
    expect(next).toBeLessThanOrEqual(153);
    expect(await bubble(page).textContent()).not.toBe(said);
  });
  test("give way to Storm and to a worldline shift, and stop while the tab is hidden", async ({ page }) => {
    expect(await waitForThought(page, 45)).toBeLessThan(Infinity);
    await page.getByRole("button", { name: "Pet Storm" }).click();
    await expect(bubble(page)).toHaveCount(0);
    await expect(page.locator(".storm-says")).toBeVisible();

    expect(await waitForThought(page, 160)).toBeLessThan(Infinity);
    await page.getByRole("button", { name: "Divergence meter" }).click();
    await expect(bubble(page)).toHaveCount(0);
    // nothing queued: the shift and its note pass without a Thought
    await page.clock.runFor(3_500);
    await expect(page.locator(".room")).toHaveAttribute("data-shift", "idle");
    await expect(bubble(page)).toHaveCount(0);

    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(await waitForThought(page, 200)).toBe(Infinity);
  });
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
