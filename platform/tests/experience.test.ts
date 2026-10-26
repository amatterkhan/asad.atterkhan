import { test } from "node:test";
import assert from "node:assert/strict";
import { groupExperience } from "../src/lib/experience";
import {
  FeaturedSchema,
  selectFeatured,
  AchievementSchema,
} from "../src/lib/achievements";
import work from "../content/workExpData.json";
test("career groups an internal move once under its organisation without losing roles", () => {
  const groups = groupExperience(work);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].company, "Checkout.com");
  assert.deepEqual(
    groups[0].roles.map((r) => r.id),
    [3, 2],
  );
  assert.equal(groups[0].dates, "May 2025 — Present");
  assert.deepEqual(
    groups.flatMap((group) => group.roles.map((role) => role.id)),
    [3, 2, 1, 0],
  );
});
test("featured selection rejects duplicates, unknown records and extra privileges", () => {
  assert.equal(
    FeaturedSchema.safeParse({ featuredIds: ["4", "4"] }).success,
    false,
  );
  assert.equal(
    FeaturedSchema.safeParse({ featuredIds: ["unknown"] }).success,
    false,
  );
  assert.equal(
    FeaturedSchema.safeParse({ featuredIds: ["4"], admin: true }).success,
    false,
  );
  assert.equal(
    FeaturedSchema.safeParse({
      featuredIds: ["1", "2", "3", "4", "5", "1", "2"],
    }).success,
    false,
  );
  assert.deepEqual(
    selectFeatured(["4", "3"]).map((record) => record.id),
    ["4", "3"],
  );
  assert.equal(FeaturedSchema.safeParse({ featuredIds: [] }).success, true);
  assert.equal(
    AchievementSchema.safeParse({
      id: "x",
      title: "Test",
      issuer: "Test",
      kind: "badge",
      link: "javascript:alert(1)",
    }).success,
    false,
  );
});
