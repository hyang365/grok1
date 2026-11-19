import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative asset paths, so the same build works at hyang365.github.io/grok1/ and at a custom domain root.
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { host: "127.0.0.1", port: 5173, strictPort: true, allowedHosts: true },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
  build: {
    outDir: "site",
    emptyOutDir: true,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 4000,
    modulePreload: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        // Fixed names, so a browser still holding an older index.html always finds the files;
        // scripts/stamp.mjs adds ?v=<content hash> so a new deploy is fetched right away.
        entryFileNames: "app.js",
        assetFileNames: (info) => (info.names?.some((n) => n.endsWith(".css")) ? "style.css" : "assets/[name]-[hash][extname]"),
      },
    },
  },
});
