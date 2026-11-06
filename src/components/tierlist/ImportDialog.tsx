import clsx from "clsx";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import useTierLists from "../../hooks/useTierLists";
import useToasts from "../../hooks/useToasts";
import { lookupSet, type MagicSet } from "../../lib/sets";
import { BUTTON_CLASSES, INPUT_CLASSES, PRIMARY_BUTTON_CLASSES } from "../../lib/styles";
import { createList, makeTiers, type TierList } from "../../lib/tierModel";
import { parseTierText, planImport } from "../../lib/tierText";
import type { Card } from "../../lib/types";
import { UploadIcon, WarningIcon } from "../icons";
import Modal from "../Modal";

export const PENDING_IMPORT_KEY = "lg.pendingImport";

interface Props {
  set: MagicSet;
  cards: Card[];
  /** When importing from inside a list, offer to replace its rankings. */
  existing?: TierList;
  initialText?: string;
  onClose: () => void;
}

const EXAMPLE = `A+
Card name
Another card

A
…

(or "B+: card; card", "1. Card (B+)", "Card - B+")`;

/** Paste a friend's text tier list (or open a .txt) and turn it into a tier list here. */
const ImportDialog = ({ set, cards, existing, initialText = "", onClose }: Props) => {
  const [text, setText] = useState(initialText);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"new" | "replace">("new");
  const [fixes, setFixes] = useState<Record<number, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const deferredText = useDeferredValue(text);
  const { addList, updateList } = useTierLists();
  const { show } = useToasts();
  const navigate = useNavigate();

  const names = useMemo(() => cards.map((card) => card.name), [cards]);
  const parsed = useMemo(
    () => (deferredText.trim() ? parseTierText(deferredText, names, existing?.tiers.map((t) => t.label)) : null),
    [deferredText, names, existing]
  );
  const otherSet = parsed?.setCode && parsed.setCode !== set.code ? lookupSet(parsed.setCode) : undefined;
  const extra = parsed
    ? parsed.unmatched.filter((u) => fixes[u.line]).map((u) => ({ label: u.tierLabel, name: fixes[u.line]! }))
    : [];
  const plan = parsed ? planImport(parsed, extra) : null;
  const matched = plan ? Object.values(plan.byLabel).reduce((sum, list) => sum + list.length, 0) : 0;
  const fuzzy = parsed ? parsed.tiers.flatMap((t) => t.items).filter((item) => item.quality === "fuzzy") : [];
  const unresolved = parsed ? parsed.unmatched.filter((u) => !fixes[u.line]) : [];
  const listName = name.trim() || parsed?.name || "Imported tier list";

  const readFile = (file: File) => {
    file.text().then(setText, () => show("Couldn't read that file", { tone: "error" }));
  };

  const commit = () => {
    if (!plan || matched === 0) return;
    if (mode === "replace" && existing) {
      // Keep matching tiers (by label) so colors and ids survive; add any new labels.
      updateList(existing.id, (list) => {
        const byLabel = new Map(list.tiers.map((t) => [t.label, t]));
        const tiers = plan.labels.map((label) => byLabel.get(label) ?? makeTiers([label])[0]!);
        const placements: Record<string, string[]> = {};
        for (const tier of tiers) placements[tier.id] = [...(plan.byLabel[tier.label] ?? [])];
        return { ...list, tiers, placements, updatedAt: Date.now() };
      });
      show(`Replaced the rankings in “${existing.name}” with ${matched} imported cards`);
      onClose();
      return;
    }
    const list = createList({
      name: listName,
      setCode: set.code,
      labels: plan.labels,
      byLabel: plan.byLabel,
      origin: "Imported from text",
    });
    addList(list);
    show(`Imported “${list.name}” with ${matched} ranked cards`);
    onClose();
    navigate(`/${set.code}/lists/${list.id}`);
  };

  return (
    <Modal
      title="Import a tier list"
      onClose={onClose}
      className="w-full lg:w-[60rem]"
      footer={
        <>
          <button type="button" className={BUTTON_CLASSES} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={PRIMARY_BUTTON_CLASSES} disabled={!plan || matched === 0} onClick={commit}>
            <UploadIcon /> {mode === "replace" ? "Replace rankings" : "Import"}
            {matched > 0 && ` ${matched} cards`}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex min-w-0 grow flex-col gap-2 md:w-1/2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Paste the text, or drop a .txt file</span>
            <button type="button" className="underline" onClick={() => fileInput.current?.click()}>
              Choose file…
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) readFile(file);
                event.target.value = "";
              }}
            />
          </div>
          <textarea
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setFixes({});
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              const file = event.dataTransfer.files[0];
              if (file) readFile(file);
            }}
            placeholder={EXAMPLE}
            spellCheck={false}
            className={clsx(
              "min-h-[22rem] w-full grow resize-none rounded border p-3 font-mono text-xs leading-5 outline-none",
              "border-neutral-300 bg-neutral-50 focus:border-blue-500 dark:border-black dark:bg-neutral-800 dark:focus:border-amber-600",
              dragOver && "border-blue-500 ring-2 ring-blue-500 dark:border-amber-600 dark:ring-amber-600"
            )}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-3 text-sm md:w-1/2">
          {!parsed && (
            <p className="text-neutral-500 dark:text-neutral-400">
              Any of the export formats works, and so do most hand-typed lists: tier headings like “A+”, “Tier B”, “##
              C-”, or “Bombs:”, one card per line or comma-separated, with or without numbers and bullets. Card names
              can be misspelled or just the front face.
            </p>
          )}
          {otherSet && (
            <div className="flex items-start gap-2 rounded bg-amber-400/20 p-2 dark:bg-amber-600/20">
              <WarningIcon className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                This list says it&apos;s for <strong>{otherSet.label}</strong>, but you&apos;re importing into{" "}
                <strong>{set.label}</strong>.{" "}
                <button
                  type="button"
                  className="font-medium underline"
                  onClick={() => {
                    try {
                      sessionStorage.setItem(PENDING_IMPORT_KEY, text);
                    } catch {
                      // Without storage the user can paste again.
                    }
                    onClose();
                    navigate(`/${otherSet.code}/lists?import=1`);
                  }}
                >
                  Import into {otherSet.label} instead
                </button>
              </div>
            </div>
          )}
          {parsed && plan && (
            <>
              <div className="rounded bg-neutral-100 p-3 dark:bg-neutral-800">
                <div className="text-base font-medium">
                  {matched} card{matched === 1 ? "" : "s"} in {plan.labels.length} tiers
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {plan.labels.map((label) => (
                    <span key={label} className="rounded bg-white px-1.5 py-0.5 text-xs dark:bg-neutral-700">
                      <strong>{label}</strong> {plan.byLabel[label]?.length ?? 0}
                    </span>
                  ))}
                </div>
                {parsed.unranked.length > 0 && (
                  <div className="mt-2 text-xs text-neutral-500">{parsed.unranked.length} listed as unranked</div>
                )}
                {parsed.tiers.length > 0 && parsed.loose.length > 0 && (
                  <div className="mt-1 text-xs text-neutral-500">
                    {parsed.loose.length} cards before the first tier heading stay unranked
                  </div>
                )}
                {parsed.duplicates.length > 0 && (
                  <div className="mt-1 text-xs text-neutral-500">
                    Listed twice, kept the first: {[...new Set(parsed.duplicates)].join(", ")}
                  </div>
                )}
              </div>
              {fuzzy.length > 0 && (
                <details className="rounded border border-neutral-200 p-2 dark:border-neutral-700">
                  <summary className="cursor-pointer">Matched {fuzzy.length} misspelled names</summary>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {fuzzy.map((item) => (
                      <li key={item.line}>
                        <span className="text-neutral-500">“{item.raw}”</span> → {item.name}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {parsed.unmatched.length > 0 && (
                <div className="rounded border border-amber-400 p-2 dark:border-amber-600">
                  <div className="mb-1 font-medium">
                    {unresolved.length > 0
                      ? `${unresolved.length} line${unresolved.length === 1 ? "" : "s"} didn't match a card`
                      : "All lines matched"}
                  </div>
                  <ul className="max-h-56 space-y-1 overflow-y-auto">
                    {parsed.unmatched.map((u) => (
                      <li key={u.line} className="flex items-center gap-2">
                        <span className="min-w-0 grow truncate" title={u.text}>
                          <span className="text-xs text-neutral-400">{u.line}:</span> {u.text}
                          {u.tierLabel && <span className="text-xs text-neutral-500"> ({u.tierLabel})</span>}
                        </span>
                        <select
                          value={fixes[u.line] ?? ""}
                          onChange={(event) => setFixes((f) => ({ ...f, [u.line]: event.target.value }))}
                          className={clsx(INPUT_CLASSES, "max-w-[12rem] py-0.5 text-xs")}
                        >
                          <option value="">Skip</option>
                          {u.suggestions.length > 0 && (
                            <optgroup label="Did you mean">
                              {u.suggestions.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label="All cards">
                            {names
                              .filter((n) => !u.suggestions.includes(n))
                              .sort()
                              .map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                          </optgroup>
                        </select>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          <div className="mt-auto space-y-2 border-t border-neutral-200 pt-3 dark:border-neutral-700">
            {existing && (
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={mode === "new"} onChange={() => setMode("new")} /> New tier list
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} /> Replace “
                  {existing.name}”
                </label>
              </div>
            )}
            {mode === "new" && (
              <label className="flex items-center gap-2">
                <span className="shrink-0">Name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={parsed?.name ?? "Imported tier list"}
                  className={clsx(INPUT_CLASSES, "w-full py-1")}
                />
              </label>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ImportDialog;
