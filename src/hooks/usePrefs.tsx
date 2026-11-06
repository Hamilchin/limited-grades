import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type BoardLayout = "grid" | "rows";
export type CardStyle = "text" | "images";
export type PoolSort = "color" | "rarity" | "mana" | "number" | "grade" | "name";

export interface Prefs {
  layout: BoardLayout;
  cardStyle: CardStyle;
  /** Show 17Lands' grade next to each card while ranking. */
  showGrades: boolean;
  poolSort: PoolSort;
  compareLayout: BoardLayout;
  compareShowDiffs: boolean;
  /** Hide 17Lands numbers in quick rank so they don't anchor you. */
  quickRankBlind: boolean;
  lastListBySet: Record<string, string>;
}

const DEFAULTS: Prefs = {
  layout: "grid",
  cardStyle: "text",
  showGrades: false,
  poolSort: "color",
  compareLayout: "rows",
  compareShowDiffs: true,
  quickRankBlind: false,
  lastListBySet: {},
};

const KEY = "lg.prefs.v1";

const load = (): Prefs => {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>;
    return { ...DEFAULTS, ...stored, lastListBySet: { ...stored.lastListBySet } };
  } catch {
    return DEFAULTS;
  }
};

interface ContextValue {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
}

const Context = createContext<ContextValue>({ prefs: DEFAULTS, setPref: () => undefined });

export const PrefsProvider = ({ children }: { children: ReactNode }) => {
  const [prefs, setPrefs] = useState(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      // Preferences are a convenience; losing them is fine.
    }
  }, [prefs]);
  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((previous) => (previous[key] === value ? previous : { ...previous, [key]: value }));
  }, []);
  const value = useMemo(() => ({ prefs, setPref }), [prefs, setPref]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

const usePrefs = (): ContextValue => useContext(Context);
export default usePrefs;
