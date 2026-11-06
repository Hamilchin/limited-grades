import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import CardDetail from "../components/CardDetail";
import { Banner } from "../components/common";
import {
  BoltIcon,
  CompareIcon,
  CopyIcon,
  DotsIcon,
  DownloadIcon,
  EyeIcon,
  GridIcon,
  ImageIcon,
  KeyboardIcon,
  RedoIcon,
  RowsIcon,
  TextIcon,
  TrashIcon,
  UndoIcon,
  UploadIcon,
} from "../components/icons";
import { preview } from "../components/CardPreview";
import Modal, { isModalOpen } from "../components/Modal";
import { useDragEngine, type DropTarget } from "../components/tierlist/dragEngine";
import ExportDialog from "../components/tierlist/ExportDialog";
import ImportDialog from "../components/tierlist/ImportDialog";
import QuickRank from "../components/tierlist/QuickRank";
import ShortcutsHelp from "../components/tierlist/ShortcutsHelp";
import TierBoard, { columnsForDeck, GradeChip, type TierAction } from "../components/tierlist/TierBoard";
import TierButtons from "../components/tierlist/TierButtons";
import UnrankedPanel from "../components/tierlist/UnrankedPanel";
import usePrefs from "../hooks/usePrefs";
import useTierLists from "../hooks/useTierLists";
import useToasts from "../hooks/useToasts";
import { filtersAreActive, matchesListFilters } from "../lib/filters";
import { timeAgo } from "../lib/format";
import { getDeckLabel } from "../lib/sets";
import { BUTTON_CLASSES, HOVER_CLASSES, TRANSITION_CLASSES } from "../lib/styles";
import { tierForEvent, tierHotkeys } from "../lib/tierKeys";
import {
  assignTier,
  clearTier,
  indexPlacements,
  insertTier,
  moveCard,
  moveTier,
  newId,
  nudgeTier,
  recolorTier,
  removeTier,
  renameTier,
  type TierList,
} from "../lib/tierModel";
import { ALL_COLORS, type Card } from "../lib/types";
import { useSearchControls, useSearchExtras, type ViewProps } from "./SetShell";

const samePlacements = (a: TierList, b: TierList): boolean =>
  a.tiers.length === b.tiers.length &&
  a.tiers.every((tier, i) => {
    const x = a.placements[tier.id] ?? [];
    const y = b.placements[b.tiers[i]!.id] ?? [];
    return tier.id === b.tiers[i]!.id && x.length === y.length && x.every((name, j) => name === y[j]);
  });

const flash = (name: string) =>
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(`[data-card="${CSS.escape(name)}"]`);
    if (!el) return;
    el.classList.remove("lg-flash");
    void el.offsetWidth;
    el.classList.add("lg-flash");
    el.addEventListener("animationend", () => el.classList.remove("lg-flash"), { once: true });
  });

const COLOR_ORDER = new Map(ALL_COLORS.map((color, i) => [color, i]));
const rankOrder = (a: Card, b: Card): number =>
  (COLOR_ORDER.get(a.color) ?? 0) - (COLOR_ORDER.get(b.color) ?? 0) ||
  Number(a.bonus) - Number(b.bonus) ||
  (Number.parseInt(a.collectorNumber, 10) || 0) - (Number.parseInt(b.collectorNumber, 10) || 0);

const ToolbarToggle = ({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string; icon: ReactNode }[];
  value: string;
  onChange: (id: string) => void;
}) => (
  <div className="inline-flex overflow-hidden rounded border border-neutral-300 dark:border-black">
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        title={option.label}
        aria-pressed={value === option.id}
        onClick={() => onChange(option.id)}
        className={clsx(
          "flex items-center gap-1.5 px-2.5 py-1.5 text-sm",
          value === option.id
            ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
            : "bg-white hover:bg-neutral-100 dark:bg-neutral-700 dark:hover:bg-neutral-600",
          TRANSITION_CLASSES
        )}
      >
        {option.icon}
        <span className="hidden xl:inline">{option.label}</span>
      </button>
    ))}
  </div>
);

