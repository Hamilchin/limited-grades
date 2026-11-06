import { useCallback, useEffect, useRef, useState } from "react";

import type { SetPayload } from "../lib/types";

/** Built for static hosting: read pre-generated files instead of asking the local API server. */
export const STATIC_DATA = import.meta.env.VITE_STATIC_DATA === "1";

const dataUrl = (code: string, refresh: boolean): string =>
  STATIC_DATA ? `${import.meta.env.BASE_URL}data/${code}.json` : `/api/set/${code}${refresh ? "?refresh=1" : ""}`;

const cache = new Map<string, SetPayload>();
const inflight = new Map<string, Promise<SetPayload>>();

const load = (code: string, refresh = false): Promise<SetPayload> => {
  const key = `${code}${refresh ? ":refresh" : ""}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = fetch(dataUrl(code, refresh))
    .then(async (response) => {
      if (STATIC_DATA && response.status === 404) throw new Error("this set isn't included in this copy");
      const body = (await response.json()) as SetPayload | { error: string };
      if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : response.statusText);
      cache.set(code, body);
      return body;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
};

let availableSets: Promise<Set<string> | null> | null = null;

/** In a static build, the sets that were generated (null when every set is available). */
export const loadAvailableSets = (): Promise<Set<string> | null> => {
  if (!STATIC_DATA) return Promise.resolve(null);
  availableSets ??= fetch(`${import.meta.env.BASE_URL}data/index.json`)
    .then((response) => response.json() as Promise<{ sets: string[] }>)
    .then((index) => new Set(index.sets))
    .catch(() => null);
  return availableSets;
};

export interface SetDataState {
  /** This set's data, or null while it loads. */
  data: SetPayload | null;
  /** The last set shown, kept on screen (as skeletons) while a new set loads. */
  previous: SetPayload | null;
  error: string | null;
  refreshing: boolean;
  refresh: (() => void) | null;
  retry: () => void;
}

const useSetData = (code: string): SetDataState => {
  const [data, setData] = useState<SetPayload | null>(() => cache.get(code) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const previous = useRef<SetPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cached = cache.get(code);
    setError(null);
    if (cached) {
      setData(cached);
      return undefined;
    }
    setData((current) => {
      if (current) previous.current = current;
      return null;
    });
    load(code).then(
      (payload) => !cancelled && setData(payload),
      (e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e))
    );
    return () => {
      cancelled = true;
    };
  }, [code, attempt]);

  useEffect(() => {
    if (data) previous.current = data;
  }, [data]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load(code, true)
      .then(setData, (e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setRefreshing(false));
  }, [code]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    data: data?.setCode === code ? data : null,
    previous: previous.current,
    error,
    refreshing,
    refresh: STATIC_DATA ? null : refresh,
    retry,
  };
};

export default useSetData;
