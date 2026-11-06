import { Decks, MONO_COLOR_DECKS, TWO_COLOR_DECKS, type Deck } from "./decks.ts";

export type Format = "PremierDraft" | "TradDraft" | "PickTwoDraft";
export type TimePeriod = "ALL_TIME" | "LATEST_EVENT";

export interface MagicSet {
  code: string;
  label: string;
  /** When the set's drafts opened on Arena (17Lands' start date is preferred when it has one). */
  startDate: string;
  decks: Deck[];
  customDeckLabels: Record<string, string>;
  format: Format;
  /** The `expansion` 17Lands expects, when it isn't just the uppercased code. */
  code17Lands: string;
  timePeriod: TimePeriod;
  /** Scryfall set code for the card pool, or null when the "set" is a cube. */
  scryfallCode: string | null;
}

interface Options {
  format?: Format;
  code17Lands?: string;
  timePeriod?: TimePeriod;
  scryfallCode?: string | null;
}

const set = (
  code: string,
  label: string,
  startDate: string,
  decks: (Deck | [Deck, string])[] = TWO_COLOR_DECKS,
  options: Options = {}
): MagicSet => {
  const plainDecks: Deck[] = [];
  const customDeckLabels: Record<string, string> = {};
  for (const item of decks) {
    if (Array.isArray(item)) {
      plainDecks.push(item[0]);
      customDeckLabels[item[0].code] = item[1];
    } else {
      plainDecks.push(item);
    }
  }
  return {
    code,
    label,
    startDate,
    decks: plainDecks,
    customDeckLabels,
    format: options.format ?? "PremierDraft",
    code17Lands: options.code17Lands ?? code.toUpperCase(),
    timePeriod: options.timePeriod ?? "ALL_TIME",
    scryfallCode: options.scryfallCode === undefined ? code : options.scryfallCode,
  };
};

const {
  AZORIUS,
  DIMIR,
  RAKDOS,
  GRUUL,
  SELESNYA,
  ORZHOV,
  IZZET,
  GOLGARI,
  BOROS,
  SIMIC,
  ESPER,
  GRIXIS,
  JUND,
  NAYA,
  BANT,
  ABZAN,
  JESKAI,
  SULTAI,
  MARDU,
  TEMUR,
} = Decks;

const WEDGES_AND_ALLIES = [ABZAN, JESKAI, SULTAI, MARDU, TEMUR, ORZHOV, IZZET, GOLGARI, BOROS, SIMIC];

