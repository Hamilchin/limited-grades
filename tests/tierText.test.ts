import assert from "node:assert/strict";
import { test } from "node:test";

import { createList, moveCard, TIER_PRESETS } from "../src/lib/tierModel.ts";
import { exportTierList, parseTierText, planImport } from "../src/lib/tierText.ts";

const NAMES = [
  "70,000 Light-Years from Home",
  "Garruk, Curse Breaker",
  "Garruk, Veiled Butcher",
  "Circle of Protection: Red",
  "Fire // Ice",
  "Delver of Secrets",
  "Lightning Bolt",
  "Jace's Erasure",
  "Lórien Revealed",
  "Shock",
  "Consider",
  "Sheoldred, the Apocalypse",
];

const GRADES = TIER_PRESETS[0]!.labels;

const sampleList = () => {
  let list = createList({ name: "Alex's list", setCode: "trk", labels: GRADES });
  const tier = (label: string) => list.tiers.find((t) => t.label === label)!.id;
  list = moveCard(list, "Sheoldred, the Apocalypse", tier("A+"));
  list = moveCard(list, "Garruk, Curse Breaker", tier("A"));
  list = moveCard(list, "70,000 Light-Years from Home", tier("A"));
  list = moveCard(list, "Fire // Ice", tier("B-"));
  list = moveCard(list, "Circle of Protection: Red", tier("F"));
  list = moveCard(list, "Lórien Revealed", tier("C+"));
  return list;
};

const tiersOf = (text: string) =>
  Object.fromEntries(parseTierText(text, NAMES).tiers.filter((t) => t.items.length).map((t) => [t.label, t.items.map((i) => i.name)]));

for (const format of ["sections", "ranking", "compact"] as const) {
  test(`${format} export round-trips`, () => {
    const list = sampleList();
    const text = exportTierList(list, { format, includeUnranked: true, allNames: NAMES, setLabel: "Star Trek" });
    const parsed = parseTierText(text, NAMES);
    assert.equal(parsed.name, "Alex's list");
    assert.equal(parsed.setCode, "trk");
    assert.deepEqual(parsed.unmatched, []);
    assert.deepEqual(tiersOf(text), {
      "A+": ["Sheoldred, the Apocalypse"],
      A: ["Garruk, Curse Breaker", "70,000 Light-Years from Home"],
      "B-": ["Fire // Ice"],
      "C+": ["Lórien Revealed"],
      F: ["Circle of Protection: Red"],
    });
    assert.deepEqual(
      parsed.unranked.map((i) => i.name).sort(),
      ["Consider", "Delver of Secrets", "Garruk, Veiled Butcher", "Jace's Erasure", "Lightning Bolt", "Shock"]
    );
    const plan = planImport(parsed);
    assert.deepEqual(plan.labels, GRADES);
  });
}

test("reads the ways friends type tier lists", () => {
  const text = `
## A tier
- garruk curse breaker
* Lightning bolt
**B+**
1. Shock
2) Fire/Ice
Tier C: Consider, Delver of Secrets; Jace’s Erasure
D- tier:
Lorien Revealed
`;
  const parsed = parseTierText(text, NAMES);
  assert.deepEqual(parsed.unmatched, []);
  assert.deepEqual(tiersOf(text), {
    A: ["Garruk, Curse Breaker", "Lightning Bolt"],
    "B+": ["Shock", "Fire // Ice"],
    C: ["Consider", "Delver of Secrets", "Jace's Erasure"],
    "D-": ["Lórien Revealed"],
  });
  // A, B+, C, D- only fit the A+..F grades preset.
  assert.deepEqual(planImport(parsed).labels, GRADES);
});

test("comma lists keep names that contain commas", () => {
  assert.deepEqual(tiersOf("A: Garruk, Curse Breaker, Sheoldred, the Apocalypse, Shock"), {
    A: ["Garruk, Curse Breaker", "Sheoldred, the Apocalypse", "Shock"],
  });
});

test("per-line tier annotations", () => {
  const text = "Lightning Bolt - A\nShock (B+)\nC | Consider\nDelver of Secrets\tB\nCircle of Protection: Red: F";
  assert.deepEqual(tiersOf(text), {
    A: ["Lightning Bolt"],
    "B+": ["Shock"],
    C: ["Consider"],
    B: ["Delver of Secrets"],
    F: ["Circle of Protection: Red"],
  });
});

test("custom tier names and plain rankings", () => {
  const custom = parseTierText("Bombs\nSheoldred, the Apocalypse\n\nRemoval\nLightning Bolt\nShock\n", NAMES);
  assert.deepEqual(planImport(custom), {
    labels: ["Bombs", "Removal"],
    byLabel: { Bombs: ["Sheoldred, the Apocalypse"], Removal: ["Lightning Bolt", "Shock"] },
  });
  const plain = parseTierText("Lightning Bolt\nShock\nConsider\n", NAMES);
  assert.deepEqual(planImport(plain).byLabel, { Ranked: ["Lightning Bolt", "Shock", "Consider"] });
});

test("S-to-F labels pick the small preset; numbers pick 0–5", () => {
  assert.equal(planImport(parseTierText("S\nShock\nA\nConsider\nF\nDelver of Secrets", NAMES)).labels.length, 6);
  assert.equal(planImport(parseTierText("A\nShock\nB\nConsider\nF\nDelver of Secrets", NAMES)).labels.length, 6);
  const numeric = parseTierText("4.5: Shock\n3: Consider", NAMES);
  assert.deepEqual(planImport(numeric).labels, TIER_PRESETS[2]!.labels);
  assert.deepEqual(planImport(numeric).byLabel, { "4.5": ["Shock"], "3.0": ["Consider"] });
});

test("typos, unknown cards, duplicates, and deck-list lines", () => {
  const parsed = parseTierText("A\nLightnig Bolt\nGarruk\nNot A Real Card\n1 Shock (TRK) 123\nShock", NAMES);
  assert.deepEqual(tiersOf("A\nLightnig Bolt\n1 Shock (TRK) 123"), { A: ["Lightning Bolt", "Shock"] });
  assert.deepEqual(parsed.unmatched.map((u) => [u.text, u.tierLabel]), [
    ["Garruk", "A"],
    ["Not A Real Card", "A"],
  ]);
  assert.deepEqual(parsed.unmatched[0]!.suggestions.slice(0, 2).sort(), ["Garruk, Curse Breaker", "Garruk, Veiled Butcher"]);
  assert.deepEqual(parsed.duplicates, ["Shock"]);
  // The user picks a suggestion in the preview.
  const plan = planImport(parsed, [{ label: "A", name: "Garruk, Veiled Butcher" }]);
  assert.deepEqual(plan.byLabel.A, ["Lightning Bolt", "Shock", "Garruk, Veiled Butcher"]);
});

test("a card whose name starts with a number isn't a deck-list quantity", () => {
  assert.deepEqual(tiersOf("B\n70,000 Light-Years from Home"), { B: ["70,000 Light-Years from Home"] });
});
