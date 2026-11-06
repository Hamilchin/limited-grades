import { TWO_COLOR_DECKS, Decks, type Deck } from "../src/lib/decks.ts";
import { gradeDeck, preciseRound } from "../src/lib/grading.ts";
import { normalizeName, frontFace } from "../src/lib/names.ts";
import { daysSince, EMBARGO_DAYS, lookupSet, type MagicSet } from "../src/lib/sets.ts";
import {
  Rarity,
  type Card,
  type CardStats,
  type OverallCardStats,
  type SetIconData,
  type SetPayload,
  type StatsStatus,
} from "../src/lib/types.ts";
import { DAY_MS, dedupe, HOUR_MS, isFresh, readCache, writeCache, type Cached } from "./cache.ts";
import { fetchBoosterPool, fetchByNames, fetchSetIcon, toCard } from "./scryfall.ts";
import { cardDataPage, fetchCardData, fetchFilters, type ApiCard } from "./seventeenLands.ts";

// ---- Card pool (Scryfall) ----

interface PoolEntry {
  cards: Card[];
  bonusSources: string[];
}

const poolTtl = (set: MagicSet): number => (daysSince(set.startDate) < 45 ? 12 * HOUR_MS : 30 * DAY_MS);

const getPool = (set: MagicSet, refresh: boolean): Promise<Cached<PoolEntry>> =>
  dedupe(`pool-${set.code}`, async () => {
    const cached = await readCache<PoolEntry>(`pool-${set.code}`);
    if (!refresh && cached && isFresh(cached, poolTtl(set))) return cached;
    if (!set.scryfallCode) return cached ?? { savedAt: Date.now(), value: { cards: [], bonusSources: [] } };
    try {
      const pool = await fetchBoosterPool(set.scryfallCode);
      console.log(
        `[api] ${set.code}: ${pool.cards.length} cards in the booster pool` +
          (pool.bonusSources.length ? `, bonus: ${pool.bonusSources.join(", ")}` : "")
      );
      await writeCache(`pool-${set.code}`, pool);
      return { savedAt: Date.now(), value: pool };
    } catch (error) {
      if (cached) {
        console.warn(`[api] ${set.code}: Scryfall failed, using cached pool: ${String(error)}`);
        return cached;
      }
      throw error;
    }
  });

// ---- 17Lands stats, graded like limitedgrades.com ----

interface GradedCard {
  name: string;
  rarity: Rarity;
  url: string;
  urlBack: string;
  overallStats: OverallCardStats;
  stats: Record<string, CardStats>;
}

interface StatsEntry {
  status: StatsStatus;
  cards: GradedCard[];
}

const round = (value: number | null, digits: number): number | null =>
  value === null ? null : preciseRound(value, digits);

const toRarity = (rarity: string): Rarity =>
  rarity === "basic" ? Rarity.COMMON : ((Object.values(Rarity) as string[]).includes(rarity) ? (rarity as Rarity) : Rarity.COMMON);

const buildGradedCards = async (set: MagicSet): Promise<GradedCard[]> => {
  const all = await fetchCardData(set, null);
  if (all.length === 0) return [];
  const perDeck: [Deck, ApiCard[]][] = [[Decks.ALL, all]];
  for (const deck of set.decks.length ? set.decks : TWO_COLOR_DECKS) {
    perDeck.push([deck, await fetchCardData(set, deck)]);
  }

  const statsByUrl = new Map<string, Record<string, CardStats>>();
  for (const [deck, cards] of perDeck) {
    const graded = gradeDeck(
      cards
        .filter((card) => card.ever_drawn_win_rate !== null)
        .map((card) => ({
          key: card.url,
          winrate: card.ever_drawn_win_rate!,
          gameCount: card.ever_drawn_game_count,
        }))
    );
    for (const [url, stats] of graded) {
      const entry = statsByUrl.get(url) ?? {};
      entry[deck.code] = stats;
      statsByUrl.set(url, entry);
    }
  }

  const result: GradedCard[] = [];
  for (const card of all) {
    const stats = statsByUrl.get(card.url);
    if (!stats || Object.keys(stats).length === 0) continue;
    result.push({
      name: card.name.replace("///", "//"),
      rarity: toRarity(card.rarity),
      url: card.url,
      urlBack: card.url_back,
      overallStats: {
        gameCount: card.game_count,
        lastSeenAt: round(card.avg_seen, 2),
        takenAt: round(card.avg_pick, 2),
        playedWinrate: round(card.win_rate, 4),
        openingHandWinrate: round(card.opening_hand_win_rate, 4),
        drawnWinrate: round(card.drawn_win_rate, 4),
        notDrawnWinrate: round(card.never_drawn_win_rate, 4),
      },
      stats,
    });
  }
  return result;
};

const statsTtl = (set: MagicSet): number => (daysSince(set.startDate) < 30 ? 3 * HOUR_MS : 7 * DAY_MS);
const MIN_FORCED_REFRESH_MS = 10 * 60 * 1000;

const loadStats = async (set: MagicSet): Promise<StatsEntry> => {
  let arenaStart: string | null = null;
  try {
    const filters = await fetchFilters();
    arenaStart = filters.startDates[set.code17Lands] ?? null;
  } catch (error) {
    console.warn(`[api] couldn't read 17Lands filters: ${String(error)}`);
  }
  const start = arenaStart ?? `${set.startDate}T15:00:00Z`;
  const availableAt = new Date(new Date(start).getTime() + EMBARGO_DAYS * DAY_MS);
  if (Date.now() < availableAt.getTime()) {
    return {
      status: { kind: "embargo", arenaStart: start, availableAt: availableAt.toISOString() },
      cards: [],
    };
  }
  const cards = await buildGradedCards(set);
  console.log(`[api] ${set.code}: 17Lands graded ${cards.length} cards`);
  if (cards.length === 0) {
    return { status: { kind: "none", arenaStart: start, checkedAt: new Date().toISOString() }, cards };
  }
  return { status: { kind: "ok", updatedAt: new Date().toISOString(), arenaStart: start }, cards };
};

