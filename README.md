# Limited Grades + tier lists

A clone of [limitedgrades.com](https://www.limitedgrades.com) (17Lands win rates as letter grades), plus a tier list
maker for your own rankings. It starts with **Star Trek** (TRK).

- **17Lands grades**: the limitedgrades.com table, with the same filters (set, deck, rarity, type, mana value,
  ⌘K search), hover previews, and card details.
- **My tier lists**: rank every card you can open in a booster, bonus sheet included (Star Trek's Stardates,
  Reality Fracture's Special Guests). Drag cards between tiers and reorder them, or point at a card and press a
  tier's key. Lists save in the browser, export to text, and import a friend's text list.
- **Compare**: two lists side by side (yours, a friend's, or the 17Lands grades). Pointing at a card lights it up
  in the other list, with agreement stats and the biggest disagreements.

## Run it

Node 22.6 or later (24 recommended).

```sh
npm install
npm run dev        # http://localhost:5173
```

The dev server has a small API (`server/`) that fetches from Scryfall and 17Lands and caches responses in
`data/cache/`. Set `INCLUDE_17LANDS=0` to leave 17Lands out.

```sh
npm test           # parsing, matching, grading, compare stats
npm run typecheck
```

## Tier lists

| | |
|---|---|
| Rank a card | Drag it onto a tier, or point at it and press the tier's key: `B` → B, `⇧B` → B+, `⌥B` → B- (`4` → 4.0, `⇧4` → 4.5) |
| Move a tier up or down | `↑` / `↓` (below the last tier is unranked) |
| Reorder within a tier | Drag, or `⌥↑` / `⌥↓` |
| Unrank | `⌫` or `X`, or drag it back to the Unranked panel |
| Quick rank | `Q`: one big card at a time, a key per tier, `←` / `→` to go back or skip |
| Undo / redo | `⌘Z` / `⇧⌘Z` |
| All shortcuts | `?` |

In the **By color** layout every card stays in its color's column, like the grades table, so you only move it up or
down. **Rows** puts each tier on one line, and **Images** shows card images instead of names. The filters apply
while ranking: a deck filter shows only cards playable in those colors, and filtered-out cards keep their places.
Tiers can be renamed (double-click), recolored, added, moved or deleted from each tier's ⋯ menu. New lists can
start empty (A+ to F, S to F, or 0.0 to 5.0), from the 17Lands grades, or as a copy of another list.

### Text format

Export gives you one of three formats, and import reads all of them plus most hand-typed lists:

```
# Tier list: Alex's Star Trek list
# Set: TRK (Star Trek)

A+
Captain Jean-Luc Picard

A
Command Subadjunct
```

Also accepted: `B+: card; card`, `1. Card (B+)`, `Card - B+`, `## B+`, `Tier B`, `Bombs:` (custom tiers), bullets,
numbering, Arena deck-list lines, misspellings, front faces only, and the part of a legendary name before the comma.
The import preview shows what matched and lets you fix lines that didn't.

## How the grades work

The same as limitedgrades.com: for each deck, the server fetches 17Lands' `api/card_data` (games-in-hand win rate,
`ever_drawn_win_rate`), fits a normal distribution to the cards drawn at least 100 times, and grades each card drawn
more than 500 times by its percentile: A+ ≥ 99, A ≥ 95, A- ≥ 90, B+ ≥ 85, B ≥ 76, B- ≥ 68, C+ ≥ 57, C ≥ 45,
C- ≥ 36, D+ ≥ 27, D ≥ 17, D- ≥ 5, then F. Percentiles come from the same printed four-digit z-table the site uses,
so grades match exactly. A new set's grades appear 12 days after its Arena release, as 17Lands asks of tools.

17Lands' API says its data is for use on 17lands.com, and tools need its permission to use it elsewhere. Keep that
in mind before publishing grades.

## GitHub Pages

`.github/workflows/pages.yml` builds a static copy every 6 hours and on every push to `main`. `npm run data` writes
each set's cards to `public/data/` and the app reads those files instead of the API. The hosted copy has card pools
from Scryfall but **no 17Lands grades** unless you set the repository variable `INCLUDE_17LANDS` to `true` (only with
17Lands' permission). Tier lists live in each visitor's browser.

## Credits

Based on [Limited Grades](https://github.com/youssefm/limited-grades) by youssefm (MIT). Card data and images from
[Scryfall](https://scryfall.com) and [17Lands](https://www.17lands.com); mana symbols from
[Mana](https://mana.andrewgioia.com). Not affiliated with Wizards of the Coast, 17Lands, Scryfall or limitedgrades.com.
