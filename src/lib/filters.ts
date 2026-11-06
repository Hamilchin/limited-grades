import { cardFitsDeck, Decks, type Deck } from "./decks.ts";
import { ALL_CARD_TYPES, ALL_RARITIES, CardType, Rarity, type Card } from "./types.ts";

// The site's filters, with the same URL encoding (?deck=wu&rarity=cu&type=ci&mana=123).

export const ManaValue = {
  ONE: "1",
  TWO: "2",
  THREE: "3",
  FOUR: "4",
  FIVE: "5",
  SIX_PLUS: "6+",
} as const;
export type ManaValue = (typeof ManaValue)[keyof typeof ManaValue];
export const ALL_MANA_VALUES: ManaValue[] = Object.values(ManaValue);

export const RARITY_CHARS: Record<Rarity, string> = {
  [Rarity.COMMON]: "c",
  [Rarity.UNCOMMON]: "u",
  [Rarity.RARE]: "r",
  [Rarity.MYTHIC]: "m",
};

export const CARD_TYPE_CHARS: Record<CardType, string> = {
  [CardType.CREATURE]: "c",
  [CardType.INSTANT]: "i",
  [CardType.SORCERY]: "s",
  [CardType.ARTIFACT]: "a",
  [CardType.ENCHANTMENT]: "e",
  [CardType.BATTLE]: "b",
  [CardType.PLANESWALKER]: "p",
  [CardType.LAND]: "l",
};

export const MANA_VALUE_CHARS: Record<ManaValue, string> = {
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6+": "6",
};

export const getManaValueBucket = (manaValue: number): ManaValue | null => {
  if (manaValue < 1) return null;
  if (manaValue >= 6) return ManaValue.SIX_PLUS;
  return String(Math.floor(manaValue)) as ManaValue;
};

export const decodeSet = <T extends string>(value: string | null, chars: Record<T, string>, all: T[]): Set<T> => {
  if (value === null) return new Set(all);
  const result = new Set<T>();
  for (const [item, char] of Object.entries(chars) as [T, string][]) {
    if (value.includes(char)) result.add(item);
  }
  return result;
};

/** Null means "everything" (the parameter is dropped from the URL). */
export const encodeSet = <T extends string>(values: Set<T>, chars: Record<T, string>, all: T[]): string | null =>
  values.size === all.length && all.every((v) => values.has(v))
    ? null
    : all.filter((v) => values.has(v)).map((v) => chars[v]).join("");

export interface CardFilters {
  deck: Deck;
  rarities: Set<Rarity>;
  cardTypes: Set<CardType>;
  manaValues: Set<ManaValue>;
}

export const DEFAULT_FILTERS: CardFilters = {
  deck: Decks.ALL,
  rarities: new Set(ALL_RARITIES),
  cardTypes: new Set(ALL_CARD_TYPES),
  manaValues: new Set(ALL_MANA_VALUES),
};

/** Rarity, type and mana value, as on the grades page (the deck is applied separately there). */
export const matchesAttributeFilters = (card: Card, filters: CardFilters): boolean => {
  if (filters.rarities.size < ALL_RARITIES.length && !filters.rarities.has(card.rarity)) return false;
  if (filters.cardTypes.size < ALL_CARD_TYPES.length && !card.cardTypes.some((t) => filters.cardTypes.has(t))) {
    return false;
  }
  if (filters.manaValues.size < ALL_MANA_VALUES.length) {
    const bucket = getManaValueBucket(card.manaValue);
    if (!bucket || !filters.manaValues.has(bucket)) return false;
  }
  return true;
};

/** For tier lists: the attribute filters plus "playable in this deck's colors". */
export const matchesListFilters = (card: Card, filters: CardFilters): boolean =>
  matchesAttributeFilters(card, filters) && cardFitsDeck(card.colors, filters.deck);

export const filtersAreActive = (filters: CardFilters): boolean =>
  filters.deck !== Decks.ALL ||
  filters.rarities.size < ALL_RARITIES.length ||
  filters.cardTypes.size < ALL_CARD_TYPES.length ||
  filters.manaValues.size < ALL_MANA_VALUES.length;
