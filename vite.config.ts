import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Vercel deployment: disable the Cloudflare plugin and let TanStack Start emit
// the default Node-compatible server entry into dist/server. A small Vercel
// Build Output API adapter (scripts/build-vercel.mjs) wraps it as a serverless
// function after the build.
export default defineConfig({
  cloudflare: false,
});
