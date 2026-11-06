import { ALL_GRADES, type Card, type Grade } from "./types.ts";

export interface Tier {
  id: string;
  label: string;
  color: string;
}

export interface TierList {
  id: string;
  name: string;
  setCode: string;
  /** Best first. */
  tiers: Tier[];
  /** Card names in each tier, best first. Cards in no tier are unranked. */
  placements: Record<string, string[]>;
  createdAt: number;
  updatedAt: number;
  /** Where it came from, e.g. "Started from 17Lands grades" or "Imported from a .txt". */
  origin?: string;
}

export const GRADE_COLORS: Record<Grade, string> = {
  "A+": "#23c552",
  A: "#41c755",
  "A-": "#60ca58",
  "B+": "#7ecc5b",
  B: "#9ccf5f",
  "B-": "#bad162",
  "C+": "#d9d465",
  C: "#f7d668",
  "C-": "#eeaf5d",
  "D+": "#e68751",
  D: "#dd6046",
  "D-": "#d5383a",
  F: "#cc112f",
};

const PALETTE = ALL_GRADES.map((grade) => GRADE_COLORS[grade]);

const hexToRgb = (hex: string): [number, number, number] => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

/** A color from the grade gradient (green to red) for tier `index` of `count`. */
export const colorForPosition = (index: number, count: number): string => {
  if (count <= 1) return PALETTE[0]!;
  const position = (index / (count - 1)) * (PALETTE.length - 1);
  const low = Math.floor(position);
  const high = Math.min(PALETTE.length - 1, low + 1);
  const t = position - low;
  const [r1, g1, b1] = hexToRgb(PALETTE[low]!);
  const [r2, g2, b2] = hexToRgb(PALETTE[high]!);
  const mix = (a: number, b: number): string =>
    Math.round(a + (b - a) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${mix(r1, r2)}${mix(g1, g2)}${mix(b1, b2)}`;
};

export interface TierPreset {
  id: string;
  name: string;
  description: string;
  labels: string[];
}

export const TIER_PRESETS: TierPreset[] = [
  { id: "grades", name: "Letter grades", description: "A+ to F, the same scale as the 17Lands grades", labels: [...ALL_GRADES] },
  { id: "simple", name: "S to F", description: "Six broad tiers", labels: ["S", "A", "B", "C", "D", "F"] },
  {
    id: "numeric",
    name: "0.0 to 5.0",
    description: "Half-point steps, like the LSV-style set reviews",
    labels: ["5.0", "4.5", "4.0", "3.5", "3.0", "2.5", "2.0", "1.5", "1.0", "0.5", "0.0"],
  },
];

/** Labels that mean "not ranked" when they head a section of an imported list. */
export const UNRANKED_LABELS = ["unranked", "unrated", "not ranked", "unsorted", "untiered", "pool", "unplaced"];

export const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const tierColorFor = (label: string, index: number, count: number): string =>
  (GRADE_COLORS as Record<string, string>)[label] ?? colorForPosition(index, count);

export const makeTiers = (labels: string[]): Tier[] =>
  labels.map((label, index) => ({ id: newId(), label, color: tierColorFor(label, index, labels.length) }));

export const createList = (options: {
  name: string;
  setCode: string;
  labels: string[];
  /** Cards per tier label. */
  byLabel?: Record<string, string[]>;
  origin?: string;
}): TierList => {
  const tiers = makeTiers(options.labels);
  const placements: Record<string, string[]> = {};
  for (const tier of tiers) placements[tier.id] = [...(options.byLabel?.[tier.label] ?? [])];
  const now = Date.now();
  return {
    id: newId(),
    name: options.name,
    setCode: options.setCode,
    tiers,
    placements,
    createdAt: now,
    updatedAt: now,
    origin: options.origin,
  };
};

export interface Placement {
  tierId: string;
  tierIndex: number;
  /** Position within the tier, 0 = best. */
  position: number;
}

export const indexPlacements = (list: TierList): Map<string, Placement> => {
  const index = new Map<string, Placement>();
  list.tiers.forEach((tier, tierIndex) => {
    (list.placements[tier.id] ?? []).forEach((name, position) => {
      if (!index.has(name)) index.set(name, { tierId: tier.id, tierIndex, position });
    });
  });
  return index;
};

const touch = (list: TierList, changes: Partial<TierList>): TierList => ({
  ...list,
  ...changes,
  updatedAt: Date.now(),
});

const withoutCard = (placements: Record<string, string[]>, name: string): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  for (const [tierId, names] of Object.entries(placements)) {
    result[tierId] = names.includes(name) ? names.filter((n) => n !== name) : names;
  }
  return result;
};

/** Where a moved card lands relative to the cards around it. */
export type Anchor = { before: string } | { after: string } | null;

/**
 * Moves a card into a tier (or out of all tiers when `tierId` is null). The anchor places it next
 * to a neighbor; cards hidden by filters keep their places because only the anchor matters.
 */
export const moveCard = (list: TierList, name: string, tierId: string | null, anchor: Anchor = null): TierList => {
  const placements = withoutCard(list.placements, name);
  if (tierId !== null) {
    const names = [...(placements[tierId] ?? [])];
    let index = names.length;
    if (anchor && "before" in anchor) {
      const i = names.indexOf(anchor.before);
      if (i !== -1) index = i;
    } else if (anchor && "after" in anchor) {
      const i = names.indexOf(anchor.after);
      if (i !== -1) index = i + 1;
    }
    names.splice(index, 0, name);
    placements[tierId] = names;
  }
  return touch(list, { placements });
};

/** Puts a card at the end of a tier, unless it's already in that tier. */
export const assignTier = (list: TierList, name: string, tierId: string | null): TierList => {
  const current = indexPlacements(list).get(name);
  if ((current?.tierId ?? null) === tierId) return list;
  return moveCard(list, name, tierId);
};

/** One tier better (delta -1) or worse (+1). Unranked sits below the last tier. */
export const nudgeTier = (list: TierList, name: string, delta: number): TierList => {
  const current = indexPlacements(list).get(name);
  const count = list.tiers.length;
  const from = current ? current.tierIndex : count;
  const to = Math.max(0, Math.min(count, from + delta));
  if (to === from) return list;
  return moveCard(list, name, to === count ? null : list.tiers[to]!.id);
};

export const renameTier = (list: TierList, tierId: string, label: string): TierList =>
  touch(list, { tiers: list.tiers.map((t) => (t.id === tierId ? { ...t, label } : t)) });

export const recolorTier = (list: TierList, tierId: string, color: string): TierList =>
  touch(list, { tiers: list.tiers.map((t) => (t.id === tierId ? { ...t, color } : t)) });

export const insertTier = (list: TierList, index: number, label: string): TierList => {
  const tier: Tier = { id: newId(), label, color: colorForPosition(index, list.tiers.length + 1) };
  const tiers = [...list.tiers];
  tiers.splice(index, 0, tier);
  return touch(list, { tiers, placements: { ...list.placements, [tier.id]: [] } });
};

/** Removes a tier; its cards go back to unranked. */
export const removeTier = (list: TierList, tierId: string): TierList => {
  const placements = { ...list.placements };
  delete placements[tierId];
  return touch(list, { tiers: list.tiers.filter((t) => t.id !== tierId), placements });
};

export const moveTier = (list: TierList, tierId: string, delta: number): TierList => {
  const from = list.tiers.findIndex((t) => t.id === tierId);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= list.tiers.length) return list;
  const tiers = [...list.tiers];
  const [tier] = tiers.splice(from, 1);
  tiers.splice(to, 0, tier!);
  return touch(list, { tiers });
};

export const clearTier = (list: TierList, tierId: string): TierList =>
  touch(list, { placements: { ...list.placements, [tierId]: [] } });

/** Gives each tier the gradient color for its position (or its grade color). */
export const recolorAll = (list: TierList): TierList =>
  touch(list, {
    tiers: list.tiers.map((tier, index) => ({ ...tier, color: tierColorFor(tier.label, index, list.tiers.length) })),
  });

export const rankedCount = (list: TierList, names: Set<string>): number => {
  let count = 0;
  for (const tierNames of Object.values(list.placements)) {
    for (const name of tierNames) if (names.has(name)) count += 1;
  }
  return count;
};

/** 17Lands' grades as a read-only tier list (for comparing, or as a starting point). */
export const SEVENTEEN_LANDS_LIST_ID = "17lands";

export const gradesAsTierList = (cards: Card[], deckCode: string, setCode: string, deckLabel: string): TierList => {
  const tiers: Tier[] = ALL_GRADES.map((grade) => ({ id: `17l:${grade}`, label: grade, color: GRADE_COLORS[grade] }));
  const placements: Record<string, string[]> = {};
  for (const grade of ALL_GRADES) {
    placements[`17l:${grade}`] = cards
      .filter((card) => card.stats[deckCode]?.grade === grade)
      .sort((a, b) => b.stats[deckCode]!.score - a.stats[deckCode]!.score)
      .map((card) => card.name);
  }
  return {
    id: SEVENTEEN_LANDS_LIST_ID,
    name: deckCode === "all" ? "17Lands grades" : `17Lands grades · ${deckLabel}`,
    setCode,
    tiers,
    placements,
    createdAt: 0,
    updatedAt: 0,
    origin: "17Lands",
  };
};

/** Checks data read back from storage or a file; drops anything malformed. */
export const sanitizeList = (value: unknown): TierList | null => {
  if (!value || typeof value !== "object") return null;
  const list = value as Partial<TierList>;
  if (typeof list.id !== "string" || typeof list.name !== "string" || typeof list.setCode !== "string") return null;
  if (!Array.isArray(list.tiers)) return null;
  const tiers = list.tiers.filter(
    (t): t is Tier => Boolean(t) && typeof t.id === "string" && typeof t.label === "string"
  );
  const placements: Record<string, string[]> = {};
  for (const tier of tiers) {
    const names = list.placements?.[tier.id];
    placements[tier.id] = Array.isArray(names) ? names.filter((n) => typeof n === "string") : [];
  }
  return {
    id: list.id,
    name: list.name,
    setCode: list.setCode,
    tiers: tiers.map((t, i) => ({ ...t, color: typeof t.color === "string" ? t.color : colorForPosition(i, tiers.length) })),
    placements,
    createdAt: typeof list.createdAt === "number" ? list.createdAt : Date.now(),
    updatedAt: typeof list.updatedAt === "number" ? list.updatedAt : Date.now(),
    origin: typeof list.origin === "string" ? list.origin : undefined,
  };
};
