import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { CompareIcon, CopyIcon, DownloadIcon, PlusIcon, SetIconImage, TrashIcon, UploadIcon } from "../components/icons";
import ExportDialog from "../components/tierlist/ExportDialog";
import ImportDialog, { PENDING_IMPORT_KEY } from "../components/tierlist/ImportDialog";
import NewListDialog from "../components/tierlist/NewListDialog";
import useTierLists from "../hooks/useTierLists";
import useToasts from "../hooks/useToasts";
import { timeAgo } from "../lib/format";
import { ALL_SETS, lookupSet } from "../lib/sets";
import { BUTTON_CLASSES, HOVER_CLASSES, PRIMARY_BUTTON_CLASSES, TRANSITION_CLASSES } from "../lib/styles";
import { newId, type TierList } from "../lib/tierModel";
import type { ViewProps } from "./SetShell";

const Distribution = ({ list, poolNames }: { list: TierList; poolNames: Set<string> }) => {
  const counts = list.tiers.map((tier) => (list.placements[tier.id] ?? []).filter((n) => poolNames.has(n)).length);
  const total = poolNames.size || 1;
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700" aria-hidden>
      {list.tiers.map((tier, i) =>
        counts[i] ? <div key={tier.id} style={{ width: `${(counts[i]! / total) * 100}%`, backgroundColor: tier.color }} /> : null
      )}
    </div>
  );
};

