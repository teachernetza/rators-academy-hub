// Post-build adapter: takes the TanStack Start output in dist/ and produces a
// Vercel Build Output API directory (.vercel/output) with:
//   - static/   ← all client assets (dist/client)
//   - functions/_ssr.func/  ← bundled Node serverless function wrapping the
//                              fetch handler exported by dist/server/server.js
//   - config.json with a filesystem-first rewrite to the SSR function
//
// Run with: node scripts/build-vercel.mjs (invoked from `bun run build`).
import { build } from "esbuild";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const CLIENT = path.join(DIST, "client");
const SERVER_ENTRY = path.join(DIST, "server", "server.js");
const OUT = path.join(ROOT, ".vercel", "output");
const STATIC = path.join(OUT, "static");
const FN_DIR = path.join(OUT, "functions", "_ssr.func");

if (!existsSync(SERVER_ENTRY)) {
  throw new Error(
    `Missing ${SERVER_ENTRY}. Run \`vite build\` before the Vercel adapter.`,
  );
}

// Wipe previous output so we never ship stale files.
await rm(OUT, { recursive: true, force: true });
await mkdir(STATIC, { recursive: true });
await mkdir(FN_DIR, { recursive: true });

// 1. Static assets ----------------------------------------------------------
await cp(CLIENT, STATIC, { recursive: true });

// 2. Serverless function ----------------------------------------------------
// Wrapper that converts Node http req/res into a Web Request/Response and
// delegates to the TanStack Start fetch handler.
const wrapperSrc = `
import server from "./server-entry.js";

export default async function handler(req, res) {
  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const url = protocol + "://" + host + req.url;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
      else if (value != null) headers.set(key, String(value));
    }

    let body;
    if (req.method && req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks);
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      body,
      duplex: "half",
    });

    const response = await server.fetch(request, {}, {});

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "content-length") return;
      res.setHeader(key, value);
    });

    if (!response.body) {
      res.end();
      return;
    }

    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (err) {
    console.error("[vercel-ssr] handler error:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
    }
    res.end("Internal Server Error");
  }
}
`;

const WRAPPER_PATH = path.join(ROOT, ".vercel", "_ssr-wrapper.mjs");
await mkdir(path.dirname(WRAPPER_PATH), { recursive: true });
await writeFile(WRAPPER_PATH, wrapperSrc);

// Bundle the wrapper + the TanStack Start server entry (and its chunked
// assets) into a single self-contained file with all npm deps inlined.
await build({
  entryPoints: [WRAPPER_PATH],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: path.join(FN_DIR, "index.mjs"),
  alias: {
    "./server-entry.js": SERVER_ENTRY,
  },
  banner: {
    // Polyfill CommonJS-style require for any rare deps that need it inside ESM.
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
  external: [],
  logLevel: "info",
  minify: false,
  sourcemap: false,
  legalComments: "none",
});

// .vc-config.json — Vercel Node runtime metadata.
await writeFile(
  path.join(FN_DIR, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
    },
    null,
    2,
  ),
);

// package.json with ESM type so Node treats index.mjs correctly.
await writeFile(
  path.join(FN_DIR, "package.json"),
  JSON.stringify({ type: "module" }, null, 2),
);

// 3. Top-level Build Output config -----------------------------------------
await writeFile(
  path.join(OUT, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Long-cache hashed client assets.
        {
          src: "^/_build/(.*)",
          headers: { "cache-control": "public, max-age=31536000, immutable" },
          continue: true,
        },
        // Serve real files first (favicon, /_build/*, prerendered html, etc).
        { handle: "filesystem" },
        // Everything else → SSR function.
        { src: "/.*", dest: "/_ssr" },
      ],
    },
    null,
    2,
  ),
);

console.log("[vercel-adapter] wrote", OUT);