/** Newest first, as in the set picker. Star Trek leads; the rest mirror limitedgrades.com. */
export const ALL_SETS: MagicSet[] = [
  set("trk", "Star Trek", "2026-11-10"),
  set("fra", "Reality Fracture", "2026-09-29", [
    [AZORIUS, "Fatehold"],
    [DIMIR, "Theorix"],
    [RAKDOS, "Stingerquill"],
    [GRUUL, "Konstrari"],
    [SELESNYA, "Vigorbloom"],
    [ORZHOV, "Liliana"],
    [IZZET, "Chandra"],
    [GOLGARI, "Garruk"],
    [BOROS, "Ajani"],
    [SIMIC, "Jace"],
  ]),
  set("hob", "The Hobbit", "2026-08-11", [AZORIUS, RAKDOS, GOLGARI, BOROS, SIMIC]),
  set("msh", "Marvel Super Heroes", "2026-06-23"),
  set("sos", "Secrets of Strixhaven", "2026-04-21", [
    [ORZHOV, "Silverquill"],
    [IZZET, "Prismari"],
    [GOLGARI, "Witherbloom"],
    [BOROS, "Lorehold"],
    [SIMIC, "Quandrix"],
  ]),
  set("tmt", "Ninja Turtles", "2026-03-03", [ORZHOV, IZZET, GOLGARI, BOROS, SIMIC]),
  set("ecl", "Lorwyn Eclipsed", "2026-01-20"),
  set("tla", "Avatar", "2025-11-18"),
  set("powered", "Powered Cube", "2025-10-28", TWO_COLOR_DECKS, {
    code17Lands: "Cube - Powered",
    timePeriod: "LATEST_EVENT",
    scryfallCode: null,
  }),
  set("om1", "Through the Omenpaths", "2025-09-22", TWO_COLOR_DECKS, {
    format: "PickTwoDraft",
  }),
  set("eoe", "Edge of Eternities", "2025-07-29"),
  set("fin", "Final Fantasy", "2025-06-10"),
  set("tdm", "Dragonstorm", "2025-04-08", WEDGES_AND_ALLIES),
  set("dft", "Aetherdrift", "2025-02-11"),
  set("pio", "Pioneer Masters", "2024-12-10"),
  set("fdn", "Foundations", "2024-11-12"),
  set("dsk", "Duskmourn", "2024-09-24"),
  set("blb", "Bloomburrow", "2024-07-30"),
  set("mh3", "Modern Horizons 3", "2024-06-11"),
  set("otj", "Thunder Junction", "2024-04-16"),
  set("mkm", "Karlov Manor", "2024-02-06"),
  set("lci", "Caverns of Ixalan", "2023-11-14"),
  set("woe", "Wilds of Eldraine", "2023-09-05"),
  set("ltr", "Lord of the Rings", "2023-06-20"),
  set("mom", "March of the Machine", "2023-04-18"),
  set("one", "All Will Be One", "2023-02-07"),
  set("bro", "Brothers' War", "2022-11-15"),
  set("dmu", "Dominaria United", "2022-09-01"),
  set("hbg", "Baldur's Gate", "2022-07-07"),
  set("snc", "New Capenna", "2022-04-28", [
    [ESPER, "Obscura"],
    [GRIXIS, "Maestros"],
    [JUND, "Riveteers"],
    [NAYA, "Cabaretti"],
    [BANT, "Brokers"],
    AZORIUS,
    DIMIR,
    RAKDOS,
    GRUUL,
    SELESNYA,
  ]),
  set("neo", "Neon Dynasty", "2022-02-10"),
  set("vow", "Crimson Vow", "2021-11-11"),
  set("mid", "Midnight Hunt", "2021-09-16"),
  set("afr", "Forgotten Realms", "2021-07-08"),
  set("stx", "Strixhaven", "2021-04-15", [
    [ORZHOV, "Silverquill"],
    [IZZET, "Prismari"],
    [GOLGARI, "Witherbloom"],
    [BOROS, "Lorehold"],
    [SIMIC, "Quandrix"],
  ]),
  set("khm", "Kaldheim", "2021-01-28"),
  set("znr", "Zendikar Rising", "2020-09-17"),
  set("iko", "Ikoria", "2020-04-16"),
  set("thb", "Theros Beyond Death", "2020-04-16"),
  set("eld", "Throne of Eldraine", "2020-04-16", MONO_COLOR_DECKS.concat(TWO_COLOR_DECKS)),
  set("war", "War of the Spark", "2020-04-16"),
  set("rna", "Ravnica Allegiance", "2020-04-16", [AZORIUS, RAKDOS, GRUUL, ORZHOV, SIMIC]),
  set("grn", "Guilds of Ravnica", "2020-04-16", [DIMIR, SELESNYA, IZZET, GOLGARI, BOROS]),
  set("dom", "Dominaria", "2020-04-16"),
  set("akr", "Amonkhet", "2020-08-13"),
  set("klr", "Kaladesh", "2020-11-12"),
  set("sir", "Shadows over Innistrad", "2023-03-21"),
  set("ktk", "Khans of Tarkir", "2023-12-12", WEDGES_AND_ALLIES),
  set("cube", "Arena Cube", "2024-10-29", TWO_COLOR_DECKS, {
    code17Lands: "Cube",
    timePeriod: "LATEST_EVENT",
    scryfallCode: null,
  }),
  set("chaos", "Remix: Artifacts", "2024-04-02", TWO_COLOR_DECKS, {
    code17Lands: "Remix - Artifacts",
    timePeriod: "LATEST_EVENT",
    scryfallCode: null,
  }),
];

export const DEFAULT_SET_CODE = "trk";

const SETS_BY_CODE: Record<string, MagicSet> = Object.fromEntries(ALL_SETS.map((s) => [s.code, s]));

export const lookupSet = (code: string | undefined): MagicSet | undefined =>
  code ? SETS_BY_CODE[code.toLowerCase()] : undefined;

export const getDeckLabel = (s: MagicSet, d: Deck): string =>
  s.customDeckLabels[d.code] || d.defaultLabel;

const DAY_MS = 24 * 60 * 60 * 1000;

export const daysSince = (isoDate: string, now = Date.now()): number =>
  (now - new Date(isoDate).getTime()) / DAY_MS;

/** 17Lands asks tools to wait this long after a set's Arena release before showing its data. */
export const EMBARGO_DAYS = 12;
