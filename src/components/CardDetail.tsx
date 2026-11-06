import clsx from "clsx";
import { useState, type ReactNode } from "react";

import { Decks, lookupDeck } from "../lib/decks";
import { formatNumber, formatPercentage, formatPercentageDifference } from "../lib/format";
import { GRADE_BG_COLORS, GRADE_BORDER_COLORS, HOVER_CLASSES, TRANSITION_CLASSES } from "../lib/styles";
import type { Card, CardStats } from "../lib/types";
import { RARITY_NAMES } from "./CardBubble";
import { LoadingCardImage } from "./CardImage";
import { Center, Collapsible, LinkOut } from "./common";
import { ChevronDownIcon, ColorIcon, ExternalIcon, StarIcon } from "./icons";
import ManaCost from "./ManaCost";
import Tooltip from "./Tooltip";

const DECKS_TO_SHOW = 5;
const ROW_HEADER_CLASSES = "w-28 bg-neutral-100 dark:bg-neutral-800";

const DeckStatsRow = ({ deckCode, stats }: { deckCode: string; stats: CardStats }) => {
  const deck = lookupDeck(deckCode);
  return (
    <div className="flex">
      <Center className={clsx("shrink-0 p-2 text-xl font-bold", ROW_HEADER_CLASSES)}>
        {!deck || deck === Decks.ALL ? (
          <span>AVG</span>
        ) : (
          <div>
            {deck.colors.map((color) => (
              <ColorIcon key={color} color={color} className="mr-1 last:mr-0" />
            ))}
          </div>
        )}
      </Center>
      <div className="grow px-4 py-2">
        <div className="flex">
          <div className={clsx("mx-auto w-16 py-3 pl-4 text-2xl font-bold text-black", GRADE_BG_COLORS[stats.grade])}>
            {stats.grade}
          </div>
          <Center className={clsx("grow border", GRADE_BORDER_COLORS[stats.grade])}>
            <div className="px-4 font-mono text-xl">{formatPercentage(stats.winrate)}</div>
          </Center>
        </div>
      </div>
    </div>
  );
};

/** The card's grade in its most-played decks (the site's "Deck Analysis"). */
const DeckAnalysisTable = ({ card }: { card: Card }) => {
  const [expanded, setExpanded] = useState(false);
  const deckStats = Object.entries(card.stats).sort(([, a], [, b]) => b.gameCount - a.gameCount);
  const shown = deckStats.slice(0, DECKS_TO_SHOW);
  const more = deckStats.slice(DECKS_TO_SHOW);
  const spacer = <div className={clsx("h-2", ROW_HEADER_CLASSES)} />;
  return (
    <div className="lg:min-h-[404px]">
      <div className="border border-neutral-200 dark:border-black">
        {spacer}
        {shown.map(([code, stats]) => (
          <DeckStatsRow key={code} deckCode={code} stats={stats} />
        ))}
        <Collapsible isExpanded={expanded}>
          {more.map(([code, stats]) => (
            <DeckStatsRow key={code} deckCode={code} stats={stats} />
          ))}
        </Collapsible>
        {spacer}
      </div>
      {more.length > 0 && (
        <Collapsible isExpanded={!expanded}>
          <button
            type="button"
            className={clsx("w-full pt-1 text-neutral-300 dark:text-neutral-700", HOVER_CLASSES, TRANSITION_CLASSES)}
            onClick={() => setExpanded(true)}
            aria-label="More deck stats"
          >
            <ChevronDownIcon className="mx-auto block" />
          </button>
        </Collapsible>
      )}
    </div>
  );
};

const StatsRow = ({
  label,
  tooltip,
  className,
  children,
}: {
  label: string;
  tooltip: string;
  className?: string;
  children: ReactNode;
}) => (
  <tr className={className}>
    <td className="py-2 pl-4 pr-12">
      <Tooltip content={tooltip}>
        <span className="cursor-pointer">{label}</span>
      </Tooltip>
    </td>
    <td className="pr-4 text-right font-mono text-sm">{children}</td>
  </tr>
);

