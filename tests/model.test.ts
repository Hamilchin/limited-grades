import assert from "node:assert/strict";
import { test } from "node:test";

import { compareLists } from "../src/lib/compare.ts";
import { gradeDeck, gradeForScore, preciseRound, tableCdf } from "../src/lib/grading.ts";
import { NameIndex } from "../src/lib/names.ts";
import {
  assignTier,
  createList,
  indexPlacements,
  moveCard,
  nudgeTier,
  removeTier,
  TIER_PRESETS,
} from "../src/lib/tierModel.ts";

const GRADES = TIER_PRESETS[0]!.labels;
const tierId = (list: ReturnType<typeof createList>, label: string) => list.tiers.find((t) => t.label === label)!.id;

test("moving cards keeps hidden neighbors in place", () => {
  let list = createList({ name: "x", setCode: "trk", labels: ["A", "B"], byLabel: { A: ["a1", "hidden", "a2", "a3"] } });
  // Drop a3 before a1, as seen with "hidden" filtered out.
  list = moveCard(list, "a3", tierId(list, "A"), { before: "a1" });
  assert.deepEqual(list.placements[tierId(list, "A")], ["a3", "a1", "hidden", "a2"]);
  // Drop at the end of a filtered view: after the last visible card.
  list = moveCard(list, "a3", tierId(list, "A"), { after: "a1" });
  assert.deepEqual(list.placements[tierId(list, "A")], ["a1", "a3", "hidden", "a2"]);
  // Into another tier, then out of all tiers.
  list = moveCard(list, "a1", tierId(list, "B"));
  assert.deepEqual(list.placements[tierId(list, "B")], ["a1"]);
  list = moveCard(list, "a1", null);
  assert.equal(indexPlacements(list).get("a1"), undefined);
});

test("nudging walks tiers and treats unranked as below the last tier", () => {
  let list = createList({ name: "x", setCode: "trk", labels: ["A", "B"] });
  list = nudgeTier(list, "card", -1); // unranked → B
  assert.equal(indexPlacements(list).get("card")?.tierIndex, 1);
  list = nudgeTier(list, "card", -1); // B → A
  list = nudgeTier(list, "card", -1); // stays A
  assert.equal(indexPlacements(list).get("card")?.tierIndex, 0);
  list = nudgeTier(list, "card", 2); // A → unranked
  assert.equal(indexPlacements(list).get("card"), undefined);
  list = assignTier(list, "card", tierId(list, "A"));
  list = removeTier(list, tierId(list, "A"));
  assert.equal(indexPlacements(list).get("card"), undefined);
});

test("comparison stats", () => {
  const a = createList({ name: "a", setCode: "trk", labels: GRADES, byLabel: { A: ["x", "y"], B: ["z"], C: ["w"] } });
  const b = createList({ name: "b", setCode: "trk", labels: GRADES, byLabel: { A: ["x"], "B+": ["y"], B: ["z"] } });
  const summary = compareLists(a, b, ["x", "y", "z", "w", "v"]);
  assert.equal(summary.common, 3);
  assert.equal(summary.sameTier, 2);
  assert.equal(summary.withinOne, 2);
  assert.ok(summary.sameScale);
  assert.deepEqual(
    summary.rows.map((r) => [r.name, r.delta]),
    [
      ["x", 0],
      ["y", 2],
      ["z", 0],
      ["w", null],
    ]
  );
  assert.equal(summary.spearman, 1);
});

test("grading reproduces the site's z-table percentiles and rounding", () => {
  // z = -0.59 → 1 - 0.7224, the score limitedgrades.com shows for Academic Ascent (27.76, D+).
  assert.equal(preciseRound(tableCdf(-0.59) * 100, 2), 27.76);
  assert.equal(gradeForScore(tableCdf(-0.59) * 100), "D+");
  // 0.57 * 100 is 56.99999999999999 in floating point, which the site grades C, not C+.
  assert.equal(gradeForScore(0.57 * 100), "C");
  assert.equal(tableCdf(0), 0.5);
  assert.equal(tableCdf(3.6), 1);
  const graded = gradeDeck([
    { key: "low", winrate: 0.5, gameCount: 1000 },
    { key: "mid", winrate: 0.55, gameCount: 1000 },
    { key: "high", winrate: 0.6, gameCount: 1000 },
    { key: "few games", winrate: 0.7, gameCount: 400 },
    { key: "too few", winrate: 0.9, gameCount: 50 },
  ]);
  assert.deepEqual([...graded.keys()], ["low", "mid", "high"]);
});

test("name matching", () => {
  const index = new NameIndex(["Fire // Ice", "Lórien Revealed", "Delver of Secrets"]);
  assert.equal(index.match("fire/ice")?.name, "Fire // Ice");
  assert.equal(index.match("Fire")?.name, "Fire // Ice");
  assert.equal(index.match("lorien revealed")?.quality, "exact");
  assert.equal(index.match("Delver of Secret")?.quality, "fuzzy");
  assert.equal(index.match("Totally Unknown"), null);
  const legends = new NameIndex(["Brad Boimler, Eager Ensign", "Garruk, Curse Breaker", "Garruk, Veiled Butcher"]);
  assert.equal(legends.match("brad boimler")?.name, "Brad Boimler, Eager Ensign");
  // Two Garruks: "Garruk" alone is ambiguous, so it's not matched outright.
  assert.notEqual(legends.match("Garruk")?.quality, "exact");
});
