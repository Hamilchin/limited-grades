import {
  ALL_CARD_TYPES,
  Color,
  Rarity,
  type Card,
  type CardType,
  type ManaSymbol,
  type SetIconData,
} from "../src/lib/types.ts";
import { DAY_MS, dedupe, isFresh, readCache, writeCache } from "./cache.ts";
import { fetchJson, fetchText, Throttle } from "./http.ts";

// Scryfall asks for 50–100 ms between requests and a descriptive User-Agent.
const throttle = new Throttle(120);
const API = "https://api.scryfall.com";

type ScryfallColor = ManaSymbol;

interface ImageUris {
  small: string;
  normal: string;
  large: string;
  art_crop: string;
}

interface ScryfallFace {
  name: string;
  mana_cost?: string;
  type_line?: string;
  colors?: ScryfallColor[];
  cmc?: number;
  image_uris?: ImageUris;
}

export interface ScryfallCard {
  name: string;
  set: string;
  layout: string;
  lang: string;
  collector_number: string;
  rarity: string;
  released_at: string;
  cmc?: number;
  mana_cost?: string;
  type_line?: string;
  colors?: ScryfallColor[];
  color_identity: ScryfallColor[];
  keywords: string[];
  image_uris?: ImageUris;
  card_faces?: ScryfallFace[];
  border_color: string;
  full_art: boolean;
  textless: boolean;
  frame_effects?: string[];
  promo_types?: string[];
  booster: boolean;
  scryfall_uri: string;
}

export interface ScryfallSet {
  code: string;
  name: string;
  set_type: string;
  released_at: string;
  parent_set_code?: string;
  icon_svg_uri: string;
  card_count: number;
}

interface CardList {
  data: ScryfallCard[];
  has_more: boolean;
  next_page?: string;
}

/** Every card matching a Scryfall query (all pages); empty when nothing matches. */
export const searchAll = async (query: string, unique: "prints" | "cards" = "prints"): Promise<ScryfallCard[]> => {
  const cards: ScryfallCard[] = [];
  let url: string | undefined = `${API}/cards/search?${new URLSearchParams({ q: query, unique, order: "set" })}`;
  while (url) {
    const { status, body }: { status: number; body: CardList } = await fetchJson<CardList>(url, throttle, {
      acceptStatuses: [404],
    });
    if (status === 404) break;
    cards.push(...body.data);
    url = body.has_more ? body.next_page : undefined;
  }
  return cards;
};

export const fetchAllSets = (): Promise<ScryfallSet[]> =>
  dedupe("scryfall-sets", async () => {
    const cached = await readCache<ScryfallSet[]>("scryfall-sets");
    if (cached && isFresh(cached, DAY_MS)) return cached.value;
    try {
      const { body } = await fetchJson<{ data: ScryfallSet[] }>(`${API}/sets`, throttle);
      await writeCache("scryfall-sets", body.data);
      return body.data;
    } catch (error) {
      if (cached) return cached.value;
      throw error;
    }
  });

/** Looks cards up by exact name, 75 at a time. */
export const fetchByNames = async (names: string[]): Promise<Map<string, ScryfallCard>> => {
  const found = new Map<string, ScryfallCard>();
  for (let i = 0; i < names.length; i += 75) {
    const chunk = names.slice(i, i + 75);
    const { body } = await fetchJson<{ data: ScryfallCard[] }>(`${API}/cards/collection`, throttle, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers: chunk.map((name) => ({ name: name.replace(/\s*\/{2,3}\s*/, " // ") })) }),
    });
    for (const card of body.data) found.set(card.name, card);
  }
  return found;
};

// ---- Turning Scryfall cards into our Card shape (mirrors limitedgrades.com's Scryfall index) ----

const COLOR_BY_SYMBOL: Record<ScryfallColor, Color> = {
  W: Color.WHITE,
  U: Color.BLUE,
  B: Color.BLACK,
  R: Color.RED,
  G: Color.GREEN,
};
const SYMBOLS: ScryfallColor[] = ["W", "U", "B", "R", "G"];

/** Split cards keep "A // B"; every other multi-face layout goes by its front face, as 17Lands does. */
export const scryfallCardName = (card: ScryfallCard): string =>
  card.layout !== "split" && card.card_faces?.length ? card.card_faces[0]!.name : card.name;

const manaCostColors = (manaCost: string | undefined): ScryfallColor[] =>
  SYMBOLS.filter((symbol) => manaCost?.includes(symbol));

const cardColors = (card: ScryfallCard): ScryfallColor[] => {
  const colors = card.colors ?? card.card_faces?.[0]?.colors ?? [];
  if (colors.length === 0 && card.keywords.includes("Devoid")) {
    return manaCostColors(card.mana_cost ?? card.card_faces?.[0]?.mana_cost);
  }
  return SYMBOLS.filter((symbol) => colors.includes(symbol));
};

const tableColor = (colors: ScryfallColor[]): Color => {
  if (colors.length === 0) return Color.COLORLESS;
  if (colors.length > 1) return Color.MULTICOLOR;
  return COLOR_BY_SYMBOL[colors[0]!];
};

const cardTypes = (card: ScryfallCard): CardType[] => {
  const typeLine = (card.type_line ?? card.card_faces?.map((f) => f.type_line).join(" // ") ?? "").toLowerCase();
  return ALL_CARD_TYPES.filter((type) => typeLine.includes(type));
};

