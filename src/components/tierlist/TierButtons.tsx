import clsx from "clsx";

import { describeHotkey, type TierHotkey } from "../../lib/tierKeys";
import type { Tier } from "../../lib/tierModel";

interface Props {
  tiers: Tier[];
  current: string | null;
  hotkeys?: Map<string, TierHotkey>;
  onPick: (tierId: string | null) => void;
  onHover?: (tierId: string | null) => void;
  size?: "small" | "large";
  counts?: Map<string, number>;
}

/** One button per tier (plus "Unranked"), each showing its keyboard shortcut. */
const TierButtons = ({ tiers, current, hotkeys, onPick, onHover, size = "small", counts }: Props) => (
  <div className="space-y-2">
    <div className={clsx("grid gap-1.5", size === "large" ? "grid-cols-4 sm:grid-cols-5" : "grid-cols-4")}>
      {tiers.map((tier) => {
        const active = tier.id === current;
        return (
          <button
            key={tier.id}
            type="button"
            onClick={() => onPick(tier.id)}
            onMouseEnter={() => onHover?.(tier.id)}
            onMouseLeave={() => onHover?.(null)}
            onFocus={() => onHover?.(tier.id)}
            className={clsx(
              "relative flex flex-col items-center justify-center rounded border-l-4 font-bold text-neutral-900 transition",
              size === "large" ? "h-14 text-xl" : "h-10 text-base",
              active
                ? "ring-2 ring-neutral-900 ring-offset-1 dark:ring-white dark:ring-offset-neutral-900"
                : "hover:brightness-110 hover:saturate-150"
            )}
            style={{ borderLeftColor: tier.color, backgroundColor: `${tier.color}${active ? "" : "55"}` }}
          >
            <span className="leading-none dark:text-neutral-100">{tier.label}</span>
            <span className="mt-0.5 flex gap-1 text-[0.65rem] font-normal leading-none text-neutral-700 dark:text-neutral-300">
              {hotkeys?.get(tier.id) && <span>{describeHotkey(hotkeys.get(tier.id))}</span>}
              {counts && <span className="opacity-70">({counts.get(tier.id) ?? 0})</span>}
            </span>
          </button>
        );
      })}
    </div>
    <button
      type="button"
      onClick={() => onPick(null)}
      className={clsx(
        "w-full rounded border border-dashed px-2 py-1.5 text-sm",
        current === null
          ? "border-neutral-700 font-semibold dark:border-neutral-200"
          : "border-neutral-400 text-neutral-500 hover:border-neutral-700 hover:text-neutral-800 dark:hover:border-neutral-200 dark:hover:text-neutral-100"
      )}
    >
      Unranked <span className="text-xs opacity-70">(⌫)</span>
    </button>
  </div>
);

export default TierButtons;
