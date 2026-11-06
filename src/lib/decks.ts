import { Color, type ManaSymbol } from "./types.ts";

export interface Deck {
  code: string;
  defaultLabel: string;
  colors: Color[];
}

const deck = (code: string, defaultLabel: string, colors: Color[]): Deck => ({
  code,
  defaultLabel,
  colors,
});

const { WHITE: W, BLUE: U, BLACK: B, RED: R, GREEN: G } = Color;

export const Decks = {
  ALL: deck("all", "All decks", []),
  MONO_WHITE: deck("w", "Mono White", [W]),
  MONO_BLUE: deck("u", "Mono Blue", [U]),
  MONO_BLACK: deck("b", "Mono Black", [B]),
  MONO_RED: deck("r", "Mono Red", [R]),
  MONO_GREEN: deck("g", "Mono Green", [G]),
  AZORIUS: deck("wu", "Azorius", [W, U]),
  DIMIR: deck("ub", "Dimir", [U, B]),
  RAKDOS: deck("br", "Rakdos", [B, R]),
  GRUUL: deck("rg", "Gruul", [R, G]),
  SELESNYA: deck("wg", "Selesnya", [G, W]),
  ORZHOV: deck("wb", "Orzhov", [W, B]),
  IZZET: deck("ur", "Izzet", [U, R]),
  GOLGARI: deck("bg", "Golgari", [B, G]),
  BOROS: deck("wr", "Boros", [R, W]),
  SIMIC: deck("ug", "Simic", [G, U]),
  ESPER: deck("wub", "Esper", [W, U, B]),
  GRIXIS: deck("ubr", "Grixis", [U, B, R]),
  JUND: deck("brg", "Jund", [B, R, G]),
  NAYA: deck("wrg", "Naya", [R, G, W]),
  BANT: deck("wug", "Bant", [G, W, U]),
  ABZAN: deck("wbg", "Abzan", [W, B, G]),
  JESKAI: deck("wur", "Jeskai", [U, R, W]),
  SULTAI: deck("ubg", "Sultai", [B, G, U]),
  MARDU: deck("wbr", "Mardu", [R, W, B]),
  TEMUR: deck("urg", "Temur", [G, U, R]),
} as const;

export const MONO_COLOR_DECKS: Deck[] = [
  Decks.MONO_WHITE,
  Decks.MONO_BLUE,
  Decks.MONO_BLACK,
  Decks.MONO_RED,
  Decks.MONO_GREEN,
];

export const TWO_COLOR_DECKS: Deck[] = [
  Decks.AZORIUS,
  Decks.DIMIR,
  Decks.RAKDOS,
  Decks.GRUUL,
  Decks.SELESNYA,
  Decks.ORZHOV,
  Decks.IZZET,
  Decks.GOLGARI,
  Decks.BOROS,
  Decks.SIMIC,
];

const DECKS_BY_CODE: Record<string, Deck> = Object.fromEntries(
  Object.values(Decks).map((d) => [d.code, d])
);

export const lookupDeck = (code: string | null | undefined): Deck | undefined =>
  code ? DECKS_BY_CODE[code] : undefined;

const SYMBOL_BY_COLOR: Partial<Record<Color, ManaSymbol>> = {
  [W]: "W",
  [U]: "U",
  [B]: "B",
  [R]: "R",
  [G]: "G",
};

/** True when every color the card needs is one of the deck's colors (colorless fits any deck). */
export const cardFitsDeck = (cardColors: ManaSymbol[], d: Deck): boolean => {
  if (d.colors.length === 0) return true;
  const deckSymbols = new Set(d.colors.map((c) => SYMBOL_BY_COLOR[c]));
  return cardColors.every((symbol) => deckSymbols.has(symbol));
};