/** Fresh stats, or stale ones right away while a refresh runs in the background. */
const getStats = async (set: MagicSet, refresh: boolean): Promise<StatsEntry> => {
  const key = `stats-${set.code}`;
  const cached = await readCache<StatsEntry>(key);
  const ttl = cached?.value.status.kind === "ok" ? statsTtl(set) : HOUR_MS;
  const wantsRefresh = refresh && (!cached || !isFresh(cached, MIN_FORCED_REFRESH_MS));
  if (cached && isFresh(cached, ttl) && !wantsRefresh) return cached.value;

  const reload = dedupe(key, async () => {
    try {
      const entry = await loadStats(set);
      await writeCache(key, entry);
      return entry;
    } catch (error) {
      console.warn(`[api] ${set.code}: 17Lands failed: ${String(error)}`);
      if (cached) return cached.value;
      return { status: { kind: "error", message: String(error) }, cards: [] } satisfies StatsEntry;
    }
  });

  if (cached && cached.value.status.kind === "ok" && !wantsRefresh) {
    reload.catch(() => undefined);
    return cached.value;
  }
  return reload;
};

// ---- Set icons ----

const getIcon = async (set: MagicSet): Promise<SetIconData | null> => {
  if (!set.scryfallCode) return null;
  const key = `icon-${set.code}`;
  const cached = await readCache<SetIconData | null>(key);
  if (cached && isFresh(cached, 30 * DAY_MS)) return cached.value;
  try {
    const icon = await fetchSetIcon(set.scryfallCode);
    await writeCache(key, icon);
    return icon;
  } catch (error) {
    console.warn(`[api] ${set.code}: no set icon: ${String(error)}`);
    return cached?.value ?? null;
  }
};

// ---- Putting it together ----

const nameIndex = (cards: Card[]): Map<string, Card> => {
  const index = new Map<string, Card>();
  for (const card of cards) index.set(normalizeName(card.name), card);
  for (const card of cards) {
    const front = normalizeName(frontFace(card.name));
    if (!index.has(front)) index.set(front, card);
  }
  return index;
};

/** Cards 17Lands rates but the pool doesn't have (bonus-sheet cards Scryfall files elsewhere). */
const resolveExtras = async (names: string[]): Promise<Card[]> => {
  if (names.length === 0) return [];
  const cached = await readCache<Record<string, Card | null>>("extra-cards");
  const known = cached?.value ?? {};
  const missing = names.filter((name) => !(name in known));
  if (missing.length > 0) {
    try {
      const found = await fetchByNames(missing);
      const index = nameIndex([...found.values()].map((card) => toCard(card, true)));
      for (const name of missing) {
        known[name] = index.get(normalizeName(name)) ?? index.get(normalizeName(frontFace(name))) ?? null;
      }
      await writeCache("extra-cards", known);
    } catch (error) {
      console.warn(`[api] couldn't look up ${missing.length} extra cards: ${String(error)}`);
    }
  }
  return names.map((name) => known[name]).filter((card): card is Card => Boolean(card));
};

export class NotFoundError extends Error {}

export interface PayloadOptions {
  refresh?: boolean;
  /** Ask 17Lands for grades (on by default; the hosted build turns it off unless configured). */
  include17Lands?: boolean;
}

export const getSetPayload = async (code: string, options: PayloadOptions = {}): Promise<SetPayload> => {
  const { refresh = false, include17Lands = true } = options;
  const set = lookupSet(code);
  if (!set) throw new NotFoundError(`Unknown set "${code}"`);

  const disabled: StatsEntry = {
    status: { kind: "disabled", cardDataUrl: cardDataPage(set) },
    cards: [],
  };
  const [pool, stats, iconData] = await Promise.all([
    getPool(set, refresh),
    include17Lands ? getStats(set, refresh) : Promise.resolve(disabled),
    getIcon(set),
  ]);

  const cards = pool.value.cards.map((card) => ({ ...card, stats: {}, overallStats: null }) as Card);
  const index = nameIndex(cards);
  const unmatched: GradedCard[] = [];
  const apply = (card: Card, graded: GradedCard): void => {
    card.stats = graded.stats;
    card.overallStats = graded.overallStats;
    card.rarity = graded.rarity;
    if (graded.url) card.cardUrl = graded.url;
    if (graded.urlBack) card.cardBackUrl = graded.urlBack;
  };
  for (const graded of stats.cards) {
    const card = index.get(normalizeName(graded.name)) ?? index.get(normalizeName(frontFace(graded.name)));
    if (card) apply(card, graded);
    else unmatched.push(graded);
  }
  if (unmatched.length > 0) {
    const extras = await resolveExtras(unmatched.map((g) => g.name));
    const extraIndex = nameIndex(extras);
    for (const graded of unmatched) {
      const extra = extraIndex.get(normalizeName(graded.name)) ?? extraIndex.get(normalizeName(frontFace(graded.name)));
      if (!extra) {
        console.warn(`[api] ${set.code}: '${graded.name}' isn't on Scryfall; skipping it`);
        continue;
      }
      const card = { ...extra };
      apply(card, graded);
      cards.push(card);
      index.set(normalizeName(card.name), card);
    }
  }

  cards.sort((a, b) => a.name.localeCompare(b.name));
  return {
    setCode: set.code,
    cards,
    stats: stats.status,
    poolUpdatedAt: new Date(pool.savedAt).toISOString(),
    iconData,
  };
};
