import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const pages = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  base: pages ? "/grok1/" : "/",
  plugins: [react()],
  server: { host: "127.0.0.1", port: 5173, strictPort: true, allowedHosts: true },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
  build: {
    outDir: "site",
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: "app.js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
