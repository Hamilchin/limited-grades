import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { Decks, lookupDeck, type Deck } from "../lib/decks";
import {
  ALL_MANA_VALUES,
  CARD_TYPE_CHARS,
  decodeSet,
  encodeSet,
  MANA_VALUE_CHARS,
  RARITY_CHARS,
  type CardFilters,
  type ManaValue,
} from "../lib/filters";
import { ALL_CARD_TYPES, ALL_RARITIES, type CardType, type Rarity } from "../lib/types";

export interface FiltersState extends CardFilters {
  setDeck: (deck: Deck) => void;
  setRarities: (values: Set<Rarity>) => void;
  setCardTypes: (values: Set<CardType>) => void;
  setManaValues: (values: Set<ManaValue>) => void;
  reset: () => void;
  /** "?deck=wu&rarity=cu", to keep filters when moving between views. */
  search: string;
}

/** The filter bar's state, kept in the URL like limitedgrades.com does. */
const useFilters = (): FiltersState => {
  const [params, setParams] = useSearchParams();

  const update = useCallback(
    (key: string, value: string | null) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value === null) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );

  const deck = lookupDeck(params.get("deck")) ?? Decks.ALL;
  const rarityParam = params.get("rarity");
  const typeParam = params.get("type");
  const manaParam = params.get("mana");
  const rarities = useMemo(() => decodeSet(rarityParam, RARITY_CHARS, ALL_RARITIES), [rarityParam]);
  const cardTypes = useMemo(() => decodeSet(typeParam, CARD_TYPE_CHARS, ALL_CARD_TYPES), [typeParam]);
  const manaValues = useMemo(() => decodeSet(manaParam, MANA_VALUE_CHARS, ALL_MANA_VALUES), [manaParam]);

  const setDeck = useCallback((d: Deck) => update("deck", d === Decks.ALL ? null : d.code), [update]);
  const setRarities = useCallback(
    (values: Set<Rarity>) => update("rarity", encodeSet(values, RARITY_CHARS, ALL_RARITIES)),
    [update]
  );
  const setCardTypes = useCallback(
    (values: Set<CardType>) => update("type", encodeSet(values, CARD_TYPE_CHARS, ALL_CARD_TYPES)),
    [update]
  );
  const setManaValues = useCallback(
    (values: Set<ManaValue>) => update("mana", encodeSet(values, MANA_VALUE_CHARS, ALL_MANA_VALUES)),
    [update]
  );
  const reset = useCallback(
    () =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const key of ["deck", "rarity", "type", "mana"]) next.delete(key);
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );

  const filterParams = new URLSearchParams();
  for (const key of ["deck", "rarity", "type", "mana"]) {
    const value = params.get(key);
    if (value !== null) filterParams.set(key, value);
  }
  const query = filterParams.toString();
  const search = query ? `?${query}` : "";

  return {
    deck,
    rarities,
    cardTypes,
    manaValues,
    setDeck,
    setRarities,
    setCardTypes,
    setManaValues,
    reset,
    search,
  };
};

export default useFilters;
