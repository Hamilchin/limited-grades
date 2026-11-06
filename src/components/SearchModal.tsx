import clsx from "clsx";
import { useMemo, useRef, useState, type ReactNode } from "react";

import { SearchIndex } from "../lib/search";
import { INPUT_CLASSES } from "../lib/styles";
import type { Card } from "../lib/types";
import CardDetail from "./CardDetail";
import { ColorIcon, SearchIcon } from "./icons";
import Modal from "./Modal";

interface Props {
  cards: Card[];
  onClose: () => void;
  /** Extra content beside the card (e.g. tier buttons in the tier list editor). */
  renderExtras?: (card: Card) => ReactNode;
}

/** Find a card by name and see its details (⌘K / Ctrl+K). */
const SearchModal = ({ cards, onClose, renderExtras }: Props) => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Card>();
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const index = useMemo(() => new SearchIndex(cards, (card) => card.name), [cards]);
  const results = useMemo(() => index.search(query).slice(0, 6), [index, query]);
  const showResults = query.length > 0 && (!selected || selected.name !== query);

  const choose = (card: Card) => {
    setSelected(card);
    setQuery(card.name);
  };

  return (
    <Modal title="Search" onClose={onClose} initialFocus={input} className="size-full lg:size-fit">
      <div className="relative mb-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            ref={input}
            className={clsx(INPUT_CLASSES, "w-full py-2 pl-9")}
            placeholder="Enter a card name"
            value={query}
            enterKeyHint="go"
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((i) => Math.min(results.length - 1, i + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (event.key === "Enter" && results[active]) {
                event.preventDefault();
                choose(results[active]!.item);
              }
            }}
          />
        </div>
        {showResults && (
          <div className="absolute inset-x-0 z-10 mt-1 overflow-hidden rounded bg-white shadow-[0_0_0_1px_hsla(0,0%,0%,0.1),0_4px_11px_hsla(0,0%,0%,0.1)] dark:bg-neutral-700">
            {results.length === 0 && <div className="px-3 py-2 text-center text-neutral-400">No matching cards found</div>}
            {results.map(({ item, match }, i) => (
              <button
                key={item.name}
                type="button"
                className={clsx(
                  "flex w-full items-center gap-2 px-3 py-2 text-left",
                  i === active && "bg-[#deebff] dark:bg-[#d97706]"
                )}
                onMouseMove={() => setActive(i)}
                onClick={() => choose(item)}
              >
                <ColorIcon color={item.color} className="relative -bottom-px" />
                <span>
                  {item.name.slice(0, match.start)}
                  <span className="font-bold underline">{item.name.slice(match.start, match.end)}</span>
                  {item.name.slice(match.end)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {!selected && <div className="lg:h-[440px] lg:w-[928px]" />}
      {selected && <CardDetail card={selected}>{renderExtras?.(selected)}</CardDetail>}
    </Modal>
  );
};

export default SearchModal;
