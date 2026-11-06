import { useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Puts a floating box next to an anchor element, flipping and clamping to stay on screen. */
export const useFloatingPosition = (
  anchor: HTMLElement | null,
  floating: HTMLElement | null,
  placement: "bottom-start" | "right-start" = "bottom-start",
  deps: unknown[] = []
): { left: number; top: number } | null => {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (!anchor || !floating) {
      setPosition(null);
      return;
    }
    const a = anchor.getBoundingClientRect();
    const f = floating.getBoundingClientRect();
    const margin = 6;
    let left: number;
    let top: number;
    if (placement === "right-start") {
      left = a.right + margin;
      if (left + f.width > window.innerWidth - margin) left = a.left - f.width - margin;
      top = a.top;
    } else {
      left = a.left;
      top = a.bottom + margin;
      if (top + f.height > window.innerHeight - margin) top = a.top - f.height - margin;
    }
    left = Math.max(margin, Math.min(left, window.innerWidth - f.width - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - f.height - margin));
    setPosition({ left, top });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, floating, placement, ...deps]);
  return position;
};

/** A small hover tooltip (the site uses Tippy for these). */
const Tooltip = ({ content, children }: { content: ReactNode; children: ReactElement }) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const timer = useRef<number>();
  const position = useFloatingPosition(anchor, box);

  return (
    <span
      className="inline-block"
      onMouseEnter={(event) => {
        const target = event.currentTarget;
        timer.current = window.setTimeout(() => setAnchor(target), 150);
      }}
      onMouseLeave={() => {
        window.clearTimeout(timer.current);
        setAnchor(null);
      }}
    >
      {children}
      {anchor &&
        createPortal(
          <div
            ref={setBox}
            role="tooltip"
            className="pointer-events-none fixed z-50 max-w-sm rounded bg-neutral-800 p-2 text-sm text-white shadow-lg"
            style={position ? { left: position.left, top: position.top } : { left: -9999, top: -9999 }}
          >
            {content}
          </div>,
          document.body
        )}
    </span>
  );
};

export default Tooltip;
