import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

import { getSetPayload, NotFoundError } from "./setData.ts";

// The app's only backend: GET /api/set/:code returns the set's draftable cards with 17Lands grades
// merged in. Mounted into Vite's dev and preview servers, so `npm run dev` is all it takes.

const send = (res: ServerResponse, status: number, body: unknown): void => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
};

const handle = async (req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (!url.pathname.startsWith("/api/")) {
    next();
    return;
  }
  const match = /^\/api\/set\/([a-z0-9]+)$/i.exec(url.pathname);
  if (req.method !== "GET" || !match) {
    send(res, 404, { error: "Not found" });
    return;
  }
  try {
    const payload = await getSetPayload(match[1]!, {
      refresh: url.searchParams.get("refresh") === "1",
      include17Lands: process.env.INCLUDE_17LANDS !== "0",
    });
    send(res, 200, payload);
  } catch (error) {
    if (error instanceof NotFoundError) {
      send(res, 404, { error: error.message });
    } else {
      console.error("[api] failed:", error);
      send(res, 502, { error: error instanceof Error ? error.message : String(error) });
    }
  }
};

export const apiPlugin = (): Plugin => ({
  name: "limited-grades-api",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      void handle(req, res, next);
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      void handle(req, res, next);
    });
  },
});
