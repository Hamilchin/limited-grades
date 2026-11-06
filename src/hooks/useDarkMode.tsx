import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

const Context = createContext<[boolean, () => void]>([false, () => undefined]);

export const DarkModeProvider = ({ children }: { children: ReactNode }) => {
  // index.html sets the class before first paint; read it from there.
  const [enabled, setEnabled] = useState(() => document.documentElement.classList.contains("dark"));
  const toggle = useCallback(() => {
    setEnabled((previous) => {
      const next = !previous;
      document.documentElement.classList.toggle("dark", next);
      try {
        localStorage.setItem("theme", next ? "dark" : "light");
      } catch {
        // Private windows can refuse storage; the toggle still works for this visit.
      }
      return next;
    });
  }, []);
  const value = useMemo<[boolean, () => void]>(() => [enabled, toggle], [enabled, toggle]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

const useDarkMode = (): [boolean, () => void] => useContext(Context);
export default useDarkMode;
