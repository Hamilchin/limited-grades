import clsx from "clsx";
import { memo, useMemo, useState, type ReactNode } from "react";

import type { CardStyle, PoolSort } from "../../hooks/usePrefs";
import { normalizeName } from "../../lib/names";
import { INPUT_CLASSES, TRANSITION_CLASSES } from "../../lib/styles";
import { ALL_COLORS, ALL_GRADES, Rarity, type Card } from "../../lib/types";
import CardBubble, { CardThumb, RARITY_NAMES } from "../CardBubble";
import { CheckIcon, CloseIcon, ColorIcon, COLOR_NAMES, SearchIcon } from "../icons";
import { POOL_ID } from "./dragEngine";

const SORTS: { id: PoolSort; label: string }[] = [
  { id: "color", label: "Color" },
  { id: "rarity", label: "Rarity" },
  { id: "mana", label: "Mana value" },
  { id: "grade", label: "17Lands grade" },
  { id: "number", label: "Set number" },
  { id: "name", label: "Name" },
];

const RARITY_ORDER: Rarity[] = [Rarity.MYTHIC, Rarity.RARE, Rarity.UNCOMMON, Rarity.COMMON];

const collectorKey = (card: Card): number => (card.bonus ? 10_000 : 0) + (Number.parseInt(card.collectorNumber, 10) || 0);

interface Section {
  key: string;
  title: ReactNode;
  cards: Card[];
}

const sections = (cards: Card[], sort: PoolSort, deckCode: string): Section[] => {
  const byNumber = [...cards].sort((a, b) => collectorKey(a) - collectorKey(b));
  switch (sort) {
    case "color":
      return ALL_COLORS.map((color) => ({
        key: color,
        title: (
          <>
            <ColorIcon color={color} className="text-sm" /> {COLOR_NAMES[color]}
          </>
        ),
        cards: byNumber.filter((card) => card.color === color),
      }));
    case "rarity":
      return RARITY_ORDER.map((rarity) => ({
        key: rarity,
        title: RARITY_NAMES[rarity],
        cards: byNumber.filter((card) => card.rarity === rarity),
      }));
    case "mana": {
      const buckets = ["0", "1", "2", "3", "4", "5", "6+"];
      const bucket = (card: Card) => (card.manaValue >= 6 ? "6+" : String(Math.floor(card.manaValue)));
      return buckets.map((b) => ({
        key: b,
        title: b === "0" ? "Lands and 0" : `Mana value ${b}`,
        cards: byNumber.filter((card) => bucket(card) === b),
      }));
    }
    case "grade": {
      const grade = (card: Card) => card.stats[deckCode]?.grade ?? card.stats.all?.grade;
      return [
        ...ALL_GRADES.map((g) => ({
          key: g,
          title: `17Lands ${g}`,
          cards: byNumber
            .filter((card) => grade(card) === g)
            .sort((a, b) => (b.stats[deckCode] ?? b.stats.all)!.score - (a.stats[deckCode] ?? a.stats.all)!.score),
        })),
        { key: "none", title: "No 17Lands grade", cards: byNumber.filter((card) => !grade(card)) },
      ];
    }
    case "name":
      return [{ key: "all", title: null, cards: [...cards].sort((a, b) => a.name.localeCompare(b.name)) }];
    default:
      return [{ key: "all", title: null, cards: byNumber }];
  }
};

interface Props {
  cards: Card[];
  /** Unranked cards that the filters hide. */
  hiddenCount: number;
  totalCards: number;
  cardStyle: CardStyle;
  sort: PoolSort;
  onSortChange: (sort: PoolSort) => void;
  deckCode: string;
  badgeFor?: (card: Card) => ReactNode;
  onCardClick: (card: Card) => void;
  onPointerDown: (event: React.PointerEvent) => void;
  hasGrades: boolean;
}

/** The cards still to rank. Drag them out onto the board, or drag ranked cards back here. */
const UnrankedPanel = ({
  cards,
  hiddenCount,
  totalCards,
  cardStyle,
  sort,
  onSortChange,
  deckCode,
  badgeFor,
  onCardClick,
  onPointerDown,
  hasGrades,
}: Props) => {
  const [search, setSearch] = useState("");
  const shown = useMemo(() => {
    if (!search.trim()) return cards;
    const q = normalizeName(search);
    return cards.filter((card) => normalizeName(`${card.name} ${card.typeLine}`).includes(q));
  }, [cards, search]);
  const groups = useMemo(() => sections(shown, sort, deckCode).filter((s) => s.cards.length > 0), [shown, sort, deckCode]);

  return (
    <div
      data-drop={POOL_ID}
      onPointerDown={onPointerDown}
      className={clsx(
        "flex max-h-[calc(100vh-1rem)] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 dark:border-black dark:bg-neutral-800 lg:sticky lg:top-2",
        TRANSITION_CLASSES
      )}
    >
      <div className="shrink-0 space-y-2 border-b border-neutral-200 p-2 dark:border-black">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-belerenSmallCaps text-lg tracking-wide">Unranked</h2>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {cards.length}
            {hiddenCount > 0 && ` shown · ${hiddenCount} filtered out`}
          </span>
        </div>
        <div className="relative">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Escape") setSearch("");
            }}
            placeholder="Find a card or type"
            className={clsx(INPUT_CLASSES, "w-full py-1 pl-7 pr-7 text-sm")}
          />
          {search && (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              <CloseIcon />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          {SORTS.filter((s) => s.id !== "grade" || hasGrades).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSortChange(s.id)}
              className={clsx(
                "rounded-full border px-2 py-0.5",
                sort === s.id
                  ? "border-blue-500 bg-blue-500 text-white dark:border-amber-600 dark:bg-amber-600"
                  : "border-neutral-300 hover:border-neutral-500 dark:border-neutral-600"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div data-scroll className="min-h-[8rem] grow overflow-y-auto overscroll-contain p-2">
        {cards.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-neutral-500 dark:text-neutral-400">
            <CheckIcon className="text-3xl text-emerald-500" />
            {hiddenCount > 0 ? (
              <span>Everything matching the filters is ranked. {hiddenCount} more cards are filtered out.</span>
            ) : (
              <span>All {totalCards} cards are ranked.</span>
            )}
            <span className="text-xs">Drag a card here to unrank it.</span>
          </div>
        )}
        {cards.length > 0 && shown.length === 0 && (
          <div className="py-6 text-center text-sm text-neutral-500">No unranked card matches “{search}”.</div>
        )}
        {groups.map((section) => (
          <div key={section.key} className="mb-3 last:mb-0">
            {section.title && (
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {section.title}
                <span className="font-normal normal-case">· {section.cards.length}</span>
              </div>
            )}
            <div className={cardStyle === "images" ? "grid grid-cols-3 gap-1" : "flex flex-col gap-1"}>
              {section.cards.map((card) => {
                const attributes = { "data-card": card.name, "data-color": card.color };
                return cardStyle === "images" ? (
                  <CardThumb key={card.name} card={card} onClick={onCardClick} badge={badgeFor?.(card)} dataAttributes={attributes} />
                ) : (
                  <CardBubble
                    key={card.name}
                    card={card}
                    onClick={onCardClick}
                    badge={badgeFor?.(card)}
                    showBonus
                    dataAttributes={attributes}
                    className="w-full touch-manipulation"
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(UnrankedPanel);
