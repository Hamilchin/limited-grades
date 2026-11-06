import clsx from "clsx";
import { useState } from "react";

import { HOVER_CLASSES, TRANSITION_CLASSES } from "../lib/styles";
import type { Card } from "../lib/types";
import { Center, Spinner } from "./common";
import { RotateIcon } from "./icons";

const Front = ({ card, onLoad }: { card: Card; onLoad?: () => void }) => (
  <img
    src={card.cardUrl}
    alt={card.name}
    width={240}
    height={340}
    className="h-[340px] w-[240px] rounded-[12px] bg-neutral-200 object-cover dark:bg-neutral-800"
    onLoad={onLoad}
    onError={onLoad}
  />
);

const Back = ({ card }: { card: Card }) => (
  <img
    src={card.cardBackUrl}
    alt={card.name}
    width={240}
    height={340}
    className="h-[340px] w-[240px] rounded-[12px] bg-neutral-200 object-cover dark:bg-neutral-800"
  />
);

/** The card at full size; double-faced cards get a flip button. */
const CardImage = ({ card, onLoad }: { card: Card; onLoad?: () => void }) => {
  const [flipped, setFlipped] = useState(false);
  if (!card.cardBackUrl) return <Front card={card} onLoad={onLoad} />;
  const toggle = () => setFlipped((f) => !f);
  return (
    <div className="relative mb-6">
      <button type="button" onClick={toggle} aria-label="Flip card" className="block">
        <div className={clsx("backface-invisible transition-transform duration-500", flipped ? "rotate-y-180" : "rotate-y-0")}>
          <Front card={card} onLoad={onLoad} />
        </div>
        <div
          className={clsx(
            "backface-invisible absolute inset-0 transition-transform duration-500",
            flipped ? "rotate-y-0" : "rotate-y-180"
          )}
        >
          <Back card={card} />
        </div>
      </button>
      <div className="absolute inset-x-0 -bottom-6">
        <button
          type="button"
          onClick={toggle}
          aria-label="Flip card"
          className={clsx("mx-auto block rounded-full bg-neutral-200 p-2 text-2xl dark:bg-neutral-800", HOVER_CLASSES, TRANSITION_CLASSES)}
        >
          <RotateIcon flip={flipped} />
        </button>
      </div>
    </div>
  );
};

/** CardImage with a spinner until the image arrives. */
export const LoadingCardImage = ({ card }: { card: Card }) => {
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const loading = loadedFor !== card.name;
  return (
    <div className="relative">
      {loading && (
        <Center className="absolute inset-0 z-10">
          <Spinner className="text-5xl" />
        </Center>
      )}
      <div className={clsx(loading && "opacity-0")}>
        <CardImage key={card.name} card={card} onLoad={() => setLoadedFor(card.name)} />
      </div>
    </div>
  );
};

export default CardImage;
