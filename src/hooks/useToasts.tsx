import clsx from "clsx";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

interface Toast {
  id: number;
  message: ReactNode;
  action?: { label: string; run: () => void };
  tone: "info" | "error";
}

interface ContextValue {
  show: (message: ReactNode, options?: { action?: Toast["action"]; tone?: Toast["tone"]; durationMs?: number }) => void;
}

const Context = createContext<ContextValue>({ show: () => undefined });

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const show = useCallback<ContextValue["show"]>(
    (message, options = {}) => {
      const id = nextId.current;
      nextId.current += 1;
      // Keep the newest few; a burst of keyboard moves shouldn't bury the screen.
      setToasts((all) => [...all.slice(-2), { id, message, action: options.action, tone: options.tone ?? "info" }]);
      window.setTimeout(() => dismiss(id), options.durationMs ?? (options.action ? 5000 : 3000));
    },
    [dismiss]
  );

  const value = useMemo(() => ({ show }), [show]);
  return (
    <Context.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={clsx(
              "pointer-events-auto flex max-w-xl items-center gap-4 rounded-lg px-4 py-2 text-sm shadow-lg",
              toast.tone === "error"
                ? "bg-rose-600 text-white"
                : "bg-neutral-800 text-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
            )}
          >
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="font-semibold text-blue-400 hover:underline dark:text-blue-600"
                onClick={() => {
                  toast.action!.run();
                  dismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </Context.Provider>
  );
};

const useToasts = (): ContextValue => useContext(Context);
export default useToasts;
