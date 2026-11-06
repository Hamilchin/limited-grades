import clsx from "clsx";
import { memo, useEffect, useRef, useState, type ReactNode } from "react";

import type { BoardLayout, CardStyle } from "../../hooks/usePrefs";
import { describeHotkey, type TierHotkey } from "../../lib/tierKeys";
import { colorForPosition, GRADE_COLORS, type Tier, type TierList } from "../../lib/tierModel";
import { HEADER_BG_CLASSES, HOVER_CLASSES, TRANSITION_CLASSES } from "../../lib/styles";
import type { Card, Color, Grade } from "../../lib/types";
import CardBubble, { CardThumb } from "../CardBubble";
import { ArrowDownIcon, ArrowUpIcon, ColorIcon, DotsIcon, PencilIcon, PlusIcon, TrashIcon } from "../icons";

export type TierAction =
  | { type: "rename"; tierId: string; label: string }
  | { type: "recolor"; tierId: string; color: string }
  | { type: "insert"; index: number }
  | { type: "remove"; tierId: string }
  | { type: "move"; tierId: string; delta: number }
  | { type: "clear"; tierId: string };

export const GradeChip = ({ grade, title }: { grade: Grade; title?: string }) => (
  <span
    title={title}
    className="shrink-0 rounded-sm px-1 text-[0.7rem] font-bold leading-[1.15rem] text-black"
    style={{ backgroundColor: GRADE_COLORS[grade] }}
  >
    {grade}
  </span>
);

const SWATCHES = Object.values(GRADE_COLORS).concat(["#8b5cf6", "#3b82f6", "#06b6d4", "#a3a3a3"]);

