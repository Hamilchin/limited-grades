import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { sanitizeList, type TierList } from "../lib/tierModel";
import useToasts from "./useToasts";

// Tier lists live in this browser's localStorage. Every change saves right away, other tabs pick
// changes up through the storage event, and each list keeps an in-memory undo history.

const KEY = "lg.tierlists.v1";
const HISTORY_LIMIT = 200;
const COALESCE_MS = 1200;

const readStorage = (): TierList[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { lists?: unknown[] };
    return (parsed.lists ?? []).map(sanitizeList).filter((l): l is TierList => l !== null);
  } catch {
    return [];
  }
};

interface History {
  past: TierList[];
  future: TierList[];
  coalesceKey?: string;
  coalesceAt?: number;
}

interface UpdateOptions {
  /** Updates with the same key in quick succession share one undo step (e.g. typing a name). */
  coalesce?: string;
  /** Skip the undo history entirely. */
  silent?: boolean;
}

export interface TierListsStore {
  lists: TierList[];
  getList: (id: string | undefined) => TierList | undefined;
  addList: (list: TierList) => void;
  updateList: (id: string, update: (list: TierList) => TierList, options?: UpdateOptions) => void;
  deleteList: (id: string) => void;
  undo: (id: string) => boolean;
  redo: (id: string) => boolean;
  canUndo: (id: string) => boolean;
  canRedo: (id: string) => boolean;
}

const Context = createContext<TierListsStore | null>(null);

export const TierListsProvider = ({ children }: { children: ReactNode }) => {
  const [lists, setLists] = useState<TierList[]>(readStorage);
  const histories = useRef(new Map<string, History>());
  const listsRef = useRef(lists);
  listsRef.current = lists;
  const skipSave = useRef(false);
  const { show } = useToasts();
  const warned = useRef(false);

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify({ version: 1, lists }));
      warned.current = false;
    } catch (error) {
      if (!warned.current) {
        warned.current = true;
        show(`Couldn't save to this browser's storage: ${String(error)}`, { tone: "error", durationMs: 8000 });
      }
    }
  }, [lists, show]);

  // Another tab changed the lists.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== KEY) return;
      skipSave.current = true;
      setLists(readStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const historyFor = (id: string): History => {
    let history = histories.current.get(id);
    if (!history) {
      history = { past: [], future: [] };
      histories.current.set(id, history);
    }
    return history;
  };

  const getList = useCallback((id: string | undefined) => listsRef.current.find((l) => l.id === id), []);

  const addList = useCallback((list: TierList) => {
    setLists((all) => [...all.filter((l) => l.id !== list.id), list]);
  }, []);

  const updateList = useCallback((id: string, update: (list: TierList) => TierList, options: UpdateOptions = {}) => {
    const current = listsRef.current.find((l) => l.id === id);
    if (!current) return;
    const next = update(current);
    if (next === current) return;
    if (!options.silent) {
      const history = historyFor(id);
      const now = Date.now();
      const coalesced =
        options.coalesce !== undefined &&
        history.coalesceKey === options.coalesce &&
        now - (history.coalesceAt ?? 0) < COALESCE_MS;
      if (!coalesced) {
        history.past.push(current);
        if (history.past.length > HISTORY_LIMIT) history.past.shift();
      }
      history.future = [];
      history.coalesceKey = options.coalesce;
      history.coalesceAt = now;
    }
    listsRef.current = listsRef.current.map((l) => (l.id === id ? next : l));
    setLists(listsRef.current);
  }, []);

  const deleteList = useCallback((id: string) => {
    histories.current.delete(id);
    setLists((all) => all.filter((l) => l.id !== id));
  }, []);

  const step = useCallback((id: string, direction: "undo" | "redo"): boolean => {
    const history = histories.current.get(id);
    const current = listsRef.current.find((l) => l.id === id);
    if (!history || !current) return false;
    const from = direction === "undo" ? history.past : history.future;
    const to = direction === "undo" ? history.future : history.past;
    const target = from.pop();
    if (!target) return false;
    to.push(current);
    history.coalesceKey = undefined;
    listsRef.current = listsRef.current.map((l) => (l.id === id ? { ...target, updatedAt: Date.now() } : l));
    setLists(listsRef.current);
    return true;
  }, []);

  const undo = useCallback((id: string) => step(id, "undo"), [step]);
  const redo = useCallback((id: string) => step(id, "redo"), [step]);
  const canUndo = useCallback((id: string) => (histories.current.get(id)?.past.length ?? 0) > 0, []);
  const canRedo = useCallback((id: string) => (histories.current.get(id)?.future.length ?? 0) > 0, []);

  const value = useMemo<TierListsStore>(
    () => ({ lists, getList, addList, updateList, deleteList, undo, redo, canUndo, canRedo }),
    [lists, getList, addList, updateList, deleteList, undo, redo, canUndo, canRedo]
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

const useTierLists = (): TierListsStore => {
  const store = useContext(Context);
  if (!store) throw new Error("useTierLists needs a TierListsProvider");
  return store;
};

export default useTierLists;
