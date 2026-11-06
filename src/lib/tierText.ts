import { NameIndex, normalizeName, type NameMatch } from "./names.ts";
import { TIER_PRESETS, UNRANKED_LABELS, type TierList } from "./tierModel.ts";

// Plain-text tier lists: what you send a friend, and what you paste back in.

export type ExportFormat = "sections" | "ranking" | "compact";

export const EXPORT_FORMATS: { id: ExportFormat; name: string; description: string }[] = [
  { id: "sections", name: "Tier sections", description: "Each tier label on its own line, then its cards, one per line" },
  { id: "ranking", name: "Numbered ranking", description: "1. Card name (tier), best card first" },
  { id: "compact", name: "One line per tier", description: "Tier: card; card; card" },
];

export interface ExportOptions {
  format: ExportFormat;
  includeUnranked: boolean;
  /** Only these cards (e.g. the ones matching the current filters). */
  only?: Set<string>;
  /** Every card in the set, in the order unranked cards should be listed. */
  allNames: string[];
  setLabel: string;
  date?: Date;
}

export const exportTierList = (list: TierList, options: ExportOptions): string => {
  const keep = (name: string): boolean => !options.only || options.only.has(name);
  const placed = new Set(Object.values(list.placements).flat());
  const unranked = options.allNames.filter((name) => !placed.has(name) && keep(name));
  const d = options.date ?? new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const lines = [
    `# Tier list: ${list.name}`,
    `# Set: ${list.setCode.toUpperCase()} (${options.setLabel})`,
    `# Exported ${date} from Limited Grades`,
  ];
  if (options.only) lines.push("# Only the cards that matched the filters when this was exported");

  if (options.format === "sections") {
    for (const tier of list.tiers) lines.push("", tier.label, ...(list.placements[tier.id] ?? []).filter(keep));
    if (options.includeUnranked) lines.push("", "Unranked", ...unranked);
  } else if (options.format === "compact") {
    lines.push("");
    for (const tier of list.tiers) {
      lines.push(`${tier.label}: ${(list.placements[tier.id] ?? []).filter(keep).join("; ")}`.trimEnd());
    }
    if (options.includeUnranked) lines.push(`Unranked: ${unranked.join("; ")}`.trimEnd());
  } else {
    lines.push("");
    let rank = 1;
    for (const tier of list.tiers) {
      for (const name of (list.placements[tier.id] ?? []).filter(keep)) {
        lines.push(`${rank}. ${name} (${tier.label})`);
        rank += 1;
      }
    }
    if (options.includeUnranked) lines.push("", "Unranked", ...unranked);
  }
  return `${lines.join("\n")}\n`;
};

// ---- Import ----

export interface ParsedItem {
  name: string;
  line: number;
  raw: string;
  quality: NameMatch["quality"];
}

export interface UnmatchedLine {
  line: number;
  text: string;
  /** The tier the line was under (or annotated with), or null. */
  tierLabel: string | null;
  suggestions: string[];
}

export interface ParsedTierText {
  name?: string;
  setCode?: string;
  /** Tier labels in the order they appeared, with their cards. */
  tiers: { label: string; items: ParsedItem[] }[];
  /** Cards listed under an "Unranked" heading. */
  unranked: ParsedItem[];
  /** Cards listed before any tier heading. */
  loose: ParsedItem[];
  unmatched: UnmatchedLine[];
  duplicates: string[];
}

const PRESET_LABELS = TIER_PRESETS.flatMap((preset) => preset.labels);

/** The canonical spelling of a tier label ("b+" → "B+", "4" → "4.0"), or null if it isn't one. */
export const canonicalLabel = (text: string, extraLabels: string[] = []): string | null => {
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (!cleaned || cleaned.length > 24) return null;
  for (const label of [...extraLabels, ...PRESET_LABELS]) {
    if (label.toLowerCase() === cleaned.toLowerCase()) return label;
  }
  if (/^\d(\.\d)?$/.test(cleaned)) {
    const numeric = Number(cleaned).toFixed(1);
    if (PRESET_LABELS.includes(numeric)) return numeric;
  }
  return null;
};

