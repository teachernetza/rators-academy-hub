# Deploying to Vercel

This project has two build targets:

- **Lovable preview / Cloudflare** — `vite.config.ts` (default; used by `bun run dev` and Lovable's publish)
- **Vercel** — `vite.config.vercel.ts` (used by `vercel.json` automatically)

## One-time setup

1. In Vercel, **Import Project** from your GitHub repo.
2. Vercel will auto-detect `vercel.json` and use the Vercel build config.
3. Go to **Project → Settings → Environment Variables** and add the following
   for **Production**, **Preview**, and **Development**:

   | Name | Value | Notes |
   |---|---|---|
   | `VITE_SUPABASE_URL` | `https://cgbmwhafnfccdqsinndj.supabase.co` | client |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | (anon key from your `.env`) | client |
   | `VITE_SUPABASE_PROJECT_ID` | `cgbmwhafnfccdqsinndj` | client |
   | `SUPABASE_URL` | same as `VITE_SUPABASE_URL` | server |
   | `SUPABASE_PUBLISHABLE_KEY` | same as `VITE_SUPABASE_PUBLISHABLE_KEY` | server |
   | `SUPABASE_SERVICE_ROLE_KEY` | **service role key** | server, **required for admin ops** |

   Get the service role key in Lovable: **Cloud → Backend → API keys → service_role**.
   Treat it like a password — never commit it.

4. **Redeploy** after saving env vars.

## Why the previous deploy 404'd

The default `vite.config.ts` builds for Cloudflare Workers, so Vercel was
serving only static client files. Refreshing any route or calling any server
function returned 404. The new `vite.config.vercel.ts` outputs a proper
TanStack Start Vercel build with SSR + serverless functions.

## Troubleshooting

- **Sign-in does nothing on Vercel** → check that all 6 env vars above are set,
  including `SUPABASE_SERVICE_ROLE_KEY`. Then redeploy.
- **500 on `/admin/*` routes** → service role key missing or wrong.
- **404 on a route that exists** → make sure the file exists under `src/routes/`
  and the build log shows `vite build --config vite.config.vercel.ts` running.
