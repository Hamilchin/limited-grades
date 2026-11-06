// Writes public/data/<set>.json for every set, so the app can run as a static site (GitHub Pages)
// without the local API server. Run with: npm run data
//
// 17Lands grades are left out unless INCLUDE_17LANDS=1: 17Lands' API says its data is only for use
// on 17lands.com, so only include it in a public build if you have their permission.

import { mkdir, writeFile } from "node:fs/promises";

import { getSetPayload } from "../server/setData.ts";
import { ALL_SETS } from "../src/lib/sets.ts";

const include17Lands = ["1", "true", "yes"].includes((process.env.INCLUDE_17LANDS ?? "").toLowerCase());
const only = process.argv.slice(2).map((code) => code.toLowerCase());
const outDir = new URL("../public/data/", import.meta.url);
await mkdir(outDir, { recursive: true });

console.log(`Building set data ${include17Lands ? "with" : "without"} 17Lands grades`);
const available: string[] = [];
let failures = 0;
for (const set of ALL_SETS) {
  if (only.length > 0 && !only.includes(set.code)) continue;
  // Cubes have no Scryfall set, so without 17Lands there are no cards to show.
  if (!set.scryfallCode && !include17Lands) continue;
  try {
    const payload = await getSetPayload(set.code, { include17Lands });
    if (payload.cards.length === 0) {
      console.warn(`  ${set.code}: no cards, skipped`);
      continue;
    }
    await writeFile(new URL(`${set.code}.json`, outDir), JSON.stringify(payload));
    available.push(set.code);
    console.log(`  ${set.code}: ${payload.cards.length} cards, 17Lands: ${payload.stats.kind}`);
  } catch (error) {
    failures += 1;
    console.error(`  ${set.code}: failed: ${String(error)}`);
  }
}

await writeFile(
  new URL("index.json", outDir),
  JSON.stringify({ generatedAt: new Date().toISOString(), include17Lands, sets: available })
);
console.log(`Wrote ${available.length} sets${failures ? `, ${failures} failed` : ""}`);
if (available.length === 0) process.exit(1);
