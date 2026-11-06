import clsx from "clsx";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import useTierLists from "../../hooks/useTierLists";
import { Decks } from "../../lib/decks";
import type { MagicSet } from "../../lib/sets";
import { BUTTON_CLASSES, INPUT_CLASSES, PRIMARY_BUTTON_CLASSES } from "../../lib/styles";
import { createList, newId, TIER_PRESETS, tierColorFor, type TierList } from "../../lib/tierModel";
import { ALL_GRADES, type Card } from "../../lib/types";
import Modal from "../Modal";

interface Props {
  set: MagicSet;
  cards: Card[];
  hasGrades: boolean;
  lists: TierList[];
  onClose: () => void;
}

type Start = "empty" | "grades" | "copy";

/** A new tier list: name, tier scale, and what to start from. */
const NewListDialog = ({ set, cards, hasGrades, lists, onClose }: Props) => {
  const sameSet = lists.filter((l) => l.setCode === set.code);
  const [name, setName] = useState(sameSet.length ? `${set.label} tier list ${sameSet.length + 1}` : `My ${set.label} tier list`);
  const [preset, setPreset] = useState(TIER_PRESETS[0]!.id);
  const [start, setStart] = useState<Start>("empty");
  const [copyFrom, setCopyFrom] = useState(sameSet[0]?.id ?? "");
  const { addList } = useTierLists();
  const navigate = useNavigate();

  const create = () => {
    let list: TierList;
    const listName = name.trim() || "Untitled tier list";
    if (start === "copy") {
      const source = sameSet.find((l) => l.id === copyFrom);
      if (!source) return;
      const idMap = new Map(source.tiers.map((t) => [t.id, newId()]));
      list = {
        ...source,
        id: newId(),
        name: listName,
        tiers: source.tiers.map((t) => ({ ...t, id: idMap.get(t.id)! })),
        placements: Object.fromEntries(source.tiers.map((t) => [idMap.get(t.id)!, [...(source.placements[t.id] ?? [])]])),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        origin: `Copy of “${source.name}”`,
      };
    } else if (start === "grades") {
      const byLabel: Record<string, string[]> = {};
      for (const grade of ALL_GRADES) {
        byLabel[grade] = cards
          .filter((card) => card.stats[Decks.ALL.code]?.grade === grade)
          .sort((a, b) => b.stats.all!.score - a.stats.all!.score)
          .map((card) => card.name);
      }
      list = createList({ name: listName, setCode: set.code, labels: [...ALL_GRADES], byLabel, origin: "Started from 17Lands grades" });
    } else {
      const labels = TIER_PRESETS.find((p) => p.id === preset)!.labels;
      list = createList({ name: listName, setCode: set.code, labels });
    }
    addList(list);
    onClose();
    navigate(`/${set.code}/lists/${list.id}`);
  };

  const option = (value: Start, title: string, description: string, disabled = false) => (
    <label
      className={clsx(
        "block rounded border p-2",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        start === value
          ? "border-blue-500 bg-blue-500/10 dark:border-amber-600 dark:bg-amber-600/10"
          : "border-neutral-300 dark:border-neutral-700"
      )}
    >
      <input type="radio" className="sr-only" checked={start === value} disabled={disabled} onChange={() => setStart(value)} />
      <div className="font-medium">{title}</div>
      <div className="text-xs text-neutral-500 dark:text-neutral-400">{description}</div>
    </label>
  );

  return (
    <Modal
      title="New tier list"
      onClose={onClose}
      className="w-full lg:w-[40rem]"
      footer={
        <>
          <button type="button" className={BUTTON_CLASSES} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={PRIMARY_BUTTON_CLASSES} onClick={create} disabled={start === "copy" && !copyFrom}>
            Create
          </button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          create();
        }}
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Name</span>
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={clsx(INPUT_CLASSES, "w-full")} />
        </label>
        <div>
          <span className="mb-1 block text-sm font-medium">Start from</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {option("empty", "Nothing", `All ${cards.length} cards unranked`)}
            {option(
              "grades",
              "17Lands grades",
              hasGrades ? "Every graded card placed by its grade" : "No 17Lands grades for this set yet",
              !hasGrades
            )}
            {option("copy", "Another list", sameSet.length ? "A copy to edit separately" : "No other lists for this set yet", !sameSet.length)}
          </div>
        </div>
        {start === "empty" && (
          <div>
            <span className="mb-1 block text-sm font-medium">Tiers</span>
            <div className="space-y-2">
              {TIER_PRESETS.map((p) => (
                <label
                  key={p.id}
                  className={clsx(
                    "flex cursor-pointer items-center gap-3 rounded border p-2",
                    preset === p.id
                      ? "border-blue-500 bg-blue-500/10 dark:border-amber-600 dark:bg-amber-600/10"
                      : "border-neutral-300 dark:border-neutral-700"
                  )}
                >
                  <input type="radio" className="sr-only" checked={preset === p.id} onChange={() => setPreset(p.id)} />
                  <div className="w-32 shrink-0">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">{p.description}</div>
                  </div>
                  <div className="flex flex-wrap gap-0.5">
                    {p.labels.map((label, i) => (
                      <span
                        key={label}
                        className="rounded-sm px-1 text-xs font-bold text-black"
                        style={{ backgroundColor: tierColorFor(label, i, p.labels.length) }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              You can rename, add, recolor and remove tiers later from each tier&apos;s ⋯ menu.
            </p>
          </div>
        )}
        {start === "copy" && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Copy</span>
            <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className={clsx(INPUT_CLASSES, "w-full")}>
              {sameSet.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
};

export default NewListDialog;
