import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const directory = path.dirname(fileURLToPath(import.meta.url));
const gatewayOrigin = process.env.AIGW_WEB_GATEWAY_ORIGIN ?? "http://127.0.0.1:3001";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routeFileIgnorePattern: "\\.test\\.",
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(directory, "src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/admin": gatewayOrigin,
      "/api/auth": gatewayOrigin,
      "/openai": gatewayOrigin,
      "/healthz": gatewayOrigin,
    },
  },
});
