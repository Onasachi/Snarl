import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["fonts/*.woff2"],
      manifest: {
        name: "snarl",
        short_name: "snarl",
        description: "Untangle a knot. Free a creature. Grow a pond.",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#05080f",
        theme_color: "#0d1527",
        icons: [],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,svg,png}"],
      },
    }),
  ],
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
