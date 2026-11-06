import { Grade, type CardStats } from "./types.ts";

// How limitedgrades.com turns 17Lands win rates into letter grades (src/lib/CardGrader.ts in
// github.com/youssefm/limited-grades, MIT): for each deck, fit a normal distribution to the
// games-in-hand win rates of every card drawn at least 100 times, then grade each card drawn more
// than 500 times by its percentile in that distribution.

export const MIN_GAMES_DRAWN_FOR_INFERENCE = 100;
export const MIN_GAMES_DRAWN = 500;

export const GRADE_THRESHOLDS: [Grade, number][] = [
  [Grade.A_PLUS, 99],
  [Grade.A, 95],
  [Grade.A_MINUS, 90],
  [Grade.B_PLUS, 85],
  [Grade.B, 76],
  [Grade.B_MINUS, 68],
  [Grade.C_PLUS, 57],
  [Grade.C, 45],
  [Grade.C_MINUS, 36],
  [Grade.D_PLUS, 27],
  [Grade.D, 17],
  [Grade.D_MINUS, 5],
  [Grade.F, 0],
];

/** normal-distribution's rounding (used on z-scores). */
const roundTo = (value: number, decimalPlaces: number): number => {
  const factor = 10 ** decimalPlaces;
  return Math.round(value * factor) / factor;
};

/** lodash-style rounding the site applies to stored numbers (shifts the exponent to avoid 1.005 → 1). */
export const preciseRound = (n: number, precision = 0): number => {
  let [significand, exponent] = `${n}e`.split("e");
  const value = Math.round(Number(`${significand}e${Number(exponent) + precision}`));
  [significand, exponent] = `${value}e`.split("e");
  return Number(`${significand}e${Number(exponent) - precision}`);
};

// The site's percentiles come from the `normal-distribution` package, which reads a printed
// four-digit z-table rather than computing the CDF. Rebuild the same table (standard normal CDF for
// z = 0.00..3.49, rounded to four places) so scores and grades come out identical.
const erf = (x: number): number => {
  // Series for small |x|, continued fraction (via erfc) for large |x|; both accurate to ~1e-15.
  const ax = Math.abs(x);
  if (ax < 2.5) {
    let sum = x;
    let term = x;
    const x2 = x * x;
    for (let n = 1; n < 200; n += 1) {
      term *= -x2 / n;
      const contribution = term / (2 * n + 1);
      sum += contribution;
      if (Math.abs(contribution) < 1e-17) break;
    }
    return (2 / Math.sqrt(Math.PI)) * sum;
  }
  // Lentz's algorithm for erfc continued fraction.
  let f = ax;
  let c = ax;
  let d = 0;
  for (let n = 1; n < 300; n += 1) {
    const an = n / 2;
    d = ax + an * d;
    d = d === 0 ? 1e-300 : 1 / d;
    c = ax + an / c;
    if (c === 0) c = 1e-300;
    const delta = c * d;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-16) break;
  }
  const erfc = Math.exp(-ax * ax) / (f * Math.sqrt(Math.PI));
  return x >= 0 ? 1 - erfc : erfc - 1;
};

const Z_TABLE: number[][] = Array.from({ length: 35 }, (_, row) =>
  Array.from({ length: 10 }, (__, col) => {
    const z = (row * 10 + col) / 100;
    const phi = 0.5 * (1 + erf(z / Math.SQRT2));
    return Math.round(phi * 10_000) / 10_000;
  })
);

/** Percentile (0..1) of a z-score, exactly as `normal-distribution@1.1.1` computes it. */
export const tableCdf = (zScore: number): number => {
  const z = roundTo(zScore, 2);
  if (z === 0) return 0.5;
  if (z <= -3.5) return 0;
  if (z >= 3.5) return 1;
  const absZ = Math.abs(z);
  const row = Math.floor(absZ * 10);
  const col = Math.round(absZ * 100) % 10;
  const percentile = Z_TABLE[row]![col]!;
  return z < 0 ? 1 - percentile : percentile;
};

/** For tests: the table cell for row (tenths) and column (hundredths). */
export const zTableValue = (row: number, col: number): number => Z_TABLE[row]![col]!;

const mean = (values: number[]): number => {
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
};

/** Sample standard deviation (n - 1), like mathjs' `std` default. */
const sampleStd = (values: number[]): number => {
  const m = mean(values);
  let sum = 0;
  for (const v of values) sum += (v - m) * (v - m);
  return Math.sqrt(sum / (values.length - 1));
};

export const gradeForScore = (score: number): Grade =>
  GRADE_THRESHOLDS.find(([, threshold]) => score >= threshold)![0];

export interface GradeInput {
  key: string;
  winrate: number;
  gameCount: number;
}

/** Grades every card in one deck's population. Returns stats by card key for the graded ones. */
export const gradeDeck = (records: GradeInput[]): Map<string, CardStats> => {
  const result = new Map<string, CardStats>();
  const population = records.filter(
    ({ gameCount }) => gameCount >= MIN_GAMES_DRAWN_FOR_INFERENCE
  );
  if (population.length <= 1) return result;
  const winrates = population.map((r) => r.winrate);
  const m = mean(winrates);
  const sd = sampleStd(winrates);
  for (const { key, winrate, gameCount } of population) {
    if (gameCount <= MIN_GAMES_DRAWN) continue;
    const score = tableCdf((winrate - m) / sd) * 100;
    result.set(key, {
      winrate: preciseRound(winrate, 4),
      gameCount,
      grade: gradeForScore(score),
      score: preciseRound(score, 2),
    });
  }
  return result;
};
