import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// Client build: the behaviours entry, lazily loaded islands, and the stylesheet. The server build
// (`--ssr src/entry-server.ts`) renders pages; scripts/build.ts prerenders every route to dist/.
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  // keep the old site's PostCSS/Tailwind 3 config (repo root) out of this build
  css: { postcss: {} },
  define: {
    __VUE_OPTIONS_API__: "false",
    __VUE_PROD_DEVTOOLS__: "false",
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(process.env.HYDRATION_DETAILS === "true"),
  },
  build: {
    manifest: true,
    target: "es2022",
    rollupOptions: {
      input: { app: "src/entry-client.ts", style: "src/styles/app.css" },
    },
  },
  server: {
    proxy: {
      "/api": process.env.API_ORIGIN || "http://127.0.0.1:8081",
      "/files": process.env.API_ORIGIN || "http://127.0.0.1:8081",
      "/media": process.env.API_ORIGIN || "http://127.0.0.1:8081",
    },
  },
});
