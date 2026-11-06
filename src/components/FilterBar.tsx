import clsx from "clsx";
import { useEffect, useState, type ReactNode } from "react";

import { Decks, type Deck } from "../lib/decks";
import { ALL_MANA_VALUES, ManaValue } from "../lib/filters";
import { ALL_SETS, getDeckLabel, type MagicSet } from "../lib/sets";
import { HOVER_CLASSES, TRANSITION_CLASSES } from "../lib/styles";
import { CardType, Rarity, type SetIconData } from "../lib/types";
import type { FiltersState } from "../hooks/useFilters";
import { loadAvailableSets } from "../hooks/useSetData";
import { Center, Collapsible } from "./common";
import { ChevronDownIcon, ColorIcon, GlyphIcon, SearchIcon, SetIcon, SetIconImage } from "./icons";
import { isModalOpen } from "./Modal";
import Select from "./Select";

const FLEX_CLASSES = "flex flex-col lg:flex-row";
const GAP_CLASSES = "pt-2 lg:pt-0 lg:pl-4";

const FilterGroup = ({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) => (
  <div className={clsx("flex items-center lg:block", className)}>
    <label htmlFor={htmlFor} className="block w-16 select-none text-sm lg:mb-2 lg:w-auto">
      {label}
    </label>
    <div className="grow">{children}</div>
  </div>
);

interface IconFilter<T> {
  label: string;
  values: T[];
  icon: ReactNode;
  widthClassName?: string;
}

/**
 * A row of toggles. Clicking one when all are on shows only that one; turning off the last one
 * turns everything back on (the site's behavior).
 */
const IconFilterGroup = <T,>({
  values,
  setValues,
  filters,
  className,
}: {
  values: Set<T>;
  setValues: (values: Set<T>) => void;
  filters: IconFilter<T>[];
  className?: string;
}) => {
  const checked = filters.map((f) => f.values.every((v) => values.has(v)));
  const checkedCount = checked.filter(Boolean).length;
  const allChecked = checkedCount === filters.length;
  const oneChecked = checkedCount === 1;
  return (
    <div className={clsx("flex", className)}>
      {filters.map((filter, index) => {
        const isChecked = checked[index]!;
        const toggle = () => {
          if (allChecked) {
            setValues(new Set(filter.values));
          } else if (oneChecked && isChecked) {
            setValues(new Set(filters.flatMap((f) => f.values)));
          } else {
            const next = new Set(values);
            for (const v of filter.values) {
              if (isChecked) next.delete(v);
              else next.add(v);
            }
            setValues(next);
          }
        };
        let title: string;
        if (allChecked) title = `Show only ${filter.label}`;
        else if (oneChecked && isChecked) title = "Show all";
        else if (isChecked) title = `Hide ${filter.label}`;
        else title = `Show ${filter.label}`;
        return (
          <div
            key={filter.label}
            className={clsx(
              "-ml-px overflow-hidden first:ml-0 hover:z-20 focus:z-10",
              "h-[38px] grow first:rounded-l last:rounded-r",
              "border border-neutral-300 hover:border-neutral-500 dark:border-black",
              filter.widthClassName ?? "min-w-[44px] lg:min-w-[46px]",
              TRANSITION_CLASSES
            )}
            tabIndex={0}
            role="checkbox"
            aria-checked={isChecked}
            aria-label={title}
            onKeyDown={(event) => {
              if (event.code === "Space") {
                event.preventDefault();
                toggle();
              }
            }}
          >
            <label className="cursor-pointer" title={title}>
              <input type="checkbox" checked={isChecked} onChange={toggle} className="peer hidden" />
              <Center
                className={clsx(
                  "size-full select-none",
                  "bg-neutral-200 hover:!bg-neutral-200 peer-checked:bg-white",
                  "dark:bg-neutral-900 dark:hover:!bg-neutral-900 dark:peer-checked:bg-neutral-700",
                  "opacity-30 transition peer-checked:opacity-100"
                )}
              >
                {filter.icon}
              </Center>
            </label>
          </div>
        );
      })}
    </div>
  );
};

const TYPE_FILTERS: IconFilter<CardType>[] = [
  { label: "creatures", values: [CardType.CREATURE], icon: <GlyphIcon name="creature" /> },
  { label: "instants and sorceries", values: [CardType.INSTANT, CardType.SORCERY], icon: <GlyphIcon name="instant" /> },
  {
    label: "artifacts, enchantments, battles, and planeswalkers",
    values: [CardType.ARTIFACT, CardType.ENCHANTMENT, CardType.BATTLE, CardType.PLANESWALKER],
    icon: <GlyphIcon name="enchantment" />,
  },
  { label: "lands", values: [CardType.LAND], icon: <GlyphIcon name="land" /> },
];

const SMALL = "min-w-[36px] lg:min-w-[38px]";
const MANA_FILTERS: IconFilter<ManaValue>[] = ALL_MANA_VALUES.map((value) =>
  value === ManaValue.SIX_PLUS
    ? {
        label: "cards with mana value 6 or more",
        values: [value],
        icon: (
          <div className="flex items-center gap-0.5">
            <div>6</div>
            <div className="pb-0.5 text-sm">+</div>
          </div>
        ),
      }
    : { label: `cards with mana value ${value}`, values: [value], icon: value, widthClassName: SMALL }
);

const rarityFilters = (iconData: SetIconData | null | undefined): IconFilter<Rarity>[] =>
  (
    [
      [Rarity.COMMON, "commons"],
      [Rarity.UNCOMMON, "uncommons"],
      [Rarity.RARE, "rares"],
      [Rarity.MYTHIC, "mythics"],
    ] as const
  ).map(([rarity, label]) => ({ label, values: [rarity], icon: <SetIcon data={iconData} rarity={rarity} /> }));

interface Props {
  set: MagicSet;
  iconData: SetIconData | null | undefined;
  onChangeSet: (set: MagicSet) => void;
  filters: FiltersState;
  onOpenSearch: () => void;
  /** Hide the deck picker (e.g. nothing to pick). */
  extra?: ReactNode;
}

const FilterBar = ({ set, iconData, onChangeSet, filters, onOpenSearch, extra }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [available, setAvailable] = useState<Set<string> | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadAvailableSets().then((sets) => !cancelled && setAvailable(sets));
    return () => {
      cancelled = true;
    };
  }, []);
  const sets = available ? ALL_SETS.filter((s) => available.has(s.code) || s === set) : ALL_SETS;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !isModalOpen()) {
        event.preventDefault();
        onOpenSearch();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onOpenSearch]);

  const decks: Deck[] = [Decks.ALL, ...set.decks];
  return (
    <>
      <div className={clsx("rounded-t-lg bg-neutral-100 p-4 dark:bg-neutral-800 lg:pl-8", FLEX_CLASSES, TRANSITION_CLASSES)}>
        <FilterGroup label="Set" htmlFor="set-select-input">
          <Select
            inputId="set-select-input"
            value={set}
            options={sets}
            getKey={(s) => s.code}
            getLabel={(s) => s.label}
            onChange={onChangeSet}
            renderIcon={(s) =>
              s === set ? (
                <SetIcon data={iconData} className="text-2xl" />
              ) : (
                <SetIconImage code={s.scryfallCode} className="text-2xl" />
              )
            }
            className="min-w-[230px] lg:min-w-[270px]"
          />
        </FilterGroup>
        <FilterGroup label="Deck" htmlFor="deck-select-input" className={GAP_CLASSES}>
          <Select
            inputId="deck-select-input"
            value={filters.deck}
            options={decks}
            getKey={(d) => d.code}
            getLabel={(d) => getDeckLabel(set, d)}
            onChange={filters.setDeck}
            renderIcon={(d) =>
              d.colors.length === 0 ? null : (
                <span className="relative bottom-px flex">
                  {d.colors.map((color) => (
                    <ColorIcon key={color} color={color} className="mr-px last:mr-0" />
                  ))}
                </span>
              )
            }
            className="min-w-[200px]"
          />
        </FilterGroup>
        <Collapsible isExpanded={expanded} className={clsx("grow lg:!flex lg:!max-h-none lg:!overflow-visible", FLEX_CLASSES)}>
          <FilterGroup label="Rarity" className={GAP_CLASSES}>
            <IconFilterGroup
              values={filters.rarities}
              setValues={filters.setRarities}
              filters={rarityFilters(iconData)}
              className="text-2xl"
            />
          </FilterGroup>
          <FilterGroup label="Type" className={GAP_CLASSES}>
            <IconFilterGroup values={filters.cardTypes} setValues={filters.setCardTypes} filters={TYPE_FILTERS} className="text-2xl" />
          </FilterGroup>
          <FilterGroup label="Mana Value" className={clsx(GAP_CLASSES, "lg:hidden 1.5xl:block")}>
            <IconFilterGroup
              values={filters.manaValues}
              setValues={filters.setManaValues}
              filters={MANA_FILTERS}
              className="text-lg font-semibold"
            />
          </FilterGroup>
          <div className={clsx("flex gap-2 lg:ml-auto", GAP_CLASSES)}>
            {extra}
            <button
              type="button"
              onClick={onOpenSearch}
              title="Search (⌘K)"
              aria-label="Search"
              className={clsx(
                "size-full rounded px-6 py-1 hover:text-white lg:rounded-lg lg:text-2xl",
                "bg-white hover:bg-blue-500 dark:bg-neutral-700 dark:hover:bg-amber-600",
                "border border-neutral-300 dark:border-black",
                TRANSITION_CLASSES
              )}
            >
              <SearchIcon className="relative bottom-0.5 mr-1.5 inline-block lg:static lg:mr-0 lg:block" />
              <span className="lg:hidden">Search</span>
            </button>
          </div>
        </Collapsible>
      </div>
      <Collapsible isExpanded={!expanded} className="lg:hidden">
        <button
          type="button"
          className={clsx("w-full pt-1 text-neutral-300 dark:text-neutral-700", HOVER_CLASSES, TRANSITION_CLASSES)}
          onClick={() => setExpanded(true)}
          aria-label="More filters"
        >
          <ChevronDownIcon className="mx-auto block" />
        </button>
      </Collapsible>
    </>
  );
};

export default FilterBar;