const isUnrankedLabel = (text: string): boolean => UNRANKED_LABELS.includes(text.trim().toLowerCase());

/** "## B+", "**B+**", "[B+]", "Tier B+", "B+ tier:", "=== Bombs ===" → the heading's text. */
const headingText = (line: string): { text: string; explicit: boolean } => {
  let text = line.trim();
  let explicit = false;
  if (/^#{1,6}\s*/.test(text)) {
    text = text.replace(/^#{1,6}\s*/, "");
    explicit = true;
  }
  const decorated = /^(?:[=~_*]{2,}|-{2,})\s*(.*?)\s*(?:[=~_*]{2,}|-{2,})$/.exec(text);
  if (decorated) {
    text = decorated[1]!;
    explicit = true;
  }
  const wrapped = /^(?:\*\*(.+)\*\*|__(.+)__|\[(.+)\])$/.exec(text);
  if (wrapped) {
    text = wrapped[1] ?? wrapped[2] ?? wrapped[3] ?? text;
    explicit = true;
  }
  if (/:\s*$/.test(text)) {
    text = text.replace(/\s*:+\s*$/, "");
    explicit = true;
  }
  text = text.replace(/^tier\s+/i, "").replace(/\s+tier$/i, "").trim();
  return { text, explicit };
};

const LIST_MARKER = /^\s*(?:[-*•·>]+\s+|\d{1,3}\s*[.)\]](?!\d)\s*|#\d{1,3}[.):]?\s+)/;
const ARENA_SUFFIX = /\s+\(([A-Z0-9]{2,6})\)\s+[A-Z0-9-]+\s*$/i;
const SET_TAG_SUFFIX = /\s+\[[A-Z0-9]{2,6}\]\s*$/i;

