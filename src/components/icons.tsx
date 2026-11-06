import clsx from "clsx";
import { useId, type ReactNode, type SVGProps } from "react";

import { MANA_GLYPHS } from "../lib/manaGlyphs";
import { TRANSITION_CLASSES } from "../lib/styles";
import { Color, Rarity, type SetIconData } from "../lib/types";

// ---- Mana symbols (glyphs from the Mana font on colored discs, as on limitedgrades.com) ----

const DISC_COLORS: Record<Exclude<Color, "multicolor">, string> = {
  [Color.WHITE]: "#f0f2c0",
  [Color.BLUE]: "#b5cde3",
  [Color.BLACK]: "#aca29a",
  [Color.RED]: "#db8664",
  [Color.GREEN]: "#93b483",
  [Color.COLORLESS]: "#beb9b2",
};

const GLYPH_KEYS: Record<Exclude<Color, "multicolor">, string> = {
  [Color.WHITE]: "w",
  [Color.BLUE]: "u",
  [Color.BLACK]: "b",
  [Color.RED]: "r",
  [Color.GREEN]: "g",
  [Color.COLORLESS]: "c",
};

export const COLOR_NAMES: Record<Color, string> = {
  [Color.WHITE]: "White",
  [Color.BLUE]: "Blue",
  [Color.BLACK]: "Black",
  [Color.RED]: "Red",
  [Color.GREEN]: "Green",
  [Color.MULTICOLOR]: "Multicolor",
  [Color.COLORLESS]: "Colorless",
};

const MulticolorIcon = ({ className }: { className?: string }) => {
  const id = useId();
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label="Multicolor">
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="74.98" y1="437.02" x2="437.02" y2="74.98">
          <stop offset="0" stopColor="#cca651" />
          <stop offset="0.2878" stopColor="#d2b36f" />
          <stop offset="0.5" stopColor="#e2d7c3" />
          <stop offset="0.7122" stopColor="#d2b36f" />
          <stop offset="1" stopColor="#cca651" />
        </linearGradient>
      </defs>
      <circle fill={`url(#${id})`} cx="256" cy="256" r="256" />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M256 60.5C148.03 60.5 60.5 148.03 60.5 256S148.03 451.5 256 451.5 451.5 363.97 451.5 256 363.97 60.5 256 60.5zm0 335.5c-77.32 0-140-62.68-140-140s62.68-140 140-140 140 62.68 140 140-62.68 140-140 140z"
      />
    </svg>
  );
};

export const ColorIcon = ({ color, className }: { color: Color; className?: string }) => {
  const classes = clsx(
    "inline-block size-[1.375em] shrink-0 rounded-full border-[0.0625em] border-neutral-300 text-black dark:border-black",
    TRANSITION_CLASSES,
    className
  );
  if (color === Color.MULTICOLOR) return <MulticolorIcon className={classes} />;
  const glyph = MANA_GLYPHS[GLYPH_KEYS[color]]!;
  return (
    <svg viewBox="0 0 32 32" className={classes} role="img" aria-label={COLOR_NAMES[color]}>
      <circle cx="16" cy="16" r="16" fill={DISC_COLORS[color]} />
      <svg x="3.2" y="3.2" width="25.6" height="25.6" viewBox={glyph.viewBox}>
        {glyph.paths.map((d) => (
          <path key={d.slice(0, 24)} d={d} fill="currentColor" />
        ))}
      </svg>
    </svg>
  );
};

export const GlyphIcon = ({ name, className }: { name: string; className?: string }) => {
  const glyph = MANA_GLYPHS[name]!;
  return (
    <svg
      viewBox={glyph.viewBox}
      width="1.15714286em"
      height="0.9em"
      className={clsx("paint-order-stroke stroke-neutral-300 dark:stroke-black", TRANSITION_CLASSES, className)}
    >
      {glyph.paths.map((d) => (
        <path key={d.slice(0, 24)} d={d} fill="currentColor" />
      ))}
    </svg>
  );
};

// ---- Set symbols, painted in rarity gradients ----

const RARITY_ICON_CLASSES: Record<Rarity, string> = {
  [Rarity.COMMON]: "",
  [Rarity.UNCOMMON]: "icon-uncommon",
  [Rarity.RARE]: "icon-rare",
  [Rarity.MYTHIC]: "icon-mythic",
};

// A plain card-stack symbol for "sets" with no symbol of their own (cubes).
const FALLBACK_ICON: SetIconData = {
  viewBox: "0 0 32 32",
  paths: [
    "M9 4h14a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm1.5 3v18h11V7z",
    "M3 8h2v18a1 1 0 0 0 1 1h0v2a3 3 0 0 1-3-3zM29 8h-2v18a1 1 0 0 1-1 1h0v2a3 3 0 0 0 3-3z",
  ],
};

