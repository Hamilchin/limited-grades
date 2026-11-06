import clsx from "clsx";
import { useEffect, useRef, type ReactNode } from "react";

import { HOVER_CLASSES, TRANSITION_CLASSES } from "../lib/styles";
import { CloseIcon } from "./icons";

export const Center = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={clsx("grid place-items-center", className)}>{children}</div>
);

export const LinkOut = ({ url, children, className }: { url: string; children: ReactNode; className?: string }) => (
  <a
    href={url}
    target="_blank"
    rel="noreferrer"
    className={clsx("underline", HOVER_CLASSES, TRANSITION_CLASSES, className)}
  >
    {children}
  </a>
);

export const Spinner = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 101"
    width="1em"
    height="1em"
    className={clsx("animate-spin fill-blue-500 text-neutral-200 dark:fill-amber-600 dark:text-neutral-600", className)}
    aria-label="Loading"
  >
    <path
      fill="currentColor"
      d="M100 50.59c0 27.615-22.386 50.001-50 50.001s-50-22.386-50-50 22.386-50 50-50 50 22.386 50 50zm-90.919 0c0 22.6 18.32 40.92 40.919 40.92 22.599 0 40.919-18.32 40.919-40.92 0-22.598-18.32-40.918-40.919-40.918-22.599 0-40.919 18.32-40.919 40.919z"
    />
    <path d="M93.968 39.04c2.425-.636 3.894-3.128 3.04-5.486A50 50 0 0041.735 1.279c-2.474.414-3.922 2.919-3.285 5.344.637 2.426 3.12 3.849 5.6 3.484a40.916 40.916 0 0144.131 25.769c.902 2.34 3.361 3.802 5.787 3.165z" />
  </svg>
);

/** Animates open and closed by height (as on limitedgrades.com). */
export const Collapsible = ({
  isExpanded,
  className,
  children,
}: {
  isExpanded: boolean;
  className?: string;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const initiallyCollapsed = useRef(!isExpanded);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (isExpanded) {
      element.style.removeProperty("display");
      element.style.maxHeight = `${element.scrollHeight}px`;
      initiallyCollapsed.current = false;
    } else {
      element.style.maxHeight = `${element.scrollHeight}px`;
      void element.scrollHeight;
      element.style.overflow = "hidden";
      element.style.maxHeight = "0";
    }
  }, [isExpanded]);

  return (
    <div
      ref={ref}
      className={clsx("transition-[max-height]", className)}
      style={initiallyCollapsed.current ? { maxHeight: 0, overflow: "hidden", display: "none" } : undefined}
      onTransitionEnd={(event) => {
        const element = ref.current;
        if (!element || event.target !== element) return;
        if (isExpanded) {
          element.style.removeProperty("max-height");
          element.style.removeProperty("overflow");
        } else {
          element.style.display = "none";
        }
      }}
    >
      {children}
    </div>
  );
};

export const Banner = ({
  children,
  onClose,
  tone = "info",
}: {
  children: ReactNode;
  onClose?: () => void;
  tone?: "info" | "warning";
}) => (
  <div
    className={clsx(
      "mb-2 flex items-center gap-2 rounded-lg px-3 py-2 lg:px-4",
      tone === "warning"
        ? "bg-amber-400/20 text-neutral-900 dark:bg-amber-600/20 dark:text-neutral-100"
        : "bg-neutral-100 dark:bg-neutral-800",
      TRANSITION_CLASSES
    )}
  >
    <div className="grow">{children}</div>
    {onClose && (
      <button type="button" onClick={onClose} aria-label="Close banner" className={clsx("text-xl", HOVER_CLASSES)}>
        <CloseIcon />
      </button>
    )}
  </div>
);

/** Small key-cap label for shortcut hints. */
export const Kbd = ({ children, className }: { children: ReactNode; className?: string }) => (
  <kbd
    className={clsx(
      "inline-block min-w-[1.5em] rounded border border-neutral-300 bg-neutral-100 px-1 text-center font-mono text-xs leading-5 text-neutral-700",
      "dark:border-black dark:bg-neutral-800 dark:text-neutral-200",
      className
    )}
  >
    {children}
  </kbd>
);