const cleanCardText = (text: string): string =>
  text
    .replace(LIST_MARKER, "")
    .replace(ARENA_SUFFIX, "")
    .replace(SET_TAG_SUFFIX, "")
    .replace(/^\s*["'`]+|["'`]+\s*$/g, "")
    .trim();

/** Splits "Card A; Card B" or "Card A, Card B". Names can contain commas, so commas join greedily. */
const splitInlineItems = (text: string, index: NameIndex): string[] => {
  const strong = text.split(/\s*[;|\t]\s*/).filter(Boolean);
  if (strong.length > 1) return strong.flatMap((piece) => splitInlineItems(piece, index));
  if (index.matchStrict(text)) return [text];
  const segments = text.split(/\s*,\s*/).filter(Boolean);
  if (segments.length <= 1) return segments;
  const best: { score: number; pieces: string[] }[] = [{ score: 0, pieces: [] }];
  for (let i = 1; i <= segments.length; i += 1) {
    let choice: { score: number; pieces: string[] } | null = null;
    for (let j = Math.max(0, i - 4); j < i; j += 1) {
      const piece = segments.slice(j, i).join(", ");
      const match = index.match(piece);
      const gain = match ? (match.quality === "fuzzy" ? 1.5 : 2) * (i - j) : -1;
      const candidate = { score: best[j]!.score + gain, pieces: [...best[j]!.pieces, piece] };
      if (!choice || candidate.score > choice.score) choice = candidate;
    }
    best.push(choice!);
  }
  return best[segments.length]!.pieces;
};

type Target = { label: string } | "unranked" | null;

/** Reads a pasted tier list in any of the export formats, plus the usual ways people type them. */
export const parseTierText = (text: string, cardNames: string[], extraLabels: string[] = []): ParsedTierText => {
  const index = new NameIndex(cardNames);
  const result: ParsedTierText = { tiers: [], unranked: [], loose: [], unmatched: [], duplicates: [] };
  const seen = new Set<string>();
  let current: Target = null;

  const openTier = (label: string): Target => {
    if (!result.tiers.some((t) => t.label === label)) result.tiers.push({ label, items: [] });
    return { label };
  };

  const addItem = (raw: string, lineNumber: number, target: Target): void => {
    const cleaned = cleanCardText(raw);
    if (!cleaned) return;
    let match = index.match(cleaned);
    // A deck-list quantity ("1 Card Name"), unless the card's own name starts with a number.
    if (!match && /^\d{1,2}x?\s+\S/.test(cleaned)) match = index.match(cleaned.replace(/^\d{1,2}x?\s+/, ""));
    if (!match) {
      result.unmatched.push({
        line: lineNumber,
        text: cleaned,
        tierLabel: target && target !== "unranked" ? target.label : null,
        suggestions: index.suggest(cleaned, 3).map((s) => s.name),
      });
      return;
    }
    if (seen.has(match.name)) {
      result.duplicates.push(match.name);
      return;
    }
    seen.add(match.name);
    const item: ParsedItem = { name: match.name, line: lineNumber, raw: cleaned, quality: match.quality };
    if (target === "unranked") result.unranked.push(item);
    else if (target) result.tiers.find((t) => t.label === target.label)!.items.push(item);
    else result.loose.push(item);
  };

  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  // A line that isn't a card, sits after a blank line, and comes right before card lines is a heading,
  // even with no decoration ("Bombs" in a list with custom tiers).
  const cardLine = lines.map((l) => l.trim() !== "" && index.matchStrict(cleanCardText(l)) !== null);
  const startsSection = (i: number): boolean => {
    const prev = lines[i - 1]?.trim() ?? "";
    if (i > 0 && prev !== "" && !/^(#|\/\/|;)/.test(prev)) return false;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (lines[j]!.trim() !== "") return cardLine[j]!;
    }
    return false;
  };

  lines.forEach((rawLine, i) => {
    const lineNumber = i + 1;
    const line = rawLine.trim();
    if (!line) return;

    // Comments, metadata, and markdown headings.
    if (/^(#|\/\/|;)/.test(line) && !/^#\d/.test(line)) {
      const rest = line.replace(/^(#+|\/\/|;)\s*/, "");
      const name = /^(?:tier list|name|title|list)\s*[:=]\s*(.+)$/i.exec(rest);
      if (name) {
        result.name ??= name[1]!.trim();
        return;
      }
      const setCode = /^set\s*[:=]\s*([a-z0-9]{2,8})\b/i.exec(rest);
      if (setCode) {
        result.setCode ??= setCode[1]!.toLowerCase();
        return;
      }
      if (!line.startsWith("#")) return;
      const { text: heading } = headingText(line);
      if (isUnrankedLabel(heading)) current = "unranked";
      else if (heading && !index.matchStrict(heading) && heading.split(" ").length <= 3) {
        current = openTier(canonicalLabel(heading, extraLabels) ?? heading);
      }
      return;
    }

    const cleaned = cleanCardText(line);

    // A card with its tier after it ("Card (B+)", "Card - B+", "Card: B+", "Card<tab>B+") or before it
    // ("B+ | Card"). Checked before plain card names: "Fire // Ice (B-)" must not match by its front face.
    const annotated = (strict: boolean): { name: string; label: string } | null => {
      const matches = (name: string): boolean => (strict ? index.matchStrict(name) : index.match(name)) !== null;
      const trailing = /^(.*?)\s*(?:\(([^()]{1,8})\)|(?:\s*[:|]\s*|\s[-–—=>→]+\s*|\t+)([^\s()]{1,8}))\s*$/.exec(cleaned);
      const trailingLabel = trailing ? canonicalLabel(trailing[2] ?? trailing[3] ?? "", extraLabels) : null;
      if (trailing && trailingLabel && matches(trailing[1]!)) return { name: trailing[1]!, label: trailingLabel };
      const leading = /^([^\s|:]{1,8})\s*(?:[|:\t]|\s[-–—]\s)\s*(.+)$/.exec(cleaned);
      const leadingLabel = leading ? canonicalLabel(leading[1]!, extraLabels) : null;
      if (leading && leadingLabel && matches(leading[2]!)) return { name: leading[2]!, label: leadingLabel };
      return null;
    };
    const exactAnnotation = annotated(true);
    if (exactAnnotation) {
      addItem(exactAnnotation.name, lineNumber, openTier(exactAnnotation.label));
      return;
    }

    const isCard = index.matchStrict(cleaned) !== null;

    // "B+: Card; Card", "Tier B+ - Card, Card", "Unranked: Card".
    if (!isCard) {
      const inline = /^(?:tier\s+)?([^:|\t]{1,12}?)(?:\s+tier)?\s*(?::|\||\t| - | – | — )\s*(.+)$/i.exec(line);
      if (inline) {
        const target: Target = isUnrankedLabel(inline[1]!)
          ? "unranked"
          : (() => {
              const label = canonicalLabel(inline[1]!, extraLabels);
              return label ? openTier(label) : null;
            })();
        if (target) {
          current = target;
          for (const piece of splitInlineItems(inline[2]!, index)) addItem(piece, lineNumber, target);
          return;
        }
      }

      // A heading on its own line.
      const { text: heading, explicit } = headingText(line);
      if (isUnrankedLabel(heading)) {
        current = "unranked";
        return;
      }
      const label = canonicalLabel(heading, extraLabels);
      if (label) {
        current = openTier(label);
        return;
      }
      const shortHeading = heading !== "" && heading.split(" ").length <= 4 && !index.match(heading);
      if (shortHeading && (explicit || startsSection(i))) {
        current = openTier(heading);
        return;
      }

      // The same annotations around a misspelled name.
      const fuzzyAnnotation = annotated(false);
      if (fuzzyAnnotation) {
        addItem(fuzzyAnnotation.name, lineNumber, openTier(fuzzyAnnotation.label));
        return;
      }
    }

    addItem(line, lineNumber, current);
  });

  return result;
};

export interface ImportPlan {
  labels: string[];
  byLabel: Record<string, string[]>;
}

/**
 * Chooses tiers for an import: a preset when every label belongs to one (so its empty tiers still
 * exist), otherwise the labels in the order they appeared. A plain list with no headings becomes a
 * single "Ranked" tier; cards before the first heading of a tiered list stay unranked.
 * `extra` adds cards the user matched by hand in the import preview.
 */
export const planImport = (parsed: ParsedTierText, extra: { label: string | null; name: string }[] = []): ImportPlan => {
  const byLabel: Record<string, string[]> = {};
  for (const tier of parsed.tiers) byLabel[tier.label] = tier.items.map((item) => item.name);
  const hasTiers = parsed.tiers.length > 0;
  if (!hasTiers && parsed.loose.length > 0) byLabel.Ranked = parsed.loose.map((item) => item.name);
  const all = new Set(Object.values(byLabel).flat());
  for (const { label, name } of extra) {
    if (all.has(name)) continue;
    const target = label ?? (hasTiers ? null : "Ranked");
    if (!target) continue;
    (byLabel[target] ??= []).push(name);
    all.add(name);
  }

  // Prefer the smallest preset that has every label ("A, B, C, D, F" → S to F, not A+ to F).
  const used = parsed.tiers.map((t) => t.label).concat(Object.keys(byLabel));
  const normalizedUsed = [...new Set(used.map((label) => normalizeName(label)))];
  const preset = TIER_PRESETS.filter(
    (p) => normalizedUsed.length > 0 && normalizedUsed.every((label) => p.labels.map(normalizeName).includes(label))
  ).sort((a, b) => a.labels.length - b.labels.length)[0];
  if (preset) return { labels: preset.labels, byLabel };

  const labels = parsed.tiers.map((t) => t.label);
  for (const label of used) if (!labels.includes(label)) labels.push(label);
  return { labels, byLabel };
};