const MoreMenu = ({ items }: { items: { label: ReactNode; onClick: () => void; danger?: boolean }[] }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: PointerEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" className={BUTTON_CLASSES} aria-label="More" onClick={() => setOpen((o) => !o)}>
        <DotsIcon />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-56 rounded-md border border-neutral-300 bg-white p-1 shadow-xl dark:border-black dark:bg-neutral-800">
          {items.map((item, i) => (
            <button
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={clsx(
                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm",
                item.danger ? "hover:bg-rose-600 hover:text-white" : "hover:bg-blue-500 hover:text-white dark:hover:bg-amber-600"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const EditorPage = ({ set, payload, filters }: ViewProps) => {
  const { listId } = useParams();
  const store = useTierLists();
  const list = store.lists.find((l) => l.id === listId);
  if (!list) {
    return (
      <div className="py-16 text-center">
        <p className="mb-3 text-lg">That tier list isn&apos;t in this browser.</p>
        <Link to={`/${set.code}/lists`} className="underline">
          See your {set.label} tier lists
        </Link>
      </div>
    );
  }
  if (list.setCode !== set.code) return <Navigate to={`/${list.setCode}/lists/${list.id}`} replace />;
  return <Editor set={set} payload={payload} filters={filters} list={list} />;
};

const Editor = ({ set, payload, filters, list }: ViewProps & { list: TierList }) => {
  const store = useTierLists();
  const { prefs, setPref } = usePrefs();
  const { show } = useToasts();
  const navigate = useNavigate();
  const { closeSearch } = useSearchControls();
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [dialog, setDialog] = useState<null | "export" | "import" | "quick" | "help">(null);
  const [quickQueue, setQuickQueue] = useState<string[]>([]);
  // Keys act on the card under the pointer; after an arrow-key nudge they keep acting on the
  // nudged card (which has moved out from under the pointer) until the pointer moves.
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const stickyCard = useRef<string | null>(null);
  const listRef = useRef(list);
  listRef.current = list;

  useEffect(() => {
    if (prefs.lastListBySet[set.code] !== list.id) {
      setPref("lastListBySet", { ...prefs.lastListBySet, [set.code]: list.id });
    }
  }, [list.id, set.code, prefs.lastListBySet, setPref]);

  const update = useCallback(
    (fn: (l: TierList) => TierList, options?: { coalesce?: string }) => store.updateList(list.id, fn, options),
    [store, list.id]
  );

  const cardsByName = useMemo(() => new Map(payload.cards.map((card) => [card.name, card])), [payload.cards]);
  const { deck, rarities, cardTypes, manaValues } = filters;
  const isVisible = useCallback(
    (card: Card) => matchesListFilters(card, { deck, rarities, cardTypes, manaValues }),
    [deck, rarities, cardTypes, manaValues]
  );
  const filtering = filtersAreActive({ deck, rarities, cardTypes, manaValues });
  const placementIndex = useMemo(() => indexPlacements(list), [list]);
  const unranked = useMemo(() => payload.cards.filter((card) => !placementIndex.has(card.name)), [payload.cards, placementIndex]);
  const unrankedVisible = useMemo(() => unranked.filter(isVisible), [unranked, isVisible]);
  const visibleCount = useMemo(() => payload.cards.filter(isVisible).length, [payload.cards, isVisible]);
  const rankedCount = payload.cards.length - unranked.length;
  const orphans = useMemo(
    () => Object.values(list.placements).flat().filter((name) => !cardsByName.has(name)).length,
    [list.placements, cardsByName]
  );
  const hasGrades = payload.stats.kind === "ok";
  const showGrades = prefs.showGrades && hasGrades;
  const hotkeys = useMemo(() => tierHotkeys(list.tiers), [list.tiers]);
  const columns = useMemo(() => columnsForDeck(deck.colors, ALL_COLORS), [deck]);

  const badgeFor = useMemo(() => {
    if (!showGrades) return undefined;
    return (card: Card) => {
      const stats = card.stats[deck.code];
      return stats ? <GradeChip grade={stats.grade} title={`17Lands: ${stats.grade}`} /> : null;
    };
  }, [showGrades, deck.code]);

  const onDrop = useCallback(
    (name: string, target: DropTarget) =>
      update((l) => {
        const next = moveCard(l, name, target.tierId, target.anchor);
        return samePlacements(l, next) ? l : next;
      }),
    [update]
  );

  const engine = useDragEngine({
    layout: prefs.layout,
    flow: prefs.cardStyle === "images",
    onDrop,
    enabled: true,
  });

  const assign = useCallback(
    (name: string, tierId: string | null, announce = false) => {
      update((l) => assignTier(l, name, tierId));
      flash(name);
      if (announce) {
        const label = tierId ? listRef.current.tiers.find((t) => t.id === tierId)?.label : null;
        show(label ? `${name} → ${label}` : `${name} → unranked`, {
          action: { label: "Undo", run: () => store.undo(list.id) },
        });
      }
    },
    [update, show, store, list.id]
  );

  const openQuickRank = useCallback(() => {
    const queue = payload.cards
      .filter((card) => !indexPlacements(listRef.current).has(card.name) && isVisible(card))
      .sort(rankOrder)
      .map((card) => card.name);
    setQuickQueue(queue);
    setDialog("quick");
  }, [payload.cards, isVisible]);

  // Keyboard: point at a card and press a tier's key, arrows, or Backspace.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isModalOpen() || engine.dragging) return;
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable='true']")) return;
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) store.redo(list.id);
        else store.undo(list.id);
        return;
      }
      if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        store.redo(list.id);
        return;
      }
      if (mod) return;
      if (event.key === "?") {
        setDialog("help");
        return;
      }
      const focusedCard = target.closest<HTMLElement>("[data-card]")?.dataset.card ?? null;
      const underPointer = pointer.current
        ? (document.elementFromPoint(pointer.current.x, pointer.current.y) as HTMLElement | null)
            ?.closest<HTMLElement>("[data-card]")?.dataset.card ?? null
        : null;
      const name = stickyCard.current ?? focusedCard ?? underPointer;
      if (!name || !cardsByName.has(name)) {
        if (event.key.toLowerCase() === "q" && !event.altKey && !event.shiftKey) openQuickRank();
        return;
      }
      const tier = tierForEvent(event, listRef.current.tiers, hotkeys);
      if (tier) {
        event.preventDefault();
        stickyCard.current = null;
        preview.hide();
        assign(name, tier.id);
        return;
      }
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        stickyCard.current = name;
        preview.hide();
        const up = event.key === "ArrowUp";
        if (event.altKey) {
          const el = document.querySelector<HTMLElement>(`[data-card="${CSS.escape(name)}"]`);
          const container = el?.closest<HTMLElement>("[data-drop]");
          const tierId = container?.dataset.drop;
          if (!el || !container || !tierId || tierId === "__pool") return;
          const siblings = [...container.querySelectorAll<HTMLElement>("[data-card]")];
          const i = siblings.indexOf(el);
          const neighbor = siblings[up ? i - 1 : i + 1]?.dataset.card;
          if (!neighbor) return;
          update((l) => moveCard(l, name, tierId, up ? { before: neighbor } : { after: neighbor }));
        } else {
          update((l) => nudgeTier(l, name, up ? -1 : 1));
        }
        flash(name);
        return;
      }
      if (event.key === "Backspace" || event.key === "Delete" || event.key.toLowerCase() === "x") {
        event.preventDefault();
        stickyCard.current = null;
        preview.hide();
        assign(name, null);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        setDetailCard(cardsByName.get(name) ?? null);
        return;
      }
      if (event.key.toLowerCase() === "q") openQuickRank();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [engine, store, list.id, cardsByName, hotkeys, assign, update, openQuickRank]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (pointer.current && Math.hypot(event.clientX - pointer.current.x, event.clientY - pointer.current.y) > 2) {
        stickyCard.current = null;
      }
      pointer.current = { x: event.clientX, y: event.clientY };
    };
    const onLeave = () => {
      pointer.current = null;
      stickyCard.current = null;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const onTierAction = useCallback(
    (action: TierAction) => {
      const tierLabel = (id: string) => listRef.current.tiers.find((t) => t.id === id)?.label ?? "";
      switch (action.type) {
        case "rename":
          update((l) => renameTier(l, action.tierId, action.label));
          break;
        case "recolor":
          update((l) => recolorTier(l, action.tierId, action.color));
          break;
        case "insert":
          update((l) => insertTier(l, action.index, "New"));
          show("Added a tier. Double-click its name to rename it.");
          break;
        case "move":
          update((l) => moveTier(l, action.tierId, action.delta));
          break;
        case "clear": {
          const count = listRef.current.placements[action.tierId]?.length ?? 0;
          update((l) => clearTier(l, action.tierId));
          show(`Unranked the ${count} cards in ${tierLabel(action.tierId)}`, {
            action: { label: "Undo", run: () => store.undo(list.id) },
          });
          break;
        }
        case "remove": {
          const count = listRef.current.placements[action.tierId]?.length ?? 0;
          const label = tierLabel(action.tierId);
          update((l) => removeTier(l, action.tierId));
          show(count ? `Deleted ${label}; its ${count} cards are unranked` : `Deleted ${label}`, {
            action: { label: "Undo", run: () => store.undo(list.id) },
          });
          break;
        }
        default:
      }
    },
    [update, show, store, list.id]
  );

  const tierPicker = useCallback(
    (card: Card, after?: () => void) => (
      <div>
        <div className="mb-2 text-lg">Your tier</div>
        <TierButtons
          tiers={list.tiers}
          current={placementIndex.get(card.name)?.tierId ?? null}
          hotkeys={hotkeys}
          onPick={(tierId) => {
            assign(card.name, tierId, true);
            after?.();
          }}
        />
      </div>
    ),
    [list.tiers, placementIndex, hotkeys, assign]
  );

  const searchExtras = useCallback(
    (card: Card) => (
      <div className="space-y-3">
        {tierPicker(card)}
        <button
          type="button"
          className={clsx(BUTTON_CLASSES, "w-full")}
          onClick={() => {
            closeSearch();
            requestAnimationFrame(() => {
              const el = document.querySelector<HTMLElement>(`[data-card="${CSS.escape(card.name)}"]`);
              if (el) {
                el.scrollIntoView({ block: "center", behavior: "smooth" });
                flash(card.name);
              } else {
                show("That card is hidden by the current filters");
              }
            });
          }}
        >
          Show it on the board
        </button>
      </div>
    ),
    [tierPicker, closeSearch, show]
  );
  useSearchExtras(searchExtras);

  const duplicate = () => {
    const ids = new Map(list.tiers.map((t) => [t.id, newId()]));
    const copy: TierList = {
      ...list,
      id: newId(),
      name: `${list.name} (copy)`,
      tiers: list.tiers.map((t) => ({ ...t, id: ids.get(t.id)! })),
      placements: Object.fromEntries(list.tiers.map((t) => [ids.get(t.id)!, [...(list.placements[t.id] ?? [])]])),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      origin: `Copy of “${list.name}”`,
    };
    store.addList(copy);
    navigate(`/${set.code}/lists/${copy.id}${filters.search}`);
    show(`Made a copy: “${copy.name}”`);
  };

  const remove = () => {
    const snapshot = list;
    store.deleteList(list.id);
    navigate(`/${set.code}/lists${filters.search}`);
    show(`Deleted “${snapshot.name}”`, { action: { label: "Undo", run: () => store.addList(snapshot) }, durationMs: 8000 });
  };

  const unrankAll = () => {
    update((l) => ({ ...l, placements: Object.fromEntries(l.tiers.map((t) => [t.id, []])), updatedAt: Date.now() }));
    show("Unranked every card", { action: { label: "Undo", run: () => store.undo(list.id) } });
  };

  const progress = payload.cards.length ? rankedCount / payload.cards.length : 0;

  return (
    <div className="pt-3">
      <div className="mb-3 flex flex-col gap-2">
        <div className="min-w-0">
          <input
            value={list.name}
            onChange={(event) => update((l) => ({ ...l, name: event.target.value, updatedAt: Date.now() }), { coalesce: "name" })}
            onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
            aria-label="Tier list name"
            className={clsx(
              "-ml-1 w-full max-w-xl rounded border border-transparent bg-transparent px-1 font-belerenSmallCaps text-2xl tracking-wide outline-none",
              "hover:border-neutral-300 focus:border-blue-500 dark:hover:border-neutral-600 dark:focus:border-amber-600"
            )}
          />
          <div className="mt-1 flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${progress * 100}%` }} />
            </div>
            <span>
              {rankedCount} of {payload.cards.length} ranked
            </span>
            <span>· saved in this browser {timeAgo(list.updatedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex">
            <button
              type="button"
              className={clsx(BUTTON_CLASSES, "rounded-r-none")}
              disabled={!store.canUndo(list.id)}
              onClick={() => store.undo(list.id)}
              title="Undo (⌘Z)"
              aria-label="Undo"
            >
              <UndoIcon />
            </button>
            <button
              type="button"
              className={clsx(BUTTON_CLASSES, "-ml-px rounded-l-none")}
              disabled={!store.canRedo(list.id)}
              onClick={() => store.redo(list.id)}
              title="Redo (⇧⌘Z)"
              aria-label="Redo"
            >
              <RedoIcon />
            </button>
          </div>
          <ToolbarToggle
            value={prefs.layout}
            onChange={(id) => setPref("layout", id as "grid" | "rows")}
            options={[
              { id: "grid", label: "By color", icon: <GridIcon /> },
              { id: "rows", label: "Rows", icon: <RowsIcon /> },
            ]}
          />
          <ToolbarToggle
            value={prefs.cardStyle}
            onChange={(id) => setPref("cardStyle", id as "text" | "images")}
            options={[
              { id: "text", label: "Names", icon: <TextIcon /> },
              { id: "images", label: "Images", icon: <ImageIcon /> },
            ]}
          />
          <button
            type="button"
            className={clsx(BUTTON_CLASSES, showGrades && "!border-blue-500 !bg-blue-500 !text-white dark:!border-amber-600 dark:!bg-amber-600")}
            disabled={!hasGrades}
            onClick={() => setPref("showGrades", !prefs.showGrades)}
            title={hasGrades ? "Show 17Lands' grade beside each card" : "No 17Lands grades for this set yet"}
          >
            <EyeIcon off={!showGrades} /> 17Lands
          </button>
          <button type="button" className={BUTTON_CLASSES} onClick={openQuickRank} title="Rank unranked cards one at a time (Q)">
            <BoltIcon className="text-amber-500" /> Quick rank
          </button>
          <button type="button" className={BUTTON_CLASSES} onClick={() => setDialog("export")}>
            <DownloadIcon /> Export
          </button>
          <button type="button" className={BUTTON_CLASSES} onClick={() => setDialog("import")}>
            <UploadIcon /> Import
          </button>
          <Link
            to={`/${set.code}/compare?a=${list.id}${filters.search ? `&${filters.search.slice(1)}` : ""}`}
            className={BUTTON_CLASSES}
          >
            <CompareIcon /> Compare
          </Link>
          <button type="button" className={BUTTON_CLASSES} onClick={() => setDialog("help")} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">
            <KeyboardIcon />
          </button>
          <MoreMenu
            items={[
              { label: <><CopyIcon /> Duplicate</>, onClick: duplicate },
              { label: <>Unrank every card</>, onClick: unrankAll },
              { label: <><TrashIcon /> Delete this list</>, onClick: remove, danger: true },
            ]}
          />
        </div>
      </div>

      {filtering && (
        <Banner>
          Showing {visibleCount} of {payload.cards.length} cards
          {deck.colors.length > 0 && <> (playable in {getDeckLabel(set, deck)})</>}. Filtered-out cards keep their places.{" "}
          <button type="button" className={clsx("underline", HOVER_CLASSES)} onClick={filters.reset}>
            Clear filters
          </button>
        </Banner>
      )}
      {orphans > 0 && (
        <Banner tone="warning">
          {orphans} card{orphans === 1 ? " in this list isn't" : "s in this list aren't"} in {set.label}&apos;s card pool, so{" "}
          {orphans === 1 ? "it's" : "they're"} not shown.
        </Banner>
      )}
      {rankedCount === 0 && (
        <Banner>
          Drag cards from <strong>Unranked</strong> onto the tiers, or point at a card and press a tier&apos;s key (
          <strong>A</strong>, <strong>⇧A</strong> for A+, <strong>⌥A</strong> for A-). <strong>Quick rank</strong> shows
          one card at a time.
        </Banner>
      )}

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <TierBoard
          list={list}
          cardsByName={cardsByName}
          isVisible={isVisible}
          layout={prefs.layout}
          cardStyle={prefs.cardStyle}
          columns={columns}
          badgeFor={badgeFor}
          onCardClick={setDetailCard}
          editable
          onTierAction={onTierAction}
          hotkeys={hotkeys}
          onPointerDown={engine.onPointerDown}
        />
        <UnrankedPanel
          cards={unrankedVisible}
          hiddenCount={unranked.length - unrankedVisible.length}
          totalCards={payload.cards.length}
          cardStyle={prefs.cardStyle}
          sort={prefs.poolSort}
          onSortChange={(sort) => setPref("poolSort", sort)}
          deckCode={deck.code}
          badgeFor={badgeFor}
          onCardClick={setDetailCard}
          onPointerDown={engine.onPointerDown}
          hasGrades={hasGrades}
        />
      </div>

      {detailCard && (
        <Modal title={detailCard.name} onClose={() => setDetailCard(null)} className="size-full lg:size-fit">
          <CardDetail card={detailCard}>{tierPicker(detailCard, () => setDetailCard(null))}</CardDetail>
        </Modal>
      )}
      {dialog === "export" && (
        <ExportDialog
          list={list}
          setLabel={set.label}
          allNames={[...payload.cards].sort(rankOrder).map((c) => c.name)}
          filteredNames={filtering ? new Set(payload.cards.filter(isVisible).map((c) => c.name)) : null}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "import" && <ImportDialog set={set} cards={payload.cards} existing={list} onClose={() => setDialog(null)} />}
      {dialog === "quick" && (
        <QuickRank
          list={list}
          queue={quickQueue}
          cardsByName={cardsByName}
          deckCode={deck.code}
          hotkeys={hotkeys}
          onAssign={(name, tierId) => update((l) => assignTier(l, name, tierId))}
          onUndo={() => store.undo(list.id)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "help" && <ShortcutsHelp tiers={list.tiers} hotkeys={hotkeys} onClose={() => setDialog(null)} />}
    </div>
  );
};

export default EditorPage;