const TierMenu = ({
  tier,
  index,
  isLast,
  count,
  onAction,
  onRename,
  close,
}: {
  tier: Tier;
  index: number;
  isLast: boolean;
  count: number;
  onAction: (action: TierAction) => void;
  onRename: () => void;
  close: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [close]);
  const item = (label: ReactNode, action: () => void, disabled = false, danger = false) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        action();
        close();
      }}
      className={clsx(
        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm disabled:opacity-40",
        danger ? "hover:bg-rose-600 hover:text-white" : "hover:bg-blue-500 hover:text-white dark:hover:bg-amber-600"
      )}
    >
      {label}
    </button>
  );
  return (
    <div
      ref={ref}
      data-no-drag
      className="absolute left-full top-0 z-30 ml-1 w-52 rounded-md border border-neutral-300 bg-white p-1 text-base font-normal shadow-xl dark:border-black dark:bg-neutral-800"
    >
      {item(<><PencilIcon /> Rename</>, onRename)}
      {item(<><ArrowUpIcon /> Move up</>, () => onAction({ type: "move", tierId: tier.id, delta: -1 }), index === 0)}
      {item(<><ArrowDownIcon /> Move down</>, () => onAction({ type: "move", tierId: tier.id, delta: 1 }), isLast)}
      {item(<><PlusIcon /> Add a tier above</>, () => onAction({ type: "insert", index }))}
      {item(<><PlusIcon /> Add a tier below</>, () => onAction({ type: "insert", index: index + 1 }))}
      <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
      <div className="flex flex-wrap gap-1 px-2 py-1">
        {SWATCHES.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Color ${color}`}
            onClick={() => onAction({ type: "recolor", tierId: tier.id, color })}
            className={clsx("size-5 rounded-sm ring-offset-1 hover:ring-2", tier.color === color && "ring-2 ring-neutral-500")}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="my-1 border-t border-neutral-200 dark:border-neutral-700" />
      {item(<>Unrank its cards</>, () => onAction({ type: "clear", tierId: tier.id }), count === 0)}
      {item(<><TrashIcon /> Delete tier</>, () => onAction({ type: "remove", tierId: tier.id }), false, true)}
    </div>
  );
};

const TierLabel = ({
  tier,
  index,
  isLast,
  count,
  editable,
  hotkey,
  onAction,
  compact,
}: {
  tier: Tier;
  index: number;
  isLast: boolean;
  count: number;
  editable: boolean;
  hotkey?: TierHotkey;
  onAction?: (action: TierAction) => void;
  compact?: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState(tier.label);
  const commit = () => {
    setEditing(false);
    const label = draft.trim();
    if (label && label !== tier.label) onAction?.({ type: "rename", tierId: tier.id, label });
    else setDraft(tier.label);
  };
  return (
    <div
      className={clsx(
        "group/label relative flex items-center border-l-4 font-bold",
        compact ? "px-2 text-base" : "pl-3 pr-1 text-xl",
        HEADER_BG_CLASSES,
        TRANSITION_CLASSES
      )}
      style={{ borderLeftColor: tier.color }}
      onDoubleClick={() => editable && setEditing(true)}
    >
      {editing ? (
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          data-no-drag
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter") commit();
            if (event.key === "Escape") {
              setDraft(tier.label);
              setEditing(false);
            }
          }}
          className="w-full min-w-0 rounded bg-white px-1 text-lg outline-none ring-2 ring-blue-500 dark:bg-neutral-800 dark:ring-amber-600"
        />
      ) : (
        <div className="flex min-w-0 grow flex-col">
          <span className="break-words leading-tight">{tier.label}</span>
          {!compact && (
            <span className="text-[0.7rem] font-normal leading-tight text-neutral-500 dark:text-neutral-400">
              {count}
              {hotkey && <span className="ml-1 opacity-0 transition-opacity group-hover/label:opacity-100">· {describeHotkey(hotkey)}</span>}
            </span>
          )}
        </div>
      )}
      {editable && !editing && (
        <button
          type="button"
          data-no-drag
          aria-label={`${tier.label} tier options`}
          onClick={() => setMenuOpen((open) => !open)}
          className={clsx(
            "absolute right-0.5 top-0.5 rounded p-0.5 text-sm opacity-0 group-hover/label:opacity-100 focus:opacity-100",
            menuOpen && "opacity-100",
            HOVER_CLASSES
          )}
        >
          <DotsIcon />
        </button>
      )}
      {menuOpen && onAction && (
        <TierMenu
          tier={tier}
          index={index}
          isLast={isLast}
          count={count}
          onAction={onAction}
          onRename={() => setEditing(true)}
          close={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
};

interface Props {
  list: TierList;
  cardsByName: Map<string, Card>;
  isVisible: (card: Card) => boolean;
  layout: BoardLayout;
  cardStyle: CardStyle;
  /** Grid columns (the deck filter narrows them). */
  columns: Color[];
  badgeFor?: (card: Card) => ReactNode;
  onCardClick?: (card: Card) => void;
  editable?: boolean;
  onTierAction?: (action: TierAction) => void;
  hotkeys?: Map<string, TierHotkey>;
  /** Extra attributes on every card (the compare view tags cards with its panel). */
  cardAttributes?: (card: Card) => Record<string, string>;
  compact?: boolean;
  onPointerDown?: (event: React.PointerEvent) => void;
}

const TierBoard = ({
  list,
  cardsByName,
  isVisible,
  layout,
  cardStyle,
  columns,
  badgeFor,
  onCardClick,
  editable = false,
  onTierAction,
  hotkeys,
  cardAttributes,
  compact = false,
  onPointerDown,
}: Props) => {
  const longest = Math.max(1, ...list.tiers.map((t) => t.label.length));
  const labelWidth = compact ? Math.max(2.75, Math.min(7, 1.2 + longest * 0.62)) : Math.max(4, Math.min(9, 1.8 + longest * 0.72));
  const gridTemplate =
    layout === "grid" ? `${labelWidth}rem repeat(${columns.length}, minmax(0, 1fr))` : `${labelWidth}rem minmax(0, 1fr)`;

  const renderCard = (card: Card) => {
    const attributes = {
      "data-card": card.name,
      "data-color": card.color,
      ...cardAttributes?.(card),
    };
    return cardStyle === "images" ? (
      <CardThumb
        key={card.name}
        card={card}
        onClick={onCardClick}
        badge={badgeFor?.(card)}
        dataAttributes={attributes}
        className={layout === "rows" ? "!w-[72px] shrink-0" : undefined}
      />
    ) : (
      <CardBubble
        key={card.name}
        card={card}
        onClick={onCardClick}
        badge={badgeFor?.(card)}
        showBonus
        dataAttributes={attributes}
        className={clsx(
          layout === "rows" ? "max-w-[17rem] py-px" : "w-full",
          compact && "text-sm",
          editable && "touch-manipulation"
        )}
      />
    );
  };

  const flowClasses = cardStyle === "images" ? "grid grid-cols-[repeat(auto-fill,minmax(60px,1fr))] gap-1" : "flex flex-col gap-1";

  return (
    <div onPointerDown={onPointerDown} className="relative">
      {layout === "grid" && (
        <div
          className={clsx("sticky top-0 z-10 grid border-b-2 border-neutral-900", compact ? "text-base" : "text-lg", HEADER_BG_CLASSES, TRANSITION_CLASSES)}
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <div />
          {columns.map((color) => (
            <div key={color} className="p-px text-center">
              <ColorIcon color={color} className={compact ? "my-1" : "my-2"} />
            </div>
          ))}
        </div>
      )}
      <div>
        {list.tiers.map((tier, index) => {
          const names = list.placements[tier.id] ?? [];
          const cards: Card[] = [];
          for (const name of names) {
            const card = cardsByName.get(name);
            if (card && isVisible(card)) cards.push(card);
          }
          return (
            <div
              key={tier.id}
              data-tier-row={tier.id}
              className={clsx("grid", index < list.tiers.length - 1 && "mb-0.5")}
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <TierLabel
                tier={tier}
                index={index}
                isLast={index === list.tiers.length - 1}
                count={cards.length}
                editable={editable}
                hotkey={hotkeys?.get(tier.id)}
                onAction={onTierAction}
                compact={compact}
              />
              {layout === "grid" ? (
                columns.map((color) => (
                  <div
                    key={color}
                    data-drop={tier.id}
                    data-color={color}
                    className={clsx(
                      "min-h-[2.25rem] bg-neutral-100 p-1 dark:bg-neutral-800",
                      flowClasses,
                      TRANSITION_CLASSES
                    )}
                  >
                    {cards.filter((card) => card.color === color).map(renderCard)}
                  </div>
                ))
              ) : (
                <div
                  data-drop={tier.id}
                  className={clsx(
                    "flex min-h-[2.25rem] flex-wrap content-start items-start gap-1 bg-neutral-100 p-1 dark:bg-neutral-800",
                    TRANSITION_CLASSES
                  )}
                >
                  {cards.map(renderCard)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default memo(TierBoard);

export const columnsForDeck = (deckColors: Color[], allColors: Color[]): Color[] => {
  if (deckColors.length === 0) return allColors;
  return allColors.filter(
    (color) => deckColors.includes(color) || color === "colorless" || (color === "multicolor" && deckColors.length > 1)
  );
};

export { colorForPosition };