const ListsPage = ({ set, payload, filters }: ViewProps) => {
  const store = useTierLists();
  const { show } = useToasts();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [dialog, setDialog] = useState<null | "new" | "import">(null);
  const [pendingText, setPendingText] = useState("");
  const [exporting, setExporting] = useState<TierList | null>(null);

  // Arriving from another set's import dialog with the text to import here.
  useEffect(() => {
    if (params.get("import") !== "1") return;
    let text = "";
    try {
      text = sessionStorage.getItem(PENDING_IMPORT_KEY) ?? "";
      sessionStorage.removeItem(PENDING_IMPORT_KEY);
    } catch {
      // Nothing to carry over.
    }
    setPendingText(text);
    setDialog("import");
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("import");
        return next;
      },
      { replace: true }
    );
  }, [params, setParams]);

  const poolNames = useMemo(() => new Set(payload.cards.map((c) => c.name)), [payload.cards]);
  const lists = useMemo(
    () => store.lists.filter((l) => l.setCode === set.code).sort((a, b) => b.updatedAt - a.updatedAt),
    [store.lists, set.code]
  );
  const otherSets = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of store.lists) if (l.setCode !== set.code) counts.set(l.setCode, (counts.get(l.setCode) ?? 0) + 1);
    return ALL_SETS.filter((s) => counts.has(s.code)).map((s) => ({ set: s, count: counts.get(s.code)! }));
  }, [store.lists, set.code]);
  const hasGrades = payload.stats.kind === "ok";

  const duplicate = (list: TierList) => {
    const ids = new Map(list.tiers.map((t) => [t.id, newId()]));
    store.addList({
      ...list,
      id: newId(),
      name: `${list.name} (copy)`,
      tiers: list.tiers.map((t) => ({ ...t, id: ids.get(t.id)! })),
      placements: Object.fromEntries(list.tiers.map((t) => [ids.get(t.id)!, [...(list.placements[t.id] ?? [])]])),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      origin: `Copy of “${list.name}”`,
    });
    show(`Made a copy of “${list.name}”`);
  };

  const remove = (list: TierList) => {
    store.deleteList(list.id);
    show(`Deleted “${list.name}”`, { action: { label: "Undo", run: () => store.addList(list) }, durationMs: 8000 });
  };

  return (
    <div className="pt-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-belerenSmallCaps text-2xl tracking-wide">Your {set.label} tier lists</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {payload.cards.length} cards you can open in a booster, bonus sheet included. Lists are saved in this
            browser.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={BUTTON_CLASSES} onClick={() => setDialog("import")}>
            <UploadIcon /> Import .txt
          </button>
          <button type="button" className={PRIMARY_BUTTON_CLASSES} onClick={() => setDialog("new")}>
            <PlusIcon /> New tier list
          </button>
        </div>
      </div>

      {lists.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700">
          <div className="font-belerenSmallCaps text-3xl tracking-wide">Rank {set.label} your way</div>
          <p className="max-w-xl text-neutral-600 dark:text-neutral-300">
            Drag every card into tiers, reorder within a tier, and use the same filters as the grades page. Export the
            result as text to send to friends, import theirs, and compare any two lists side by side
            {hasGrades ? ", or against the 17Lands grades" : ""}.
          </p>
          <div className="flex gap-2">
            <button type="button" className={PRIMARY_BUTTON_CLASSES} onClick={() => setDialog("new")}>
              <PlusIcon /> New tier list
            </button>
            <button type="button" className={BUTTON_CLASSES} onClick={() => setDialog("import")}>
              <UploadIcon /> Import a friend&apos;s list
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lists.map((list) => {
            const ranked = Object.values(list.placements).flat().filter((n) => poolNames.has(n)).length;
            return (
              <div
                key={list.id}
                className={clsx(
                  "group relative flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-100 p-4 dark:border-black dark:bg-neutral-800",
                  "hover:border-blue-500 dark:hover:border-amber-600",
                  TRANSITION_CLASSES
                )}
              >
                <Link to={`/${set.code}/lists/${list.id}${filters.search}`} className="absolute inset-0 rounded-lg" aria-label={`Open ${list.name}`} />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-medium">{list.name}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {list.tiers.length} tiers · edited {timeAgo(list.updatedAt)}
                      {list.origin && ` · ${list.origin}`}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold">
                      {ranked}/{payload.cards.length}
                    </div>
                    <div className="text-xs text-neutral-500">ranked</div>
                  </div>
                </div>
                <Distribution list={list} poolNames={poolNames} />
                <div className="relative z-10 flex flex-wrap gap-1 text-sm">
                  <Link to={`/${set.code}/compare?a=${list.id}`} className={clsx("flex items-center gap-1 rounded px-2 py-1", HOVER_CLASSES)}>
                    <CompareIcon /> Compare
                  </Link>
                  <button type="button" className={clsx("flex items-center gap-1 rounded px-2 py-1", HOVER_CLASSES)} onClick={() => setExporting(list)}>
                    <DownloadIcon /> Export
                  </button>
                  <button type="button" className={clsx("flex items-center gap-1 rounded px-2 py-1", HOVER_CLASSES)} onClick={() => duplicate(list)}>
                    <CopyIcon /> Duplicate
                  </button>
                  <button
                    type="button"
                    className="ml-auto flex items-center gap-1 rounded px-2 py-1 hover:text-rose-600"
                    onClick={() => remove(list)}
                  >
                    <TrashIcon /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {otherSets.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-2 text-sm font-medium text-neutral-500 dark:text-neutral-400">Lists for other sets</h3>
          <div className="flex flex-wrap gap-2">
            {otherSets.map(({ set: other, count }) => (
              <button
                key={other.code}
                type="button"
                onClick={() => navigate(`/${other.code}/lists`)}
                className={clsx(BUTTON_CLASSES, "gap-2")}
              >
                <SetIconImage code={lookupSet(other.code)?.scryfallCode ?? null} />
                {other.label} · {count}
              </button>
            ))}
          </div>
        </div>
      )}

      {dialog === "new" && (
        <NewListDialog set={set} cards={payload.cards} hasGrades={hasGrades} lists={store.lists} onClose={() => setDialog(null)} />
      )}
      {dialog === "import" && (
        <ImportDialog
          set={set}
          cards={payload.cards}
          initialText={pendingText}
          onClose={() => {
            setDialog(null);
            setPendingText("");
          }}
        />
      )}
      {exporting && (
        <ExportDialog
          list={exporting}
          setLabel={set.label}
          allNames={payload.cards.map((c) => c.name)}
          filteredNames={null}
          onClose={() => setExporting(null)}
        />
      )}
    </div>
  );
};

export default ListsPage;
