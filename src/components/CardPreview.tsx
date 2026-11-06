import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import type { Card } from "../lib/types";
import { useFloatingPosition } from "./Tooltip";

// One shared hover preview for every card on the page (hundreds of cards, one popup).
// Like limitedgrades.com, it appears under the card name once the image has loaded.

interface PreviewState {
  card: Card;
  anchor: HTMLElement;
}

let state: PreviewState | null = null;
const listeners = new Set<() => void>();
const loadedUrls = new Set<string>();
let suspended = false;

const emit = () => listeners.forEach((listener) => listener());

const canHover = (): boolean => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

export const preview = {
  show(card: Card, anchor: HTMLElement) {
    if (suspended || !canHover()) return;
    state = { card, anchor };
    emit();
  },
  hide(anchor?: HTMLElement) {
    if (!state || (anchor && state.anchor !== anchor)) return;
    state = null;
    emit();
  },
  /** While dragging, previews would just get in the way. */
  suspend(value: boolean) {
    suspended = value;
    if (value) preview.hide();
  },
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const CardPreviewLayer = () => {
  const current = useSyncExternalStore(subscribe, () => state);
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [, forceRender] = useState(0);
  const card = current?.card;
  const urls = card ? [card.cardUrl, card.cardBackUrl].filter(Boolean) : [];
  const ready = urls.length > 0 && urls.every((url) => loadedUrls.has(url));
  const position = useFloatingPosition(ready ? current?.anchor ?? null : null, box, "bottom-start", [card?.name]);

  // Hide when the page scrolls, or when the pointer is no longer on the card (including when the
  // card itself moved away under a still pointer, e.g. after a keyboard shortcut).
  useEffect(() => {
    if (!current) return undefined;
    const hide = () => preview.hide();
    const onMove = (event: PointerEvent) => {
      if (!current.anchor.isConnected || !current.anchor.contains(event.target as Node)) preview.hide();
    };
    const check = window.setInterval(() => !current.anchor.isConnected && preview.hide(), 250);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("pointermove", onMove, true);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("pointermove", onMove, true);
      window.clearInterval(check);
    };
  }, [current]);

  if (!current || !card) return null;
  return createPortal(
    <>
      {!ready && (
        <div className="hidden">
          {urls.map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              onLoad={() => {
                loadedUrls.add(url);
                forceRender((n) => n + 1);
              }}
              onError={() => {
                loadedUrls.add(url);
                forceRender((n) => n + 1);
              }}
            />
          ))}
        </div>
      )}
      {ready && (
        <div
          ref={setBox}
          className="pointer-events-none fixed z-50 flex"
          style={position ? { left: position.left, top: position.top } : { left: -9999, top: -9999 }}
        >
          {urls.map((url) => (
            <img
              key={url}
              src={url}
              alt={card.name}
              width={240}
              height={340}
              className="h-[340px] w-[240px] rounded-[12px] shadow-xl"
            />
          ))}
        </div>
      )}
    </>,
    document.body
  );
};
