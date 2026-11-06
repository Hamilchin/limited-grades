import clsx from "clsx";
import { useMemo, useState } from "react";

import useToasts from "../../hooks/useToasts";
import { BUTTON_CLASSES, PRIMARY_BUTTON_CLASSES } from "../../lib/styles";
import type { TierList } from "../../lib/tierModel";
import { EXPORT_FORMATS, exportTierList, type ExportFormat } from "../../lib/tierText";
import { CopyIcon, DownloadIcon } from "../icons";
import Modal from "../Modal";

interface Props {
  list: TierList;
  setLabel: string;
  allNames: string[];
  /** Cards matching the current filters, when any filter is on. */
  filteredNames: Set<string> | null;
  onClose: () => void;
}

const fileName = (list: TierList): string =>
  `${list.setCode}-${list.name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "tier-list";

/** Plain text to send a friend: pick a format, copy or download. */
const ExportDialog = ({ list, setLabel, allNames, filteredNames, onClose }: Props) => {
  const [format, setFormat] = useState<ExportFormat>("sections");
  const [includeUnranked, setIncludeUnranked] = useState(false);
  const [onlyFiltered, setOnlyFiltered] = useState(false);
  const { show } = useToasts();
  const text = useMemo(
    () =>
      exportTierList(list, {
        format,
        includeUnranked,
        allNames,
        setLabel,
        only: onlyFiltered && filteredNames ? filteredNames : undefined,
      }),
    [list, format, includeUnranked, allNames, setLabel, onlyFiltered, filteredNames]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      show("Copied the tier list to the clipboard");
    } catch {
      show("Couldn't copy: select the text and copy it instead", { tone: "error" });
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName(list)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Modal
      title="Export as text"
      onClose={onClose}
      className="w-full lg:w-[52rem]"
      footer={
        <>
          <button type="button" className={BUTTON_CLASSES} onClick={download}>
            <DownloadIcon /> Download .txt
          </button>
          <button type="button" className={PRIMARY_BUTTON_CLASSES} onClick={copy}>
            <CopyIcon /> Copy to clipboard
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex shrink-0 flex-col gap-3 md:w-64">
          <fieldset className="space-y-1">
            <legend className="mb-1 text-sm font-medium">Format</legend>
            {EXPORT_FORMATS.map((option) => (
              <label
                key={option.id}
                className={clsx(
                  "block cursor-pointer rounded border p-2 text-sm",
                  format === option.id
                    ? "border-blue-500 bg-blue-500/10 dark:border-amber-600 dark:bg-amber-600/10"
                    : "border-neutral-300 dark:border-neutral-700"
                )}
              >
                <input
                  type="radio"
                  name="format"
                  className="sr-only"
                  checked={format === option.id}
                  onChange={() => setFormat(option.id)}
                />
                <div className="font-medium">{option.name}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">{option.description}</div>
              </label>
            ))}
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeUnranked} onChange={(e) => setIncludeUnranked(e.target.checked)} />
            Include unranked cards
          </label>
          {filteredNames && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyFiltered} onChange={(e) => setOnlyFiltered(e.target.checked)} />
              Only cards matching the filters
            </label>
          )}
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Any of these formats can be imported again here, so friends can paste yours into their own copy.
          </p>
        </div>
        <textarea
          readOnly
          value={text}
          onFocus={(event) => event.currentTarget.select()}
          className="min-h-[24rem] w-full grow resize-none rounded border border-neutral-300 bg-neutral-50 p-3 font-mono text-xs leading-5 dark:border-black dark:bg-neutral-800"
        />
      </div>
    </Modal>
  );
};

export default ExportDialog;