/** Every 17Lands number for the card (the site's "Full 17Lands Stats"). */
const DetailedStatsTable = ({ card }: { card: Card }) => {
  const overall = card.overallStats!;
  const all = card.stats[Decks.ALL.code];
  return (
    <table className="w-full border border-neutral-200 dark:border-black lg:w-[21em]">
      <tbody>
        {overall.lastSeenAt !== null && (
          <StatsRow label="Average last seen at" tooltip="The average pick number where this card was last seen in packs">
            {formatNumber(overall.lastSeenAt, 2)}
          </StatsRow>
        )}
        {overall.takenAt !== null && (
          <StatsRow label="Average taken at" tooltip="The average pick number at which this card was taken by 17Lands drafters">
            {formatNumber(overall.takenAt, 2)}
          </StatsRow>
        )}
        <StatsRow
          label="Number of games played"
          tooltip="The number of games played with this card in the maindeck"
          className="border-t border-neutral-200 dark:border-black"
        >
          {formatNumber(overall.gameCount)}
        </StatsRow>
        {all && (
          <StatsRow label="Number of games in hand" tooltip="The number of times this card was drawn, either in the opening hand or later">
            {formatNumber(all.gameCount)}
          </StatsRow>
        )}
        {overall.playedWinrate !== null && (
          <StatsRow
            label="Games played win rate"
            tooltip="The win rate of decks with this card in the maindeck"
            className="border-t border-neutral-200 dark:border-black"
          >
            {formatPercentage(overall.playedWinrate)}
          </StatsRow>
        )}
        {overall.openingHandWinrate !== null && (
          <StatsRow label="Opening hand win rate" tooltip="The win rate of games where this card was in the opening hand">
            {formatPercentage(overall.openingHandWinrate)}
          </StatsRow>
        )}
        {overall.drawnWinrate !== null && (
          <StatsRow
            label="Games drawn win rate"
            tooltip="The win rate of games where this card was drawn, not counting cards from the opening hand"
          >
            {formatPercentage(overall.drawnWinrate)}
          </StatsRow>
        )}
        {all && (
          <StatsRow
            label="Games in hand win rate"
            tooltip="The win rate of games where this card was drawn, either in the opening hand or later"
          >
            {formatPercentage(all.winrate)}
          </StatsRow>
        )}
        {overall.notDrawnWinrate !== null && all && (
          <>
            <StatsRow
              label="Games not drawn win rate"
              tooltip="The win rate of games where this card was in the maindeck, but was never drawn"
            >
              {formatPercentage(overall.notDrawnWinrate)}
            </StatsRow>
            <StatsRow
              label="Improvement when drawn"
              tooltip="The difference between Games in hand win rate and Games not drawn win rate"
            >
              {formatPercentageDifference(all.winrate - overall.notDrawnWinrate)}
            </StatsRow>
          </>
        )}
      </tbody>
    </table>
  );
};

/** Card image, deck analysis and full stats, with optional extra content (tier buttons). */
const CardDetail = ({ card, children }: { card: Card; children?: ReactNode }) => {
  const hasStats = card.overallStats !== null && Object.keys(card.stats).length > 0;
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex flex-col items-center gap-3 self-center lg:mt-9 lg:self-start">
        <LoadingCardImage card={card} />
        <div className="flex w-[240px] flex-col gap-1 text-sm text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center justify-between gap-2">
            <span>
              {RARITY_NAMES[card.rarity]}
              {card.bonus && (
                <span className="ml-1 inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                  <StarIcon className="text-[0.8em]" /> bonus sheet
                </span>
              )}
            </span>
            <ManaCost cost={card.manaCost} />
          </div>
          <span>{card.typeLine}</span>
          <LinkOut url={card.scryfallUri} className="inline-flex items-center gap-1">
            Scryfall <ExternalIcon className="text-xs" />
          </LinkOut>
        </div>
      </div>
      {hasStats ? (
        <>
          <div className="self-stretch">
            <div className="mb-2 text-lg">Deck Analysis</div>
            <DeckAnalysisTable card={card} />
          </div>
          <div className="self-stretch">
            <div className="mb-2 text-lg">Full 17Lands Stats</div>
            <DetailedStatsTable card={card} />
          </div>
        </>
      ) : (
        <div className="max-w-[24em] self-stretch text-neutral-500 dark:text-neutral-400 lg:mt-9">
          17Lands has no grade for this card yet. Grades need games: the card has to be drawn more than 500 times
          in Premier Draft.
        </div>
      )}
      {children && <div className="self-stretch lg:mt-9 lg:w-[19em]">{children}</div>}
    </div>
  );
};

export default CardDetail;
