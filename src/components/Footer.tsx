import clsx from "clsx";

import { formatDateTime } from "../lib/format";
import { HOVER_CLASSES } from "../lib/styles";
import type { StatsStatus } from "../lib/types";
import { LinkOut } from "./common";

const Footer = ({
  stats,
  onRefresh,
  refreshing,
}: {
  stats: StatsStatus | undefined;
  onRefresh?: (() => void) | null;
  refreshing?: boolean;
}) => (
  <div className="mt-32 border-t border-neutral-400 pb-2 pt-1">
    Based on <LinkOut url="https://www.limitedgrades.com">Limited Grades</LinkOut> by{" "}
    <LinkOut url="https://github.com/youssefm">youssefm</LinkOut>, from designs by{" "}
    <LinkOut url="https://github.com/BodyCopy">BodyCopy</LinkOut>
    <br />
    Made possible thanks to <LinkOut url="https://www.17lands.com">17Lands</LinkOut>,{" "}
    <LinkOut url="https://scryfall.com">Scryfall</LinkOut>, and <LinkOut url="https://mana.andrewgioia.com">Mana</LinkOut>
    <br />
    <em>
      {stats?.kind === "ok" && <>17Lands data last updated on {formatDateTime(stats.updatedAt)} UTC</>}
      {stats?.kind === "none" && <>17Lands had no data for this set when last checked ({formatDateTime(stats.checkedAt)} UTC)</>}
      {stats?.kind === "embargo" && <>17Lands data for this set appears on {formatDateTime(stats.availableAt)} UTC</>}
      {stats?.kind === "error" && <>Couldn&apos;t reach 17Lands: {stats.message}</>}
      {stats?.kind === "disabled" && <>This copy doesn&apos;t include 17Lands grades</>}
    </em>
    {onRefresh && (stats?.kind === "ok" || stats?.kind === "none" || stats?.kind === "error") && (
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className={clsx("ml-2 text-sm underline disabled:opacity-50", HOVER_CLASSES)}
      >
        {refreshing ? "Refreshing…" : "Refresh"}
      </button>
    )}
  </div>
);

export default Footer;
