import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A tiny JSON-file cache in data/cache/, so 17Lands and Scryfall are asked as rarely as possible.

const CACHE_DIR = fileURLToPath(new URL("../data/cache/", import.meta.url));

export interface Cached<T> {
  savedAt: number;
  value: T;
}

const fileFor = (key: string): string =>
  path.join(CACHE_DIR, `${key.replace(/[^a-z0-9._-]+/gi, "_")}.json`);

export const readCache = async <T>(key: string): Promise<Cached<T> | null> => {
  try {
    return JSON.parse(await readFile(fileFor(key), "utf8")) as Cached<T>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    console.warn(`[cache] ignoring unreadable entry ${key}: ${String(error)}`);
    return null;
  }
};

export const writeCache = async <T>(key: string, value: T): Promise<void> => {
  await mkdir(CACHE_DIR, { recursive: true });
  const file = fileFor(key);
  const temp = `${file}.${process.pid}.tmp`;
  const entry: Cached<T> = { savedAt: Date.now(), value };
  await writeFile(temp, JSON.stringify(entry));
  await rename(temp, file);
};

export const isFresh = (entry: Cached<unknown> | null, ttlMs: number): boolean =>
  entry !== null && Date.now() - entry.savedAt < ttlMs;

const inflight = new Map<string, Promise<unknown>>();

/** Shares one in-progress load between concurrent callers asking for the same key. */
export const dedupe = <T>(key: string, load: () => Promise<T>): Promise<T> => {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = load().finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
};

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
