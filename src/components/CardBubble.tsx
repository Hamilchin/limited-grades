import clsx from "clsx";
import { forwardRef, memo, type ReactNode } from "react";

import { HOVER_CLASSES, TRANSITION_CLASSES } from "../lib/styles";
import { Rarity, type Card } from "../lib/types";
import { preview } from "./CardPreview";
import { StarIcon } from "./icons";

export const RARITY_BORDER: Record<Rarity, string> = {
  [Rarity.COMMON]: clsx("border-common dark:border-neutral-300", TRANSITION_CLASSES),
  [Rarity.UNCOMMON]: "border-uncommon",
  [Rarity.RARE]: "border-rare",
  [Rarity.MYTHIC]: "border-mythic",
};

export const RARITY_NAMES: Record<Rarity, string> = {
  [Rarity.COMMON]: "Common",
  [Rarity.UNCOMMON]: "Uncommon",
  [Rarity.RARE]: "Rare",
  [Rarity.MYTHIC]: "Mythic",
};

interface Props {
  card: Card;
  onClick?: (card: Card) => void;
  /** Extra content at the right edge (a grade chip, a difference marker). */
  badge?: ReactNode;
  /** Marks bonus-sheet cards with a star. */
  showBonus?: boolean;
  className?: string;
  /** For drag-and-drop and the compare view. */
  dataAttributes?: Record<string, string>;
}

/** A card name with its rarity on the left edge, previewing the card on hover (the site's CardBubble). */
const CardBubble = memo(
  forwardRef<HTMLButtonElement, Props>(({ card, onClick, badge, showBonus, className, dataAttributes }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick ? () => onClick(card) : undefined}
      onMouseEnter={(event) => preview.show(card, event.currentTarget)}
      onMouseLeave={(event) => preview.hide(event.currentTarget)}
      onFocus={(event) => event.currentTarget.matches(":focus-visible") && preview.show(card, event.currentTarget)}
      onBlur={(event) => preview.hide(event.currentTarget)}
      className={clsx(
        "flex items-start gap-1 px-2 text-left",
        "underline-offset-2 hover:underline",
        "border-l-[3px] bg-white dark:bg-neutral-700",
        HOVER_CLASSES,
        TRANSITION_CLASSES,
        RARITY_BORDER[card.rarity],
        className
      )}
      {...dataAttributes}
    >
      <span className="grow">
        {card.name}
        {showBonus && card.bonus && (
          <StarIcon className="relative bottom-px ml-1 text-[0.65em] text-amber-500 dark:text-amber-400" />
        )}
      </span>
      {badge}
    </button>
  ))
);

CardBubble.displayName = "CardBubble";

export default CardBubble;

/** A small card image for the image views. */
export const CardThumb = memo(
  forwardRef<HTMLButtonElement, Omit<Props, "showBonus">>(({ card, onClick, badge, className, dataAttributes }, ref) => (
    <button
      ref={ref}
      type="button"
      title={card.name}
      onClick={onClick ? () => onClick(card) : undefined}
      onMouseEnter={(event) => preview.show(card, event.currentTarget)}
      onMouseLeave={(event) => preview.hide(event.currentTarget)}
      className={clsx(
        "relative block w-full overflow-hidden rounded-[6px] bg-neutral-200 outline-none ring-blue-500 hover:ring-2 focus-visible:ring-2 dark:bg-neutral-700 dark:ring-amber-600",
        className
      )}
      style={{ aspectRatio: "146 / 204" }}
      {...dataAttributes}
    >
      <img src={card.thumbUrl || card.cardUrl} alt={card.name} loading="lazy" draggable={false} className="size-full object-cover" />
      {badge && <span className="absolute right-0.5 top-0.5">{badge}</span>}
    </button>
  ))
);

CardThumb.displayName = "CardThumb";
