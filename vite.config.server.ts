import { defineConfig } from "vite";
import path from "path";

// Server build configuration
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "server/production.ts"),
      name: "server",
      fileName: "production",
      formats: ["es"],
    },
    outDir: "dist/server",
    target: "node22",
    ssr: true,
    rollupOptions: {
      external: [
        // Node.js built-ins
        "fs",
        "path",
        "url",
        "http",
        "https",
        "os",
        "crypto",
        "stream",
        "util",
        "events",
        "buffer",
        "querystring",
        "child_process",
        // Externalized so the Netlify function runtime can resolve them
        // at cold start. Both are provided by Netlify via
        // external_node_modules in netlify.toml.
        "serverless-http",
        "dotenv",
      ],
      output: {
        format: "es",
        entryFileNames: "[name].mjs",
      },
    },
    minify: false, // Keep readable for debugging
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  ssr: {
    // Force express + cors to be bundled inline into the server bundle.
    // Without this, Vite's SSR build marks them as external and leaves
    // bare `import "express"` statements in the output — which then
    // crash the Netlify function runtime with "Cannot find module 'express'".
    noExternal: ["express", "cors"],
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
