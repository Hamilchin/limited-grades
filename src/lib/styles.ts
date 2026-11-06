import type { Grade } from "./types";

export const HOVER_CLASSES = "hover:text-blue-500 dark:hover:text-amber-600";
export const TRANSITION_CLASSES = "transition-colors";

// Written out in full so Tailwind finds them.
export const GRADE_BG_COLORS: Record<Grade, string> = {
  "A+": "bg-A+",
  A: "bg-A",
  "A-": "bg-A-",
  "B+": "bg-B+",
  B: "bg-B",
  "B-": "bg-B-",
  "C+": "bg-C+",
  C: "bg-C",
  "C-": "bg-C-",
  "D+": "bg-D+",
  D: "bg-D",
  "D-": "bg-D-",
  F: "bg-F",
};

export const GRADE_BORDER_COLORS: Record<Grade, string> = {
  "A+": "border-A+",
  A: "border-A",
  "A-": "border-A-",
  "B+": "border-B+",
  B: "border-B",
  "B-": "border-B-",
  "C+": "border-C+",
  C: "border-C",
  "C-": "border-C-",
  "D+": "border-D+",
  D: "border-D",
  "D-": "border-D-",
  F: "border-F",
};

export const HEADER_BG_CLASSES = "bg-neutral-200 dark:bg-neutral-600";

/** The site's search button look, for toolbar buttons. */
export const BUTTON_CLASSES =
  "inline-flex items-center justify-center gap-1.5 rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm " +
  "hover:border-blue-500 hover:bg-blue-500 hover:text-white disabled:pointer-events-none disabled:opacity-40 " +
  "dark:border-black dark:bg-neutral-700 dark:hover:border-amber-600 dark:hover:bg-amber-600 " +
  TRANSITION_CLASSES;

export const PRIMARY_BUTTON_CLASSES =
  "inline-flex items-center justify-center gap-1.5 rounded border border-blue-500 bg-blue-500 px-3 py-1.5 text-sm font-medium text-white " +
  "hover:bg-blue-600 disabled:pointer-events-none disabled:opacity-40 " +
  "dark:border-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 " +
  TRANSITION_CLASSES;

export const INPUT_CLASSES =
  "rounded border border-neutral-300 bg-white px-2 py-1.5 outline-none focus:border-blue-500 " +
  "dark:border-black dark:bg-neutral-700 dark:focus:border-amber-600 " +
  TRANSITION_CLASSES;
