import clsx from "clsx";
import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

import { HOVER_CLASSES, TRANSITION_CLASSES } from "../lib/styles";
import { CloseIcon } from "./icons";

let openModals = 0;

/** True while any modal is open; keyboard shortcuts on the page stand down. */
export const isModalOpen = (): boolean => openModals > 0;

interface Props {
  title: ReactNode;
  onClose: () => void;
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** The site's modal: blurred backdrop, title bar with a close button, Escape closes. */
const Modal = ({ title, onClose, initialFocus, className, bodyClassName, children, footer }: Props) => {
  const panel = useRef<HTMLDivElement>(null);
  // Read during the first render, before anything inside the modal takes focus.
  const restoreFocusTo = useRef(document.activeElement as HTMLElement | null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Swap the root's stable scrollbar gutter for padding while open so nothing shifts.
  useLayoutEffect(() => {
    openModals += 1;
    const root = document.documentElement;
    const scrollbarWidth = window.innerWidth - root.offsetWidth;
    root.classList.remove("scrollbar-gutter-stable");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      openModals -= 1;
      if (openModals === 0) {
        root.classList.add("scrollbar-gutter-stable");
        document.body.style.removeProperty("padding-right");
        document.body.style.overflow = previousOverflow;
      }
    };
  }, []);

  useEffect(() => {
    const previouslyFocused = restoreFocusTo.current;
    // Respect a field that focused itself (autoFocus); otherwise focus the given element or the panel.
    if (!panel.current?.contains(document.activeElement)) (initialFocus?.current ?? panel.current)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
      }
      if (event.key === "Tab" && panel.current) {
        const focusable = panel.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    const panelElement = panel.current;
    return () => {
      document.removeEventListener("keydown", onKey, true);
      // Only once the modal has really gone (React's dev double-mount runs this cleanup too).
      window.setTimeout(() => {
        if (!panelElement?.isConnected) previouslyFocused?.focus?.({ preventScroll: true });
      }, 0);
    };
  }, [initialFocus]);

  return createPortal(
    <div className="fixed inset-0 z-40 grid place-items-center" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onMouseDown={() => onCloseRef.current()} />
      <div
        ref={panel}
        tabIndex={-1}
        className={clsx(
          "relative z-10 flex max-h-[95%] max-w-[95%] flex-col overflow-hidden outline-none dark:text-neutral-100",
          "rounded-lg border border-black bg-white text-neutral-800 shadow-xl dark:bg-neutral-900",
          className
        )}
      >
        <div className="flex shrink-0 items-center border-b border-neutral-200 p-4 text-2xl dark:border-black">
          <span className="grow font-medium">{title}</span>
          <button type="button" onClick={() => onCloseRef.current()} aria-label="Close" className={clsx(HOVER_CLASSES, TRANSITION_CLASSES)}>
            <CloseIcon />
          </button>
        </div>
        <div className={clsx("min-h-0 grow overflow-y-auto p-4", bodyClassName)}>{children}</div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-neutral-200 px-4 py-3 dark:border-black">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
