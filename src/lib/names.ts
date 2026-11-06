// Card-name matching that tolerates the ways names get mangled when people type or paste them:
// case, accents, curly quotes, extra spaces, "///" for split cards, or only the front face.

const DIACRITICS = /[̀-ͯ]/g;

export const normalizeName = (name: string): string =>
  name
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, "-")
    .replace(/\s*\/{2,3}\s*/g, " // ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** The front face of "Front // Back", or the name itself. */
export const frontFace = (name: string): string => {
  const index = name.indexOf("//");
  return index === -1 ? name : name.slice(0, index).trim();
};

/** A looser key for fuzzy matching: letters and digits only. */
export const compactName = (name: string): string => normalizeName(name).replace(/[^a-z0-9]/g, "");

/** Damerau–Levenshtein (optimal string alignment) distance, capped for speed. */
export const editDistance = (a: string, b: string, cap = Infinity): number => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  let prevPrev = new Array<number>(cols).fill(0);
  let prev = Array.from({ length: cols }, (_, j) => j);
  for (let i = 1; i < rows; i += 1) {
    const current = new Array<number>(cols).fill(0);
    current[0] = i;
    let rowMin = current[0];
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(prev[j]! + 1, current[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prevPrev[j - 2]! + 1);
      }
      current[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > cap) return cap + 1;
    prevPrev = prev;
    prev = current;
  }
  return prev[cols - 1]!;
};

export interface NameMatch {
  name: string;
  /** "exact" (after normalizing), "face" (front face or no punctuation), or "fuzzy" (typo). */
  quality: "exact" | "face" | "fuzzy";
}

/** Looks up typed names against a set's card names. */
export class NameIndex {
  #exact = new Map<string, string>();
  #compact = new Map<string, string>();
  #names: string[];

  constructor(names: Iterable<string>) {
    this.#names = [...names];
    for (const name of this.#names) {
      this.#exact.set(normalizeName(name), name);
      this.#compact.set(compactName(name), name);
    }
    // Front faces second, so a real card named like another card's front face wins.
    for (const name of this.#names) {
      const front = frontFace(name);
      if (front !== name) {
        if (!this.#exact.has(normalizeName(front))) this.#exact.set(normalizeName(front), name);
        if (!this.#compact.has(compactName(front))) this.#compact.set(compactName(front), name);
      }
    }
    // The part before the comma of a legendary name ("Brad Boimler" for "Brad Boimler, Eager
    // Ensign"), when only one card starts that way.
    const shortNames = new Map<string, string | null>();
    for (const name of this.#names) {
      const comma = name.indexOf(",");
      if (comma <= 0) continue;
      const short = normalizeName(name.slice(0, comma));
      shortNames.set(short, shortNames.has(short) ? null : name);
    }
    for (const [short, name] of shortNames) {
      if (name && !this.#exact.has(short)) this.#exact.set(short, name);
    }
  }

  get names(): string[] {
    return this.#names;
  }

  /** Like `match`, but no typo tolerance: for telling card lines apart from headings and labels. */
  matchStrict(input: string): NameMatch | null {
    const match = this.match(input);
    return match && match.quality !== "fuzzy" ? match : null;
  }

  match(input: string): NameMatch | null {
    const normalized = normalizeName(input);
    if (!normalized) return null;
    const exact = this.#exact.get(normalized);
    if (exact) return { name: exact, quality: normalizeName(exact) === normalized ? "exact" : "face" };
    const front = this.#exact.get(normalizeName(frontFace(input)));
    if (front) return { name: front, quality: "face" };
    const compact = this.#compact.get(compactName(input));
    if (compact) return { name: compact, quality: "face" };
    const fuzzy = this.suggest(input, 1)[0];
    if (fuzzy && fuzzy.distance <= Math.max(1, Math.floor(compactName(input).length / 8))) {
      return { name: fuzzy.name, quality: "fuzzy" };
    }
    return null;
  }

  /** Closest names by edit distance, for "did you mean" lists. */
  suggest(input: string, limit = 3): { name: string; distance: number }[] {
    const target = compactName(input);
    if (!target) return [];
    const cap = Math.max(3, Math.ceil(target.length / 3));
    const scored: { name: string; distance: number }[] = [];
    for (const name of this.#names) {
      const candidate = compactName(name);
      let distance = editDistance(target, candidate, cap);
      // Typing just the start of a long name ("Garruk" for "Garruk, Curse Breaker") is common.
      if (candidate.startsWith(target) && target.length >= 4) distance = Math.min(distance, 2);
      if (distance <= cap) scored.push({ name, distance });
    }
    scored.sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
    return scored.slice(0, limit);
  }
}
