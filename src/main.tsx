import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { DarkModeProvider } from "./hooks/useDarkMode";
import { PrefsProvider } from "./hooks/usePrefs";
import { TierListsProvider } from "./hooks/useTierLists";
import { ToastProvider } from "./hooks/useToasts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <DarkModeProvider>
        <PrefsProvider>
          <ToastProvider>
            <TierListsProvider>
              <App />
            </TierListsProvider>
          </ToastProvider>
        </PrefsProvider>
      </DarkModeProvider>
    </BrowserRouter>
  </StrictMode>
);
