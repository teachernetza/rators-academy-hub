
# Deploy Rators Academy to Vercel

## Why it's currently 404'ing

The project is configured for **Cloudflare Workers**, not Vercel:
- `wrangler.jsonc` declares `main: src/server.ts` (a Worker entry)
- `vite.config.ts` uses `@lovable.dev/vite-tanstack-config`, which includes the Cloudflare Vite plugin
- `src/server.ts` wraps the TanStack SSR handler in a Worker `fetch` export

Vercel doesn't know about any of that. When you push to Vercel it builds only static client assets, so:
- Every route except `/` returns 404 on refresh
- All `createServerFn` calls (login, dashboards, invitations, seed, grading) hit nothing → app appears to never load
- No service-role env vars are set, so even if it ran, Supabase admin operations would fail

Adding a `.env` file to the deployment does not help — the runtime itself is missing.

## What I'll change

### 1. Switch the build target to Vercel

- Replace `vite.config.ts` to use the **Vercel** TanStack Start target instead of the Cloudflare one:
  ```ts
  import { defineConfig } from "vite";
  import { tanstackStart } from "@tanstack/react-start/plugin/vite";
  import viteReact from "@vitejs/plugin-react";
  import tailwindcss from "@tailwindcss/vite";
  import tsConfigPaths from "vite-tsconfig-paths";

  export default defineConfig({
    plugins: [
      tsConfigPaths(),
      tailwindcss(),
      tanstackStart({ target: "vercel" }),
      viteReact(),
    ],
  });
  ```
- Add the missing plugins as deps: `bun add -d @tanstack/react-start @vitejs/plugin-react @tailwindcss/vite vite-tsconfig-paths vite`
- Remove the Lovable-bundled Cloudflare wrapper from the deployed build path

### 2. Replace the Worker entry

- Delete `wrangler.jsonc`
- Replace `src/server.ts` with a Vercel-compatible entry — TanStack Start's `vercel` target generates a Node handler automatically, so `src/server.ts` becomes a simple re-export of the SSR handler (or is removed entirely; the `vercel` adapter wires the entry)
- Keep our SSR error wrapper logic as middleware *inside* a request handler instead of a Worker `fetch` export

### 3. Add a Vercel project config

Create `vercel.json`:
```json
{
  "framework": null,
  "buildCommand": "bun run build",
  "outputDirectory": ".vercel/output",
  "installCommand": "bun install"
}
```
TanStack's Vercel target outputs to `.vercel/output` which Vercel auto-detects.

### 4. Set env vars in Vercel (you do this in the dashboard)

In **Vercel → Project → Settings → Environment Variables**, add (for Production + Preview + Development):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://cgbmwhafnfccdqsinndj.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | (your anon key from `.env`) |
| `VITE_SUPABASE_PROJECT_ID` | `cgbmwhafnfccdqsinndj` |
| `SUPABASE_URL` | same as above |
| `SUPABASE_PUBLISHABLE_KEY` | same anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **service role key** (get from Lovable Cloud → Backend → API keys) |

Then redeploy.

### 5. Fix the Lovable preview "not preloading"

This is almost certainly the recursive-RLS regression resurfacing or a stale dev server. After the migration I'll:
- Restart the dev server
- Hit `/login` with the demo admin and verify the session loads
- Check console + server logs for any 401/500

## Important caveats

- **`process.env` at runtime works differently on Vercel vs Cloudflare.** Cloudflare injects env per request; Vercel exposes `process.env` natively in Node. Our code already reads env *inside* `.handler()` bodies, so this should Just Work — but I'll spot-check the Supabase admin client and auth middleware.
- **You will lose the Cloudflare deployment path** for `rators-academy-hub.lovable.app`. Lovable's own publish flow won't work after this change because the Worker entry is gone. You'd be Vercel-only.
- **Server function cold starts will be slower** on Vercel (Node lambdas) than on Workers.

## Technical changes summary

- `vite.config.ts` — rewrite, swap Cloudflare plugin for Vercel target
- `src/server.ts` — simplify (remove Worker `fetch` export, keep error wrapper as request handler) or delete
- `wrangler.jsonc` — delete
- `vercel.json` — create
- `package.json` — add Vite/TanStack/Tailwind/React plugin deps
- No changes to routes, server functions, Supabase code, or RLS

## What you do after I push

1. In Vercel: connect the GitHub repo (if not already) → set the 6 env vars above → redeploy
2. Verify `/login` loads, sign in as admin → confirm dashboard renders
3. If anything 500s, share the Vercel function logs and I'll patch

**Confirm and I'll execute.** Also flag if you want to keep the Lovable/Cloudflare deployment alongside Vercel — that requires a dual-config setup which is more involved.