export const SetIcon = ({
  data,
  rarity,
  className,
}: {
  data: SetIconData | null | undefined;
  rarity?: Rarity;
  className?: string;
}) => {
  const id = useId();
  const icon = data ?? FALLBACK_ICON;
  return (
    <svg
      viewBox={icon.viewBox}
      width="1.28571429em"
      height="1em"
      fill={`url(#${id})`}
      className={clsx(
        "paint-order-stroke stroke-neutral-300 dark:stroke-black",
        rarity && RARITY_ICON_CLASSES[rarity],
        TRANSITION_CLASSES,
        className
      )}
      style={{ strokeWidth: "1px" }}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" className="icon-side-stop" />
          <stop offset="50%" className="icon-middle-stop" />
          <stop offset="100%" className="icon-side-stop" />
        </linearGradient>
      </defs>
      {icon.paths.map((d) => (
        <path key={d.slice(0, 32)} d={d} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
};

/** A set's symbol straight from Scryfall's CDN (for lists of many sets). */
export const SetIconImage = ({ code, className }: { code: string | null; className?: string }) =>
  code ? (
    <img
      src={`https://svgs.scryfall.io/sets/${code}.svg`}
      alt=""
      className={clsx("inline-block h-[1em] w-[1.28em] object-contain dark:invert", className)}
      onError={(event) => {
        event.currentTarget.style.visibility = "hidden";
      }}
    />
  ) : (
    <SetIcon data={null} className={className} />
  );

// ---- Interface icons (simple strokes, 1em) ----

const Stroke = ({ children, className, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className={clsx("inline-block shrink-0", className)}
    {...props}
  >
    {children}
  </svg>
);

type IconProps = { className?: string };

export const InfoIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" className={clsx("inline-block", className)} aria-hidden>
    <circle cx="12" cy="12" r="11" fill="currentColor" />
    <path d="M12 10.5v6.5M12 7v.01" stroke="white" strokeWidth={2.6} strokeLinecap="round" className="dark:stroke-neutral-900" />
  </svg>
);
export const SunIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <circle cx="12" cy="12" r="4.5" fill="currentColor" />
    <path d="M12 1.5v2.5M12 20v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M1.5 12H4M20 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
  </Stroke>
);
export const MoonIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" className={clsx("inline-block", className)} aria-hidden>
    <path fill="currentColor" d="M21 14.6A9 9 0 1 1 9.4 3a7.2 7.2 0 0 0 11.6 11.6z" />
  </svg>
);
export const ChevronDownIcon = ({ className }: IconProps) => (
  <Stroke className={className} strokeWidth={3}>
    <path d="m5 9 7 7 7-7" />
  </Stroke>
);
export const SearchIcon = ({ className }: IconProps) => (
  <Stroke className={className} strokeWidth={3}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 5.5 5.5" />
  </Stroke>
);
export const CloseIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Stroke>
);
export const RotateIcon = ({ className, flip }: IconProps & { flip?: boolean }) => (
  <Stroke className={clsx(className, flip && "-scale-x-100")}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 4v7h-7" />
  </Stroke>
);
export const UndoIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Stroke>
);
export const RedoIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
  </Stroke>
);
export const DownloadIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </Stroke>
);
export const UploadIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M12 21V9m0 0-4.5 4.5M12 9l4.5 4.5M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" />
  </Stroke>
);
export const PlusIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M12 5v14M5 12h14" />
  </Stroke>
);
export const CopyIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </Stroke>
);
export const TrashIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3" />
  </Stroke>
);
export const PencilIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
  </Stroke>
);
export const BoltIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" className={clsx("inline-block", className)} aria-hidden>
    <path fill="currentColor" d="M13 2 4 14h7l-1 8 9-12h-7z" />
  </svg>
);
export const GridIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M3 4h18v16H3zM3 9h18M8 4v16M13 4v16M18 4v16" />
  </Stroke>
);
export const RowsIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M3 4h18v16H3zM3 9.5h18M3 15h18M7.5 4v16" />
  </Stroke>
);
export const ImageIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <path d="M8 6h8v6H8z" />
  </Stroke>
);
export const TextIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M4 6h16M4 12h11M4 18h14" />
  </Stroke>
);
export const SwapIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M7 4 3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7" />
  </Stroke>
);
export const CheckIcon = ({ className }: IconProps) => (
  <Stroke className={className} strokeWidth={3}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Stroke>
);
export const ExternalIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M14 4h6v6M20 4 11 13M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Stroke>
);
export const KeyboardIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 15.5h6" />
  </Stroke>
);
export const DotsIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" className={clsx("inline-block", className)} aria-hidden>
    <circle cx="5" cy="12" r="2" fill="currentColor" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <circle cx="19" cy="12" r="2" fill="currentColor" />
  </svg>
);
export const EyeIcon = ({ className, off }: IconProps & { off?: boolean }) => (
  <Stroke className={className}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </Stroke>
);
export const WarningIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" className={clsx("inline-block", className)} aria-hidden>
    <circle cx="12" cy="12" r="11" fill="currentColor" />
    <path d="M12 6.5v7M12 17v.01" stroke="white" strokeWidth={2.6} strokeLinecap="round" className="dark:stroke-neutral-900" />
  </svg>
);
export const CompareIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <rect x="3" y="4" width="7.5" height="16" rx="1.5" />
    <rect x="13.5" y="4" width="7.5" height="16" rx="1.5" />
  </Stroke>
);
export const ListIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
  </Stroke>
);
export const ArrowUpIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Stroke>
);
export const ArrowDownIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Stroke>
);
export const RefreshIcon = ({ className }: IconProps) => (
  <Stroke className={className}>
    <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" />
  </Stroke>
);
export const StarIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" className={clsx("inline-block", className)} aria-hidden>
    <path fill="currentColor" d="m12 2 2.9 6.6 7.1.6-5.4 4.7 1.6 7.1L12 17.3 5.8 21l1.6-7.1L2 9.2l7.1-.6z" />
  </svg>
);
