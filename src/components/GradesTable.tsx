import clsx from "clsx";
import { memo, useMemo } from "react";

import type { Deck } from "../lib/decks";
import { GRADE_BORDER_COLORS, HEADER_BG_CLASSES, TRANSITION_CLASSES } from "../lib/styles";
import { ALL_COLORS, ALL_GRADES, Grade, type Card, type Color } from "../lib/types";
import CardBubble from "./CardBubble";
import { Center } from "./common";
import { ColorIcon } from "./icons";

interface Props {
  cards: Card[];
  deck: Deck;
  showSkeletons: boolean;
  onClickCard: (card: Card) => void;
}

/** The 17Lands grades table: a row per grade, a column per color (limitedgrades.com's CardTable). */
const GradesTable = ({ cards, deck, showSkeletons, onClickCard }: Props) => {
  const groups = useMemo(() => {
    const result = new Map<string, Card[]>();
    for (const card of cards) {
      const stats = card.stats[deck.code];
      if (!stats) continue;
      const key = `${card.color},${stats.grade}`;
      const group = result.get(key);
      if (group) group.push(card);
      else result.set(key, [card]);
    }
    for (const group of result.values()) group.sort((a, b) => b.stats[deck.code]!.score - a.stats[deck.code]!.score);
    return result;
  }, [cards, deck]);

  const cell = (color: Color, grade: Grade): Card[] => groups.get(`${color},${grade}`) ?? [];

  return (
    <>
      <div
        className={clsx(
          "sticky top-0 z-10 hidden border-b-2 border-neutral-900 text-lg lg:grid lg:grid-cols-[4rem_repeat(7,_1fr)]",
          HEADER_BG_CLASSES,
          TRANSITION_CLASSES
        )}
      >
        <div />
        {ALL_COLORS.map((color) => (
          <div key={color} className="p-px text-center">
            <ColorIcon color={color} className="my-2" />
          </div>
        ))}
      </div>
      {ALL_GRADES.map((grade) => {
        const hasCards = ALL_COLORS.some((color) => cell(color, grade).length > 0);
        return (
          <div key={grade} className={clsx({ "hidden lg:block": !hasCards, "lg:mb-0.5": grade !== Grade.F })}>
            <div className="py-2 text-center text-xl font-bold lg:hidden">{grade}</div>
            <div className="grid grid-cols-[1fr] gap-0.5 lg:grid-cols-[4rem_repeat(7,_1fr)] lg:gap-0">
              <div
                className={clsx(
                  "hidden items-center border-l-4 pl-4 text-xl font-bold lg:flex",
                  HEADER_BG_CLASSES,
                  GRADE_BORDER_COLORS[grade],
                  TRANSITION_CLASSES
                )}
              >
                {grade}
              </div>
              {ALL_COLORS.map((color) => {
                const cellCards = cell(color, grade);
                return (
                  <div key={color} className={clsx("lg:block", cellCards.length > 0 ? "flex" : "hidden")}>
                    <Center
                      className={clsx(
                        "w-16 shrink-0 border-l-4 lg:hidden",
                        HEADER_BG_CLASSES,
                        GRADE_BORDER_COLORS[grade],
                        TRANSITION_CLASSES
                      )}
                    >
                      <ColorIcon color={color} className="my-2" />
                    </Center>
                    <div className={clsx("grow bg-neutral-100 p-2 dark:bg-neutral-800 lg:h-full lg:px-1", TRANSITION_CLASSES)}>
                      {cellCards.map((card) =>
                        showSkeletons ? (
                          <div key={card.name} className="mb-1 h-6 animate-pulse bg-neutral-200 last:mb-0 dark:bg-neutral-700" />
                        ) : (
                          <CardBubble key={card.name} card={card} onClick={onClickCard} className="mb-1 w-full last:mb-0" />
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default memo(GradesTable);
