import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { apiPlugin } from "./server/api.ts";

// BASE_PATH is "/<repo>/" for GitHub Pages; locally the app lives at "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), apiPlugin()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173 },
});
