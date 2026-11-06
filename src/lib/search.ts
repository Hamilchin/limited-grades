// Card-name search that ignores accents, commas, apostrophes and slashes, prefers matches at the
// start of a word, and reports where the match is so it can be underlined (as on limitedgrades.com).

const DIACRITICS = /[̀-ͯ]/g;

export interface Match {
  atStartOfWord: boolean;
  start: number;
  end: number;
}

type Candidate = [normalized: string, deletedPositions: number[]];

const normalize = (value: string): Candidate => {
  const lower = value.normalize("NFD").replace(DIACRITICS, "").toLowerCase();
  let result = "";
  const deleted: number[] = [];
  let last = "";
  for (let i = 0; i < lower.length; i += 1) {
    let char = lower[i]!;
    if (char === "," || char === "'" || char === "/" || (char === " " && last === " ")) {
      deleted.push(i);
      continue;
    }
    if (char === "-") char = " ";
    last = char;
    result += char;
  }
  return [result, deleted];
};

const adjust = (position: number, deleted: number[]): number => {
  let original = position;
  for (const d of deleted) {
    if (original > d) original += 1;
    else break;
  }
  return original;
};

const better = (a: Match, b: Match): number => {
  if (a.atStartOfWord !== b.atStartOfWord) return a.atStartOfWord ? -1 : 1;
  return a.start - b.start;
};

const bestMatch = (candidate: string, query: string): Match | null => {
  let best: Match | null = null;
  let from = 0;
  while (from < candidate.length) {
    const index = candidate.indexOf(query, from);
    if (index === -1) break;
    const match = { atStartOfWord: index === 0 || candidate[index - 1] === " ", start: index, end: index + query.length };
    if (!best || better(best, match) > 0) best = match;
    if (match.atStartOfWord) break;
    from = index + 1;
  }
  return best;
};

export class SearchIndex<T> {
  #items: T[];
  #candidates: Candidate[];

  constructor(items: T[], key: (item: T) => string) {
    this.#items = items;
    this.#candidates = items.map((item) => normalize(key(item)));
  }

  search(query: string): { item: T; match: Match }[] {
    const [q] = normalize(query);
    if (!q.trim()) return [];
    const results: { item: T; match: Match }[] = [];
    this.#candidates.forEach(([candidate, deleted], i) => {
      const match = bestMatch(candidate, q);
      if (match) {
        results.push({
          item: this.#items[i]!,
          match: { ...match, start: adjust(match.start, deleted), end: adjust(match.end, deleted) },
        });
      }
    });
    return results.sort((a, b) => better(a.match, b.match));
  }
}
