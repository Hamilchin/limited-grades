import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

import type { Anchor } from "../../lib/tierModel";
import { preview } from "../CardPreview";

// Drag and drop for tier lists, written for this board rather than taken from a library:
// - In the grid layout a card can only go in its own color's column, so the drop snaps to that
//   column in whatever tier row is under the pointer. You just move up and down.
// - An insertion line shows exactly where the card will land. The board doesn't re-render while
//   dragging: the ghost, line and target frame are plain DOM nodes moved on animation frames.
// - The page and the unranked panel scroll when you drag near their edges.
// - Mouse drags start after a few pixels; touch drags after a short press, so scrolling still works.
// - Escape cancels. After a drop the card slides from the ghost into its new place.
//
// Markup it expects:
//   [data-card="name"][data-color="white"]       a draggable card
//   [data-tier-row="tierId"]                      a tier's row
//   [data-drop="tierId"][data-color="white"]      where a tier's cards sit (per color in the grid)
//   [data-drop="__pool"]                          the unranked panel, scrolling in [data-scroll]

export const POOL_ID = "__pool";

export interface DropTarget {
  tierId: string | null;
  anchor: Anchor;
}

export interface DragOptions {
  /** Grid: a vertical list per color column. Rows: one wrapping line of cards per tier. */
  layout: "grid" | "rows";
  /** Cards wrap within their container (image cards). */
  flow: boolean;
  onDrop: (name: string, target: DropTarget) => void;
  enabled: boolean;
}

interface Session {
  name: string;
  color: string;
  source: HTMLElement;
  pointerId: number;
  touch: boolean;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
  dragging: boolean;
  touchTimer?: number;
  ghost?: HTMLElement;
  line?: HTMLElement;
  frame?: HTMLElement;
  target: DropTarget | null;
  raf?: number;
}

interface Resolved {
  target: DropTarget;
  container: HTMLElement;
  line: DOMRect | null;
}

const EDGE = 72;

const visibleCards = (container: HTMLElement, exclude: HTMLElement): HTMLElement[] =>
  [...container.querySelectorAll<HTMLElement>("[data-card]")].filter((el) => el !== exclude && el.offsetParent !== null);

const overlay = (className: string): HTMLElement => {
  const el = document.createElement("div");
  el.className = className;
  Object.assign(el.style, { position: "fixed", pointerEvents: "none", zIndex: "60", left: "0", top: "0", display: "none" });
  document.body.appendChild(el);
  return el;
};

const place = (el: HTMLElement, rect: DOMRect | null) => {
  if (!rect) {
    el.style.display = "none";
    return;
  }
  Object.assign(el.style, {
    display: "block",
    transform: `translate(${rect.left}px, ${rect.top}px)`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
};

/** After a drop, slide the card from where the ghost was into its new spot. */
const settle = (name: string, from: DOMRect) => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-card="${CSS.escape(name)}"]`);
      if (!el) return;
      const to = el.getBoundingClientRect();
      el.animate(
        [
          { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)`, boxShadow: "0 10px 25px rgb(0 0 0 / 0.3)" },
          { transform: "translate(0, 0)", boxShadow: "0 0 0 rgb(0 0 0 / 0)" },
        ],
        { duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" }
      );
    })
  );
};

class DragEngine {
  options: DragOptions;
  #session: Session | null = null;
  #scrollFrame = 0;

  constructor(options: DragOptions) {
    this.options = options;
  }

