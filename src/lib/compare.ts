import { indexPlacements, type TierList } from "./tierModel.ts";

export interface CompareRow {
  name: string;
  /** Tier index in each list, or null when unranked there. */
  aTier: number | null;
  bTier: number | null;
  /**
   * How much worse B rates the card than A, in A's tiers (positive: B has it lower). Null unless
   * both lists rank it.
   */
  delta: number | null;
}

export interface CompareSummary {
  rows: CompareRow[];
  /** Cards both lists rank. */
  common: number;
  sameTier: number;
  withinOne: number;
  meanAbsDelta: number;
  /** Rank correlation over the cards both lists rank (null with fewer than 3). */
  spearman: number | null;
  /** True when both lists use the same tier labels, so "same tier" is literal. */
  sameScale: boolean;
}

const sameLabels = (a: TierList, b: TierList): boolean =>
  a.tiers.length === b.tiers.length && a.tiers.every((t, i) => t.label === b.tiers[i]!.label);

/** Average ranks (1-based) for a list of sortable keys, sharing ranks on ties. */
const ranks = (keys: number[]): number[] => {
  const order = keys.map((key, i) => ({ key, i })).sort((x, y) => x.key - y.key);
  const result = new Array<number>(keys.length);
  let start = 0;
  while (start < order.length) {
    let end = start;
    while (end + 1 < order.length && order[end + 1]!.key === order[start]!.key) end += 1;
    const average = (start + end) / 2 + 1;
    for (let k = start; k <= end; k += 1) result[order[k]!.i] = average;
    start = end + 1;
  }
  return result;
};

const pearson = (x: number[], y: number[]): number | null => {
  const n = x.length;
  if (n < 3) return null;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (x[i]! - mx) * (y[i]! - my);
    sxx += (x[i]! - mx) ** 2;
    syy += (y[i]! - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? null : sxy / Math.sqrt(sxx * syy);
};

/** Compares two tier lists over `names` (e.g. the cards matching the filters). */
export const compareLists = (a: TierList, b: TierList, names: string[]): CompareSummary => {
  const aIndex = indexPlacements(a);
  const bIndex = indexPlacements(b);
  const scale = sameLabels(a, b);
  const aSpan = Math.max(1, a.tiers.length - 1);
  const bSpan = Math.max(1, b.tiers.length - 1);

  const rows: CompareRow[] = [];
  const common: { aKey: number; bKey: number }[] = [];
  let sameTier = 0;
  let withinOne = 0;
  let absSum = 0;
  for (const name of names) {
    const ap = aIndex.get(name);
    const bp = bIndex.get(name);
    let delta: number | null = null;
    if (ap && bp) {
      delta = scale ? bp.tierIndex - ap.tierIndex : (bp.tierIndex / bSpan - ap.tierIndex / aSpan) * aSpan;
      const rounded = Math.round(delta * 10) / 10;
      delta = rounded;
      if (Math.abs(delta) < 0.5) sameTier += 1;
      if (Math.abs(delta) <= 1) withinOne += 1;
      absSum += Math.abs(delta);
      // Order within a tier counts too, so lists that agree on tiers can still differ in order.
      common.push({ aKey: ap.tierIndex * 10_000 + ap.position, bKey: bp.tierIndex * 10_000 + bp.position });
    }
    if (ap || bp) rows.push({ name, aTier: ap?.tierIndex ?? null, bTier: bp?.tierIndex ?? null, delta });
  }
  const spearman = pearson(
    ranks(common.map((c) => c.aKey)),
    ranks(common.map((c) => c.bKey))
  );
  return {
    rows,
    common: common.length,
    sameTier,
    withinOne,
    meanAbsDelta: common.length ? absSum / common.length : 0,
    spearman,
    sameScale: scale,
  };
};
