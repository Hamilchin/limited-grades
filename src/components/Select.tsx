import clsx from "clsx";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

import { normalizeName } from "../lib/names";
import { TRANSITION_CLASSES } from "../lib/styles";
import { ChevronDownIcon } from "./icons";

interface Props<T> {
  value: T | undefined;
  options: T[];
  getKey: (option: T) => string;
  getLabel: (option: T) => string;
  onChange: (option: T) => void;
  renderIcon?: (option: T) => ReactNode;
  /** Shown above an option, e.g. to group them. */
  renderGroupHeading?: (option: T, index: number) => ReactNode;
  inputId?: string;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  /** Wider menu than the control. */
  menuClassName?: string;
}

/** A searchable single-select that looks like the react-select controls on limitedgrades.com. */
const Select = <T,>({
  value,
  options,
  getKey,
  getLabel,
  onChange,
  renderIcon,
  renderGroupHeading,
  inputId,
  className,
  placeholder = "Select…",
  ariaLabel,
  menuClassName,
}: Props<T>) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const listId = useId();

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = normalizeName(query);
    return options.filter((option) => normalizeName(getLabel(option)).includes(q));
  }, [options, query, getLabel]);

  const openMenu = () => {
    setOpen(true);
    const index = value === undefined ? 0 : options.findIndex((o) => getKey(o) === getKey(value));
    setActive(Math.max(0, index));
  };

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const choose = (option: T) => {
    onChange(option);
    close();
    input.current?.blur();
  };

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div ref={root} className={clsx("relative", className)}>
      <div
        className={clsx(
          "flex min-h-[38px] cursor-text items-center rounded border bg-white",
          "dark:bg-neutral-700",
          open
            ? "border-[#2684ff] shadow-[0_0_0_1px_#2684ff] dark:border-[#e78b09] dark:shadow-[0_0_0_1px_#e78b09]"
            : "border-[#ccc] hover:border-[#b3b3b3] dark:border-black dark:hover:border-[#e78b09]",
          "transition-[border-color,box-shadow,background-color] duration-150"
        )}
        onMouseDown={(event) => {
          if (event.target === input.current) return;
          event.preventDefault();
          input.current?.focus();
          if (open) close();
          else openMenu();
        }}
      >
        <div className="relative flex min-w-0 grow items-center px-2 py-0.5">
          {!query && value !== undefined && (
            <div className="pointer-events-none absolute inset-x-2 flex items-center gap-2 truncate">
              {renderIcon?.(value)}
              <span className={clsx("truncate", open && "opacity-50")}>{getLabel(value)}</span>
            </div>
          )}
          {!query && value === undefined && (
            <span className="pointer-events-none absolute inset-x-2 truncate text-neutral-400">{placeholder}</span>
          )}
          <input
            ref={input}
            id={inputId}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={ariaLabel}
            autoComplete="off"
            enterKeyHint="go"
            className="relative w-full bg-transparent py-1 text-transparent caret-current outline-none [&:not(:placeholder-shown)]:text-current"
            style={{ color: query ? undefined : "transparent" }}
            value={query}
            placeholder=" "
            onFocus={() => !open && openMenu()}
            onBlur={() => close()}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                if (!open) openMenu();
                else setActive((i) => Math.min(filtered.length - 1, i + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (event.key === "Enter") {
                event.preventDefault();
                const option = filtered[active];
                if (open && option !== undefined) choose(option);
                else openMenu();
              } else if (event.key === "Escape" && open) {
                event.preventDefault();
                event.stopPropagation();
                close();
              } else if (event.key === "Tab" && open) {
                close();
              }
            }}
          />
        </div>
        <span className="my-2 w-px self-stretch bg-[#ccc] dark:bg-[#333]" />
        <span
          className={clsx(
            "cursor-pointer px-2 text-[#ccc] hover:text-[#999] dark:text-[#333] dark:hover:text-neutral-400",
            TRANSITION_CLASSES
          )}
        >
          <ChevronDownIcon className="text-[15px]" />
        </span>
      </div>
      {open && (
        <div
          ref={menu}
          id={listId}
          role="listbox"
          className={clsx(
            "absolute left-0 z-30 mt-2 max-h-[300px] min-w-full overflow-y-auto rounded bg-white py-1 shadow-[0_0_0_1px_hsla(0,0%,0%,0.1),0_4px_11px_hsla(0,0%,0%,0.1)]",
            "dark:bg-neutral-700 dark:shadow-[0_0_0_1px_hsla(0,0%,0%,0.6),0_4px_11px_hsla(0,0%,0%,0.4)]",
            menuClassName
          )}
          onMouseDown={(event) => event.preventDefault()}
        >
          {filtered.length === 0 && <div className="px-3 py-2 text-center text-neutral-400">No options</div>}
          {filtered.map((option, index) => {
            const selected = value !== undefined && getKey(option) === getKey(value);
            return (
              <div key={getKey(option)}>
                {renderGroupHeading?.(option, index)}
                <div
                  role="option"
                  aria-selected={selected}
                  data-index={index}
                  className={clsx(
                    "flex cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-2",
                    selected
                      ? "bg-[#2684ff] text-white dark:bg-[#e78b09]"
                      : index === active && "bg-[#deebff] dark:bg-[#d97706]"
                  )}
                  onMouseMove={() => index !== active && setActive(index)}
                  onClick={() => choose(option)}
                >
                  {renderIcon?.(option)}
                  <span>{getLabel(option)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Select;