  get dragging(): boolean {
    return Boolean(this.#session?.dragging);
  }

  onPointerDown = (event: ReactPointerEvent) => {
    if (!this.options.enabled || event.button !== 0 || this.#session) return;
    const element = event.target as HTMLElement;
    if (element.closest("input, textarea, select, [data-no-drag]")) return;
    const card = element.closest<HTMLElement>("[data-card]");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const session: Session = {
      name: card.dataset.card!,
      color: card.dataset.color ?? "",
      source: card,
      pointerId: event.pointerId,
      touch: event.pointerType === "touch",
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      x: event.clientX,
      y: event.clientY,
      dragging: false,
      target: null,
    };
    this.#session = session;
    window.addEventListener("pointermove", this.#onMove);
    window.addEventListener("pointerup", this.#onUp);
    window.addEventListener("pointercancel", this.#onCancel);
    window.addEventListener("keydown", this.#onKey, true);
    window.addEventListener("touchmove", this.#blockTouch, { passive: false });
    if (session.touch) {
      session.touchTimer = window.setTimeout(() => {
        if (this.#session === session && !session.dragging) this.#begin(session);
      }, 260);
    }
  };

  dispose() {
    this.#finish(false);
  }

  #onMove = (event: PointerEvent) => {
    const s = this.#session;
    if (!s || event.pointerId !== s.pointerId) return;
    s.x = event.clientX;
    s.y = event.clientY;
    if (!s.dragging) {
      const moved = Math.hypot(s.x - s.startX, s.y - s.startY);
      if (s.touch) {
        if (moved > 8) this.#finish(false);
        return;
      }
      if (moved < 5) return;
      this.#begin(s);
    }
    this.#schedule();
  };

  #onUp = (event: PointerEvent) => {
    if (this.#session && event.pointerId === this.#session.pointerId) this.#finish(true);
  };

  #onCancel = () => this.#finish(false);

  #onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && this.#session?.dragging) {
      event.preventDefault();
      event.stopPropagation();
      this.#finish(false);
    }
  };

  #blockTouch = (event: TouchEvent) => {
    if (this.#session?.dragging) event.preventDefault();
  };

  #begin(s: Session) {
    s.dragging = true;
    const rect = s.source.getBoundingClientRect();
    const ghost = s.source.cloneNode(true) as HTMLElement;
    ghost.removeAttribute("data-card");
    Object.assign(ghost.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: "0",
      zIndex: "61",
      pointerEvents: "none",
      boxShadow: "0 12px 28px rgb(0 0 0 / 0.35)",
      opacity: "0.96",
      transition: "none",
    });
    document.body.appendChild(ghost);
    s.ghost = ghost;
    s.frame = overlay("rounded-md ring-2 ring-blue-500/60 bg-blue-500/5 dark:ring-amber-600/70 dark:bg-amber-600/5");
    s.line = overlay(
      "rounded-full bg-blue-500 shadow-[0_0_6px_rgb(59_130_246/0.8)] dark:bg-amber-600 dark:shadow-[0_0_6px_rgb(217_119_6/0.8)]"
    );
    s.source.classList.add("lg-drag-source");
    document.body.classList.add("lg-dragging");
    preview.suspend(true);
    if (s.touch) navigator.vibrate?.(10);
    this.#update();
    this.#scrollFrame = requestAnimationFrame(this.#autoScroll);
  }

  #finish(drop: boolean) {
    const s = this.#session;
    if (!s) return;
    this.#session = null;
    window.clearTimeout(s.touchTimer);
    if (s.raf !== undefined) cancelAnimationFrame(s.raf);
    cancelAnimationFrame(this.#scrollFrame);
    window.removeEventListener("pointermove", this.#onMove);
    window.removeEventListener("pointerup", this.#onUp);
    window.removeEventListener("pointercancel", this.#onCancel);
    window.removeEventListener("keydown", this.#onKey, true);
    window.removeEventListener("touchmove", this.#blockTouch);
    if (!s.dragging) return;
    const ghostRect = s.ghost!.getBoundingClientRect();
    s.ghost!.remove();
    s.line!.remove();
    s.frame!.remove();
    s.source.classList.remove("lg-drag-source");
    document.body.classList.remove("lg-dragging");
    preview.suspend(false);
    // The click that follows a drag isn't a click.
    const swallow = (event: MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
    };
    window.addEventListener("click", swallow, { capture: true, once: true });
    window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
    if (drop) {
      // The pointer may have moved since the last frame.
      const resolved = this.#resolve(s);
      if (resolved) {
        this.options.onDrop(s.name, resolved.target);
        settle(s.name, ghostRect);
      }
    }
  }

  #schedule() {
    const s = this.#session;
    if (s && s.raf === undefined) s.raf = requestAnimationFrame(this.#update);
  }

  #update = () => {
    const s = this.#session;
    if (!s?.dragging) return;
    s.raf = undefined;
    s.ghost!.style.transform = `translate(${s.x - s.offsetX}px, ${s.y - s.offsetY}px) rotate(-1.5deg)`;
    const resolved = this.#resolve(s);
    s.target = resolved?.target ?? null;
    const c = resolved?.container.getBoundingClientRect();
    place(s.frame!, c ? new DOMRect(c.left - 2, c.top - 2, c.width + 4, c.height + 4) : null);
    place(s.line!, resolved?.line ?? null);
  };

  #autoScroll = () => {
    const s = this.#session;
    if (!s?.dragging) return;
    this.#scrollFrame = requestAnimationFrame(this.#autoScroll);
    const panel = document.querySelector<HTMLElement>(`[data-drop="${POOL_ID}"] [data-scroll]`);
    const r = panel?.getBoundingClientRect();
    if (panel && r && s.x >= r.left && s.x <= r.right && s.y >= r.top - 24 && s.y <= r.bottom + 24) {
      const up = s.y - r.top;
      const down = r.bottom - s.y;
      if (up < 48) panel.scrollTop -= Math.ceil((1 - Math.max(0, up) / 48) * 14);
      else if (down < 48) panel.scrollTop += Math.ceil((1 - Math.max(0, down) / 48) * 14);
      else return;
      this.#schedule();
      return;
    }
    const top = s.y;
    const bottom = window.innerHeight - s.y;
    if (top < EDGE) window.scrollBy(0, -Math.ceil((1 - Math.max(0, top) / EDGE) * 22));
    else if (bottom < EDGE) window.scrollBy(0, Math.ceil((1 - Math.max(0, bottom) / EDGE) * 22));
    else return;
    this.#schedule();
  };

  #resolve(s: Session): Resolved | null {
    const { layout, flow } = this.options;
    const vertical = layout === "grid" && !flow;
    const hits = document.elementsFromPoint(s.x, s.y) as HTMLElement[];
    const pool = hits.map((el) => el.closest<HTMLElement>(`[data-drop="${POOL_ID}"]`)).find(Boolean);
    if (pool) return { target: { tierId: null, anchor: null }, container: pool, line: null };

    let row = hits.map((el) => el.closest<HTMLElement>("[data-tier-row]")).find(Boolean) ?? null;
    if (!row) {
      // Between rows or just beside the board: take the nearest row level with the pointer.
      const rows = [...document.querySelectorAll<HTMLElement>("[data-tier-row]")];
      const board = rows[0]?.parentElement?.getBoundingClientRect();
      if (!board || s.x < board.left - 40 || s.x > board.right + 40) return null;
      let best: { el: HTMLElement; distance: number } | null = null;
      for (const el of rows) {
        const r = el.getBoundingClientRect();
        const distance = s.y < r.top ? r.top - s.y : s.y > r.bottom ? s.y - r.bottom : 0;
        if (!best || distance < best.distance) best = { el, distance };
      }
      if (!best || best.distance > 60) return null;
      row = best.el;
    }
    const tierId = row.dataset.tierRow!;
    const container =
      layout === "grid"
        ? row.querySelector<HTMLElement>(`[data-drop][data-color="${s.color}"]`)
        : row.querySelector<HTMLElement>("[data-drop]");
    if (!container) return null;

    const items = visibleCards(container, s.source);
    const before =
      items.find((el) => {
        const r = el.getBoundingClientRect();
        return vertical ? r.top + r.height / 2 > s.y : s.y < r.top || (s.y <= r.bottom && s.x < r.left + r.width / 2);
      }) ?? null;
    const last = items[items.length - 1] ?? null;
    const anchor: Anchor = before ? { before: before.dataset.card! } : last ? { after: last.dataset.card! } : null;

    const c = container.getBoundingClientRect();
    let line: DOMRect;
    if (vertical) {
      const y = before ? before.getBoundingClientRect().top - 2 : last ? last.getBoundingClientRect().bottom + 2 : c.top + 6;
      line = new DOMRect(c.left + 3, y - 1.5, c.width - 6, 3);
    } else {
      const ref = before ?? last;
      if (ref) {
        const r = ref.getBoundingClientRect();
        line = new DOMRect((before ? r.left - 3 : r.right + 3) - 1.5, r.top, 3, r.height);
      } else {
        line = new DOMRect(c.left + 6, c.top + 6, 3, Math.max(16, Math.min(32, c.height - 12)));
      }
    }
    return { target: { tierId, anchor }, container, line };
  }
}

export const useDragEngine = (options: DragOptions): DragEngine => {
  const engine = useRef<DragEngine | null>(null);
  if (!engine.current) engine.current = new DragEngine(options);
  engine.current.options = options;
  useEffect(() => () => engine.current?.dispose(), []);
  return engine.current;
};
