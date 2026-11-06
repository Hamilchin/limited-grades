// Shared between the browser app and the local API server (which runs these files through
// Node's type stripping), so this module sticks to erasable TypeScript: no enums.

export const Color = {
  WHITE: "white",
  BLUE: "blue",
  BLACK: "black",
  RED: "red",
  GREEN: "green",
  MULTICOLOR: "multicolor",
  COLORLESS: "colorless",
} as const;
export type Color = (typeof Color)[keyof typeof Color];
export const ALL_COLORS: Color[] = Object.values(Color);

export const Rarity = {
  COMMON: "common",
  UNCOMMON: "uncommon",
  RARE: "rare",
  MYTHIC: "mythic",
} as const;
export type Rarity = (typeof Rarity)[keyof typeof Rarity];
export const ALL_RARITIES: Rarity[] = Object.values(Rarity);

export const CardType = {
  CREATURE: "creature",
  INSTANT: "instant",
  SORCERY: "sorcery",
  ARTIFACT: "artifact",
  ENCHANTMENT: "enchantment",
  BATTLE: "battle",
  PLANESWALKER: "planeswalker",
  LAND: "land",
} as const;
export type CardType = (typeof CardType)[keyof typeof CardType];
export const ALL_CARD_TYPES: CardType[] = Object.values(CardType);

export const Grade = {
  A_PLUS: "A+",
  A: "A",
  A_MINUS: "A-",
  B_PLUS: "B+",
  B: "B",
  B_MINUS: "B-",
  C_PLUS: "C+",
  C: "C",
  C_MINUS: "C-",
  D_PLUS: "D+",
  D: "D",
  D_MINUS: "D-",
  F: "F",
} as const;
export type Grade = (typeof Grade)[keyof typeof Grade];
export const ALL_GRADES: Grade[] = Object.values(Grade);

export type ManaSymbol = "W" | "U" | "B" | "R" | "G";

export interface CardStats {
  winrate: number;
  gameCount: number;
  grade: Grade;
  score: number;
}

export interface OverallCardStats {
  gameCount: number;
  lastSeenAt: number | null;
  takenAt: number | null;
  playedWinrate: number | null;
  openingHandWinrate: number | null;
  drawnWinrate: number | null;
  notDrawnWinrate: number | null;
}

export interface Card {
  /** Unique within a set. Front face for double-faced cards, "A // B" for split cards. */
  name: string;
  /** The column the card sits in on the grades table. */
  color: Color;
  /** Colors needed to play it, for the deck filter (lands use their color identity). */
  colors: ManaSymbol[];
  rarity: Rarity;
  cardTypes: CardType[];
  manaValue: number;
  manaCost: string;
  typeLine: string;
  collectorNumber: string;
  /** From the bonus sheet (e.g. Stardates) or Special Guests rather than the main set. */
  bonus: boolean;
  /** Card image (17Lands' when it has the card, otherwise Scryfall's). */
  cardUrl: string;
  cardBackUrl: string;
  /** Smaller Scryfall image for the image views. */
  thumbUrl: string;
  thumbBackUrl: string;
  scryfallUri: string;
  overallStats: OverallCardStats | null;
  /** 17Lands stats by deck code ("all", "wu", ...). Empty when 17Lands has no grade for the card. */
  stats: Record<string, CardStats>;
}

export type StatsStatus =
  | { kind: "ok"; updatedAt: string; arenaStart: string | null }
  | { kind: "embargo"; arenaStart: string; availableAt: string }
  | { kind: "none"; arenaStart: string | null; checkedAt: string }
  | { kind: "error"; message: string }
  /** This copy was built without 17Lands data (the hosted build, unless turned on). */
  | { kind: "disabled"; cardDataUrl: string };

export interface SetPayload {
  setCode: string;
  cards: Card[];
  stats: StatsStatus;
  poolUpdatedAt: string;
  iconData: SetIconData | null;
}

export interface SetIconData {
  viewBox: string;
  paths: string[];
}
