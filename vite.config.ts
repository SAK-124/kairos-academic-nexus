import { defineConfig, splitVendorChunkPlugin } from "vite";
import react from "@vitejs/plugin-react";
import compression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  server: {
    port: 8080,
  },
  plugins: [
    react(),
    splitVendorChunkPlugin(),
    compression({ algorithm: "brotliCompress", ext: ".br", deleteOriginFile: false }),
    visualizer({ template: "raw-data", filename: "dist/stats.html", gzipSize: true, brotliSize: true }),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
    minify: "esbuild",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      treeshake: true,
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@radix-ui") || id.includes("lucide-react") || id.includes("cmdk")) return "ui";
            if (id.includes("@tanstack")) return "tanstack";
            if (id.includes("@supabase")) return "supabase";
            return "vendor";
          }
        },
      },
    },
  },
});
