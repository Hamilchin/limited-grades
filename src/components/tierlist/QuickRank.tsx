import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import usePrefs from "../../hooks/usePrefs";
import { formatNumber, formatPercentage } from "../../lib/format";
import { tierForEvent, type TierHotkey } from "../../lib/tierKeys";
import { indexPlacements, type TierList } from "../../lib/tierModel";
import type { Card } from "../../lib/types";
import { RARITY_NAMES } from "../CardBubble";
import { LoadingCardImage } from "../CardImage";
import { Kbd } from "../common";
import { CheckIcon, EyeIcon, StarIcon } from "../icons";
import ManaCost from "../ManaCost";
import Modal from "../Modal";
import { GradeChip } from "./TierBoard";
import TierButtons from "./TierButtons";

interface Props {
  list: TierList;
  /** Card names to go through, in order (unranked cards matching the filters). */
  queue: string[];
  cardsByName: Map<string, Card>;
  deckCode: string;
  hotkeys: Map<string, TierHotkey>;
  onAssign: (name: string, tierId: string | null) => void;
  onUndo: () => boolean;
  onClose: () => void;
}

/** One card at a time, big, with a key per tier: the fastest way through a fresh set. */
const QuickRank = ({ list, queue, cardsByName, deckCode, hotkeys, onAssign, onUndo, onClose }: Props) => {
  const [index, setIndex] = useState(0);
  const [hoverTier, setHoverTier] = useState<string | null>(null);
  const assigned = useRef<number[]>([]);
  const { prefs, setPref } = usePrefs();
  const placements = useMemo(() => indexPlacements(list), [list]);
  const done = index >= queue.length;
  const name = queue[Math.min(index, queue.length - 1)];
  const card = name ? cardsByName.get(name) : undefined;
  const currentTier = name ? placements.get(name)?.tierId ?? null : null;
  const rankedSoFar = queue.filter((n) => placements.has(n)).length;

  const counts = useMemo(() => {
    const result = new Map<string, number>();
    for (const tier of list.tiers) result.set(tier.id, list.placements[tier.id]?.length ?? 0);
    return result;
  }, [list]);

  const pick = useCallback(
    (tierId: string | null) => {
      if (!name || done) return;
      onAssign(name, tierId);
      assigned.current.push(index);
      setIndex((i) => i + 1);
    },
    [name, done, onAssign, index]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        if (onUndo()) {
          const previous = assigned.current.pop();
          if (previous !== undefined) setIndex(previous);
        }
        return;
      }
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        setIndex((i) => Math.min(queue.length, i + 1));
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        pick(null);
        return;
      }
      const tier = tierForEvent(event, list.tiers, hotkeys);
      if (tier) {
        event.preventDefault();
        pick(tier.id);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [list.tiers, hotkeys, pick, onUndo, queue.length]);

  const stats = card?.stats[deckCode] ?? card?.stats.all;
  const hovered = hoverTier ? list.tiers.find((t) => t.id === hoverTier) : null;
  const sameColorInHovered =
    hovered && card
      ? (list.placements[hovered.id] ?? []).map((n) => cardsByName.get(n)).filter((c): c is Card => c?.color === card.color)
      : [];

  return (
    <Modal
      title={
        <span className="flex items-center gap-3">
          Quick rank
          <span className="text-sm font-normal text-neutral-500">
            {Math.min(index + 1, queue.length)} of {queue.length} · {rankedSoFar} ranked
          </span>
        </span>
      }
      onClose={onClose}
      className="w-full lg:w-[min(64rem,95vw)]"
    >
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div
          className="h-full bg-blue-500 transition-[width] dark:bg-amber-600"
          style={{ width: `${(Math.min(index, queue.length) / Math.max(1, queue.length)) * 100}%` }}
        />
      </div>
      {done || !card ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <CheckIcon className="text-5xl text-emerald-500" />
          <div className="text-xl font-medium">
            {queue.length === 0 ? "Nothing to rank with these filters." : `That's all ${queue.length} cards.`}
          </div>
          <div className="text-neutral-500">Fine-tune the order by dragging cards on the board.</div>
          <div className="flex gap-2">
            {queue.length > 0 && (
              <button type="button" className="rounded px-3 py-1.5 underline" onClick={() => setIndex(queue.length - 1)}>
                Back to the last card
              </button>
            )}
            <button
              type="button"
              className="rounded bg-blue-500 px-4 py-1.5 font-medium text-white dark:bg-amber-600"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <LoadingCardImage key={card.name} card={card} />
          </div>
          <div className="flex min-w-0 grow flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 text-2xl font-medium">
                {card.name}
                {card.bonus && <StarIcon className="text-base text-amber-500" />}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
                <ManaCost cost={card.manaCost} />
                <span>{card.typeLine}</span>
                <span>{RARITY_NAMES[card.rarity]}</span>
                {card.bonus && <span>Bonus sheet</span>}
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-800">
              {prefs.quickRankBlind ? (
                <span className="text-neutral-500">17Lands numbers hidden</span>
              ) : stats ? (
                <>
                  <GradeChip grade={stats.grade} />
                  <span>
                    GIH WR <strong>{formatPercentage(stats.winrate)}</strong> over {formatNumber(stats.gameCount)} games
                  </span>
                  {card.overallStats?.takenAt != null && <span>· taken at {formatNumber(card.overallStats.takenAt, 1)}</span>}
                </>
              ) : (
                <span className="text-neutral-500">No 17Lands grade for this card</span>
              )}
              <button
                type="button"
                className="ml-auto flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                onClick={() => setPref("quickRankBlind", !prefs.quickRankBlind)}
              >
                <EyeIcon off={!prefs.quickRankBlind} /> {prefs.quickRankBlind ? "Show" : "Hide"} 17Lands
              </button>
            </div>
            <TierButtons
              tiers={list.tiers}
              current={currentTier}
              hotkeys={hotkeys}
              onPick={pick}
              onHover={setHoverTier}
              size="large"
              counts={counts}
            />
            <div className="min-h-[3rem] text-sm text-neutral-500 dark:text-neutral-400">
              {hovered ? (
                sameColorInHovered.length > 0 ? (
                  <>
                    <span className="font-medium text-neutral-700 dark:text-neutral-200">Already in {hovered.label}:</span>{" "}
                    {sameColorInHovered.slice(0, 8).map((c) => c.name).join(" · ")}
                    {sameColorInHovered.length > 8 && ` · and ${sameColorInHovered.length - 8} more`}
                  </>
                ) : (
                  <>No {card.color} cards in {hovered.label} yet.</>
                )
              ) : (
                <>Hover a tier to see which cards of this color are already in it.</>
              )}
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
              <span>
                <Kbd>←</Kbd> back
              </span>
              <span>
                <Kbd>→</Kbd> skip
              </span>
              <span>
                <Kbd>⌘Z</Kbd> undo
              </span>
              <span>
                <Kbd>B</Kbd> B · <Kbd>⇧B</Kbd> B+ · <Kbd>⌥B</Kbd> B-
              </span>
              <span className={clsx(currentTier === null && "hidden")}>
                Currently in <strong>{list.tiers.find((t) => t.id === currentTier)?.label}</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default QuickRank;
