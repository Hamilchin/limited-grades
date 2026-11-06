import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";

import CardBubble from "../components/CardBubble";
import CardDetail from "../components/CardDetail";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, RowsIcon, GridIcon, SwapIcon, UploadIcon } from "../components/icons";
import Modal from "../components/Modal";
import Select from "../components/Select";
import TierBoard, { columnsForDeck } from "../components/tierlist/TierBoard";
import usePrefs from "../hooks/usePrefs";
import useTierLists from "../hooks/useTierLists";
import { compareLists, type CompareRow } from "../lib/compare";
import { matchesListFilters } from "../lib/filters";
import { getDeckLabel } from "../lib/sets";
import { BUTTON_CLASSES, PRIMARY_BUTTON_CLASSES, TRANSITION_CLASSES } from "../lib/styles";
import { gradesAsTierList, indexPlacements, SEVENTEEN_LANDS_LIST_ID, type TierList } from "../lib/tierModel";
import { ALL_COLORS, type Card } from "../lib/types";
import type { ViewProps } from "./SetShell";

type Side = "a" | "b";

const TierTag = ({ list, tierIndex }: { list: TierList; tierIndex: number | null }) => {
  if (tierIndex === null) return <span className="text-neutral-400">unranked</span>;
  const tier = list.tiers[tierIndex]!;
  return (
    <span className="rounded-sm px-1 text-xs font-bold text-black" style={{ backgroundColor: tier.color }}>
      {tier.label}
    </span>
  );
};

const DeltaTag = ({ delta, sameScale }: { delta: number | null; sameScale: boolean }) => {
  if (delta === null || Math.abs(delta) < 0.05) return <span className="text-neutral-400">=</span>;
  const higher = delta < 0; // B has it in a better tier than A
  const amount = sameScale ? Math.abs(delta) : Math.abs(delta).toFixed(1);
  return (
    <span className={clsx("inline-flex items-center font-semibold", higher ? "text-emerald-600" : "text-rose-600")}>
      {higher ? <ArrowUpIcon className="text-[0.8em]" /> : <ArrowDownIcon className="text-[0.8em]" />}
      {amount}
    </span>
  );
};

/** Scrolls an element into the middle of its panel if it's out of view (without moving the page). */
const revealInPanel = (el: HTMLElement) => {
  const panel = el.closest<HTMLElement>("[data-compare-scroll]");
  if (!panel) return;
  const p = panel.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  if (r.top >= p.top + 28 && r.bottom <= p.bottom - 4) return;
  panel.scrollTo({ top: panel.scrollTop + (r.top - p.top) - p.height / 2 + r.height / 2, behavior: "smooth" });
};