const RARITIES: Record<string, Rarity> = {
  common: Rarity.COMMON,
  uncommon: Rarity.UNCOMMON,
  rare: Rarity.RARE,
  mythic: Rarity.MYTHIC,
};

export const toCard = (card: ScryfallCard, bonus: boolean): Card => {
  const front = card.card_faces?.[0];
  const back = card.card_faces?.[1];
  const frontImages = card.image_uris ?? front?.image_uris;
  const backImages = card.image_uris ? undefined : back?.image_uris;
  const colors = cardColors(card);
  const isLand = (card.type_line ?? front?.type_line ?? "").includes("Land");
  return {
    name: scryfallCardName(card),
    color: tableColor(colors),
    // Lands are judged by the colors they make; spells by the colors they cost.
    colors: isLand && colors.length === 0 ? SYMBOLS.filter((s) => card.color_identity.includes(s)) : colors,
    rarity: RARITIES[card.rarity] ?? Rarity.MYTHIC,
    cardTypes: cardTypes(card),
    manaValue: card.cmc ?? front?.cmc ?? 0,
    manaCost: card.mana_cost ?? front?.mana_cost ?? "",
    typeLine: front?.type_line ?? card.type_line ?? "",
    collectorNumber: card.collector_number,
    bonus,
    cardUrl: frontImages?.normal ?? "",
    cardBackUrl: backImages?.normal ?? "",
    thumbUrl: frontImages?.small ?? "",
    thumbBackUrl: backImages?.small ?? "",
    scryfallUri: card.scryfall_uri,
    overallStats: null,
    stats: {},
  };
};

// ---- The draftable pool: what you can open in a booster ----

const VARIANT_FRAME_EFFECTS = new Set(["showcase", "extendedart", "inverted", "etched", "shatteredglass"]);

const isBasicLand = (card: ScryfallCard): boolean => /\bBasic\b.*\bLand\b/.test(card.type_line ?? "");

/** The plain printing of a main-set card (not a borderless/showcase/foil-treatment variant). */
const isRegularPrinting = (card: ScryfallCard): boolean =>
  /^\d+$/.test(card.collector_number) &&
  (card.border_color === "black" || card.border_color === "white") &&
  !card.full_art &&
  !card.textless &&
  !(card.frame_effects ?? []).some((effect) => VARIANT_FRAME_EFFECTS.has(effect)) &&
  (card.promo_types ?? []).every((type) => type === "universesbeyond");

const byCollectorNumber = (a: ScryfallCard, b: ScryfallCard): number =>
  Number.parseInt(a.collector_number, 10) - Number.parseInt(b.collector_number, 10);

export interface PoolResult {
  cards: Card[];
  bonusSources: string[];
}

/**
 * Main set (regular printings, no basics) plus the bonus sheet: the set's "masterpiece" child sets
 * (Star Trek's Stardates) and the Special Guests released alongside it (how Reality Fracture's
 * bonus sheet is listed).
 */
export const fetchBoosterPool = async (scryfallCode: string): Promise<PoolResult> => {
  const sets = await fetchAllSets();
  const info = sets.find((s) => s.code === scryfallCode);
  const printings = await searchAll(`e:${scryfallCode}`, "prints");
  const flagged = printings.some((card) => card.booster);
  const main = printings
    .filter((card) => card.lang === "en" && !isBasicLand(card) && isRegularPrinting(card))
    .filter((card) => !flagged || card.booster)
    .sort(byCollectorNumber);

  const byName = new Map<string, Card>();
  for (const card of main) {
    const converted = toCard(card, false);
    if (!byName.has(converted.name)) byName.set(converted.name, converted);
  }

  const bonusSources: string[] = [];
  const addBonus = (cards: ScryfallCard[], source: string): void => {
    let added = 0;
    for (const card of cards.filter((c) => !isBasicLand(c)).sort(byCollectorNumber)) {
      const converted = toCard(card, true);
      if (!byName.has(converted.name)) {
        byName.set(converted.name, converted);
        added += 1;
      }
    }
    if (added > 0) bonusSources.push(`${source} (${added})`);
  };

  for (const child of sets.filter((s) => s.parent_set_code === scryfallCode && s.set_type === "masterpiece")) {
    addBonus(await searchAll(`e:${child.code}`, "prints"), child.name);
  }
  if (info) {
    const guests = (await searchAll(`e:spg date=${info.released_at}`, "prints")).filter(
      (card) => card.released_at === info.released_at
    );
    addBonus(guests, "Special Guests");
  }
  return { cards: [...byName.values()], bonusSources };
};

/** A set symbol as raw SVG paths, so the UI can paint it in rarity gradients. */
export const fetchSetIcon = async (scryfallCode: string): Promise<SetIconData | null> => {
  const sets = await fetchAllSets();
  const info = sets.find((s) => s.code === scryfallCode);
  if (!info?.icon_svg_uri) return null;
  const { text } = await fetchText(info.icon_svg_uri, throttle);
  const viewBox = /viewBox="([^"]+)"/.exec(text)?.[1];
  const paths = [...text.matchAll(/<path[^>]*?\sd="([^"]+)"/g)].map((m) => m[1]!);
  return viewBox && paths.length > 0 ? { viewBox, paths } : null;
};
