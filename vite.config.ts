import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // Pre-bundle everything up front, including the lazily imported wallet layer. Letting
  // Vite discover a dependency mid-session re-optimizes while a tab is open and leaves
  // that tab with two copies of React, which fails as "Invalid hook call".
  optimizeDeps: {
    include: [
      "react",
      "react-dom/client",
      "zustand",
      "zustand/middleware",
      "idb-keyval",
      "viem",
      "viem/chains",
      "@goodsdks/citizen-sdk",
    ],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["fonts/*.woff2", "icons/*.png"],
      manifest: {
        name: "snarl",
        short_name: "snarl",
        description: "Untangle a knot. Free a creature. Grow a pond.",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#05080f",
        theme_color: "#0d1527",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          // The same drawing works masked: everything sits inside the middle 60%.
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,svg,png}"],
        // The wallet layer is a separate chunk, fetched only if a player opens a wallet,
        // which needs the network anyway. Precaching it would make everyone install a
        // third of a megabyte for a feature most of them will never touch.
        globIgnores: ["**/live-*.js", "**/ccip-*.js", "**/secp256k1-*.js", "**/demo-*.js"],
      },
    }),
  ],
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