const ComparePage = ({ set, payload, filters }: ViewProps) => {
  const store = useTierLists();
  const { prefs, setPref } = usePrefs();
  const [params, setParams] = useSearchParams();
  const [hover, setHover] = useState<string | null>(null);
  const [detail, setDetail] = useState<Card | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const { deck, rarities, cardTypes, manaValues } = filters;

  const lists = useMemo(
    () => store.lists.filter((l) => l.setCode === set.code).sort((x, y) => y.updatedAt - x.updatedAt),
    [store.lists, set.code]
  );
  const hasGrades = payload.stats.kind === "ok";
  const gradesList = useMemo(
    () => (hasGrades ? gradesAsTierList(payload.cards, deck.code, set.code, getDeckLabel(set, deck)) : null),
    [hasGrades, payload.cards, deck, set]
  );
  const sources = useMemo(() => [...lists, ...(gradesList ? [gradesList] : [])], [lists, gradesList]);

  const pick = (id: string | null, fallbackExcluding?: string): TierList | undefined =>
    sources.find((s) => s.id === id) ?? sources.find((s) => s.id !== fallbackExcluding);
  const a = pick(params.get("a"));
  const bChoice = pick(params.get("b") ?? (a?.id !== SEVENTEEN_LANDS_LIST_ID && gradesList ? SEVENTEEN_LANDS_LIST_ID : null), a?.id);
  const b = bChoice && bChoice.id === a?.id ? sources.find((s) => s.id !== a.id) : bChoice;
  const ready = Boolean(a && b && a !== b);

  const setSource = (side: Side, id: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set(side, id);
        if (side === "a" && !next.get("b") && b) next.set("b", b.id);
        if (side === "b" && !next.get("a") && a) next.set("a", a.id);
        return next;
      },
      { replace: true }
    );
  const swap = () =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (a && b) {
          next.set("a", b.id);
          next.set("b", a.id);
        }
        return next;
      },
      { replace: true }
    );

  const cardsByName = useMemo(() => new Map(payload.cards.map((card) => [card.name, card])), [payload.cards]);
  const isVisible = useCallback(
    (card: Card) => matchesListFilters(card, { deck, rarities, cardTypes, manaValues }),
    [deck, rarities, cardTypes, manaValues]
  );
  const visibleNames = useMemo(() => payload.cards.filter(isVisible).map((c) => c.name), [payload.cards, isVisible]);
  const summary = useMemo(() => (a && b && a !== b ? compareLists(a, b, visibleNames) : null), [a, b, visibleNames]);
  const rowsByName = useMemo(() => new Map(summary?.rows.map((r) => [r.name, r]) ?? []), [summary]);
  const columns = useMemo(() => columnsForDeck(deck.colors, ALL_COLORS), [deck]);

  // Hovering a card lights up the same card in the other list (and the table), scrolling it into view.
  useEffect(() => {
    const element = root.current;
    if (!element) return undefined;
    let current: string | null = null;
    const clear = () =>
      element.querySelectorAll(".lg-match").forEach((el) => el.classList.remove("lg-match", "lg-match-twin"));
    const onOver = (event: PointerEvent) => {
      const el = (event.target as HTMLElement).closest<HTMLElement>("[data-compare-card]");
      const name = el?.dataset.compareCard ?? null;
      if (name === current) return;
      current = name;
      clear();
      setHover(name);
      if (!el || !name) return;
      el.classList.add("lg-match");
      element.querySelectorAll<HTMLElement>(`[data-compare-card="${CSS.escape(name)}"]`).forEach((twin) => {
        if (twin === el || twin.dataset.panel === el.dataset.panel) return;
        twin.classList.add("lg-match", "lg-match-twin");
        if (twin.dataset.panel === "a" || twin.dataset.panel === "b") revealInPanel(twin);
      });
    };
    const onLeave = () => {
      current = null;
      clear();
      setHover(null);
    };
    element.addEventListener("pointerover", onOver);
    element.addEventListener("pointerleave", onLeave);
    return () => {
      element.removeEventListener("pointerover", onOver);
      element.removeEventListener("pointerleave", onLeave);
    };
  }, [ready]);

  const badgeFor = (side: Side) => {
    if (!prefs.compareShowDiffs || !a || !b) return undefined;
    const other = side === "a" ? b : a;
    return (card: Card) => {
      const row = rowsByName.get(card.name);
      if (!row) return null;
      const otherTier = side === "a" ? row.bTier : row.aTier;
      const ownTier = side === "a" ? row.aTier : row.bTier;
      if (otherTier === null) return <span className="shrink-0 text-[0.7rem] text-neutral-400" title={`Unranked in ${other.name}`}>–</span>;
      if (row.delta === null || Math.abs(row.delta) < 0.05 || ownTier === null) return null;
      const otherLikesMore = side === "a" ? row.delta < 0 : row.delta > 0;
      const tier = other.tiers[otherTier]!;
      return (
        <span
          title={`${other.name}: ${tier.label}`}
          className={clsx(
            "shrink-0 rounded-sm border px-0.5 text-[0.7rem] font-bold leading-[1.05rem]",
            otherLikesMore ? "border-emerald-500 text-emerald-600" : "border-rose-500 text-rose-600"
          )}
        >
          {tier.label}
        </span>
      );
    };
  };

  if (!ready || !a || !b) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <div className="font-belerenSmallCaps text-3xl tracking-wide">Compare two tier lists</div>
        <p className="max-w-xl text-neutral-600 dark:text-neutral-300">
          Put two lists side by side, yours, a friend&apos;s, or 17Lands&apos; grades, and see where they disagree.
          Pointing at a card in one list lights it up in the other.{" "}
          {sources.length === 0
            ? `You don't have a ${set.label} list yet${hasGrades ? "" : ", and 17Lands has no grades for it yet"}.`
            : hasGrades
              ? "Make one more list (or import a friend's) to compare."
              : `17Lands has no ${set.label} grades yet, so you need two lists of your own: import a friend's.`}
        </p>
        <div className="flex gap-2">
          <Link to={`/${set.code}/lists${filters.search}`} className={PRIMARY_BUTTON_CLASSES}>
            <PlusIcon /> Your tier lists
          </Link>
          <Link to={`/${set.code}/lists?import=1`} className={BUTTON_CLASSES}>
            <UploadIcon /> Import a friend&apos;s list
          </Link>
        </div>
      </div>
    );
  }

  const hoverRow = hover ? rowsByName.get(hover) : undefined;
  const disagreements: CompareRow[] = (summary?.rows ?? [])
    .filter((r) => r.delta !== null && Math.abs(r.delta) >= 0.5)
    .sort((x, y) => Math.abs(y.delta!) - Math.abs(x.delta!) || x.name.localeCompare(y.name));
  const onlyIn = (side: Side) =>
    (summary?.rows ?? []).filter((r) => (side === "a" ? r.aTier !== null && r.bTier === null : r.bTier !== null && r.aTier === null));

  const panel = (side: Side, list: TierList) => {
    const ranked = visibleNames.filter((n) => indexPlacements(list).has(n)).length;
    return (
      <div className="flex min-w-0 flex-col">
        <div className="mb-2 flex items-center gap-2">
          <span
            className={clsx(
              "grid size-7 shrink-0 place-items-center rounded-full font-bold text-white",
              side === "a" ? "bg-neutral-700 dark:bg-neutral-500" : "bg-blue-500 dark:bg-amber-600"
            )}
          >
            {side.toUpperCase()}
          </span>
          <Select
            value={list}
            options={sources}
            getKey={(s) => s.id}
            getLabel={(s) => s.name}
            onChange={(s) => setSource(side, s.id)}
            ariaLabel={`List ${side.toUpperCase()}`}
            className="min-w-0 grow"
          />
          {list.id !== SEVENTEEN_LANDS_LIST_ID && (
            <Link to={`/${set.code}/lists/${list.id}${filters.search}`} className="shrink-0 text-sm underline">
              Edit
            </Link>
          )}
        </div>
        <div className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">
          {ranked} of {visibleNames.length} cards ranked
          {list.id === SEVENTEEN_LANDS_LIST_ID && " · cards with too few games have no grade"}
        </div>
        <div
          data-compare-scroll={side}
          className="max-h-[calc(100vh-6rem)] min-h-[20rem] overflow-y-auto overscroll-contain rounded border border-neutral-200 dark:border-black"
        >
          <TierBoard
            list={list}
            cardsByName={cardsByName}
            isVisible={isVisible}
            layout={prefs.compareLayout}
            cardStyle="text"
            columns={columns}
            badgeFor={badgeFor(side)}
            onCardClick={setDetail}
            cardAttributes={(card) => ({ "data-compare-card": card.name, "data-panel": side })}
            compact
          />
        </div>
      </div>
    );
  };

  const stat = (label: string, value: ReactNode, hint?: string) => (
    <div title={hint} className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
  const pct = (n: number) => (summary && summary.common ? `${Math.round((n / summary.common) * 100)}%` : "–");

  return (
    <div ref={root} className="pt-3">
      <div className="sticky top-0 z-20 -mx-2 mb-3 flex min-h-[4rem] flex-wrap items-center gap-x-6 gap-y-2 border-b border-neutral-200 bg-white/95 px-2 py-2 backdrop-blur dark:border-black dark:bg-neutral-900/95">
        {hoverRow && hover ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-lg font-medium">{hover}</span>
            <span className="flex items-center gap-1.5 text-sm">
              A <TierTag list={a} tierIndex={hoverRow.aTier} />
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              B <TierTag list={b} tierIndex={hoverRow.bTier} />
            </span>
            <span className="text-sm">
              <DeltaTag delta={hoverRow.delta} sameScale={summary!.sameScale} />{" "}
              {hoverRow.delta !== null && Math.abs(hoverRow.delta) >= 0.05 && (
                <span className="text-neutral-500">
                  B rates it {hoverRow.delta < 0 ? "higher" : "lower"}
                  {summary!.sameScale ? ` by ${Math.abs(hoverRow.delta)} tier${Math.abs(hoverRow.delta) === 1 ? "" : "s"}` : ""}
                </span>
              )}
            </span>
          </div>
        ) : (
          summary && (
            <>
              {stat("Both ranked", summary.common)}
              {stat(summary.sameScale ? "Same tier" : "Within ½ tier", pct(summary.sameTier))}
              {stat("Within one tier", pct(summary.withinOne))}
              {stat("Average gap", summary.common ? `${summary.meanAbsDelta.toFixed(2)} tiers` : "–")}
              {stat(
                "Rank correlation",
                summary.spearman === null ? "–" : summary.spearman.toFixed(2),
                "Spearman's ρ over the cards both lists rank, counting order within tiers (1 = same order)"
              )}
            </>
          )
        )}
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={prefs.compareShowDiffs} onChange={(e) => setPref("compareShowDiffs", e.target.checked)} />
            Mark differences
          </label>
          <div className="inline-flex overflow-hidden rounded border border-neutral-300 dark:border-black">
            {(
              [
                ["rows", <RowsIcon key="r" />, "Rows"],
                ["grid", <GridIcon key="g" />, "By color"],
              ] as const
            ).map(([id, icon, label]) => (
              <button
                key={id}
                type="button"
                title={label}
                aria-pressed={prefs.compareLayout === id}
                onClick={() => setPref("compareLayout", id)}
                className={clsx(
                  "px-2.5 py-1.5",
                  prefs.compareLayout === id
                    ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
                    : "bg-white hover:bg-neutral-100 dark:bg-neutral-700 dark:hover:bg-neutral-600",
                  TRANSITION_CLASSES
                )}
              >
                {icon}
              </button>
            ))}
          </div>
          <button type="button" className={BUTTON_CLASSES} onClick={swap} title="Swap A and B">
            <SwapIcon /> Swap
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {panel("a", a)}
        {panel("b", b)}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <h3 className="mb-2 font-belerenSmallCaps text-xl tracking-wide">Biggest disagreements</h3>
          {disagreements.length === 0 ? (
            <p className="text-neutral-500">These lists put every card they both rank in the same tier.</p>
          ) : (
            <div className="overflow-hidden rounded border border-neutral-200 dark:border-black">
              <table className="w-full text-sm">
                <thead className="bg-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Card</th>
                    <th className="px-3 py-2 font-medium">A</th>
                    <th className="px-3 py-2 font-medium">B</th>
                    <th className="px-3 py-2 font-medium">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {disagreements.slice(0, 40).map((row) => {
                    const card = cardsByName.get(row.name)!;
                    return (
                      <tr key={row.name} className="border-t border-neutral-200 dark:border-neutral-800">
                        <td className="px-2 py-1">
                          <CardBubble
                            card={card}
                            onClick={setDetail}
                            className="w-full"
                            dataAttributes={{ "data-compare-card": card.name, "data-panel": "table" }}
                          />
                        </td>
                        <td className="px-3 py-1">
                          <TierTag list={a} tierIndex={row.aTier} />
                        </td>
                        <td className="px-3 py-1">
                          <TierTag list={b} tierIndex={row.bTier} />
                        </td>
                        <td className="px-3 py-1">
                          <DeltaTag delta={row.delta} sameScale={summary!.sameScale} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {disagreements.length > 40 && (
                <div className="border-t border-neutral-200 px-3 py-2 text-xs text-neutral-500 dark:border-neutral-800">
                  and {disagreements.length - 40} more
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-4">
          {(["a", "b"] as const).map((side) => {
            const rows = onlyIn(side);
            const list = side === "a" ? a : b;
            const other = side === "a" ? b : a;
            return (
              <div key={side}>
                <h3 className="mb-2 font-belerenSmallCaps text-lg tracking-wide">
                  Ranked only in {side.toUpperCase()} <span className="text-sm text-neutral-500">({rows.length})</span>
                </h3>
                {rows.length === 0 ? (
                  <p className="text-sm text-neutral-500">Nothing: every card {list.name} ranks, {other.name} ranks too.</p>
                ) : (
                  <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                    {rows.slice(0, 100).map((row) => (
                      <CardBubble
                        key={row.name}
                        card={cardsByName.get(row.name)!}
                        onClick={setDetail}
                        className="w-full"
                        badge={<TierTag list={list} tierIndex={side === "a" ? row.aTier : row.bTier} />}
                        dataAttributes={{ "data-compare-card": row.name, "data-panel": `only-${side}` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)} className="size-full lg:size-fit">
          <CardDetail card={detail}>
            <div className="space-y-2 text-sm">
              <div className="text-lg">In each list</div>
              <div className="flex items-center gap-2">
                <span className="w-4 font-bold">A</span> {a.name}: <TierTag list={a} tierIndex={rowsByName.get(detail.name)?.aTier ?? null} />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 font-bold">B</span> {b.name}: <TierTag list={b} tierIndex={rowsByName.get(detail.name)?.bTier ?? null} />
              </div>
            </div>
          </CardDetail>
        </Modal>
      )}
    </div>
  );
};

export default ComparePage;
