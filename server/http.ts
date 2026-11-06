// Polite HTTP helpers: one request at a time per host, a gap between requests, an honest
// User-Agent, and a few retries with backoff for transient failures.

export const USER_AGENT = "LimitedGradesLocal/0.1 (personal tier list tool)";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class Throttle {
  #gapMs: number;
  #queue: Promise<unknown> = Promise.resolve();
  #lastFinishedAt = 0;

  constructor(gapMs: number) {
    this.#gapMs = gapMs;
  }

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.#queue.then(async () => {
      const wait = this.#lastFinishedAt + this.#gapMs - Date.now();
      if (wait > 0) await sleep(wait);
      try {
        return await task();
      } finally {
        this.#lastFinishedAt = Date.now();
      }
    });
    this.#queue = result.catch(() => undefined);
    return result;
  }
}

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface FetchOptions {
  headers?: Record<string, string>;
  method?: "GET" | "POST";
  body?: string;
  /** Statuses that are an answer, not a failure (e.g. Scryfall's 404 for "no cards matched"). */
  acceptStatuses?: number[];
  retries?: number;
  timeoutMs?: number;
}

export const fetchText = async (
  url: string,
  throttle: Throttle,
  options: FetchOptions = {}
): Promise<{ status: number; text: string }> => {
  const { retries = 3, timeoutMs = 30_000 } = options;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await throttle.run(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(url, {
            method: options.method ?? "GET",
            headers: { "User-Agent": USER_AGENT, ...options.headers },
            body: options.body,
            signal: controller.signal,
          });
          const text = await response.text();
          if (!response.ok && !options.acceptStatuses?.includes(response.status)) {
            throw new HttpError(response.status, `${response.status} from ${url}: ${text.slice(0, 200)}`);
          }
          return { status: response.status, text };
        } finally {
          clearTimeout(timer);
        }
      });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 0;
      const transient = status === 0 || status === 429 || status >= 500;
      if (!transient || attempt >= retries) throw error;
      const delay = 1_000 * 4 ** attempt;
      console.warn(`[api] ${url} failed (${String(error)}); retrying in ${delay / 1000}s`);
      await sleep(delay);
    }
  }
};

export const fetchJson = async <T>(
  url: string,
  throttle: Throttle,
  options: FetchOptions = {}
): Promise<{ status: number; body: T }> => {
  const { status, text } = await fetchText(url, throttle, {
    ...options,
    headers: { Accept: "application/json", ...options.headers },
  });
  return { status, body: JSON.parse(text) as T };
};
