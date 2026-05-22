## What's happening

The screen you see is **our own branded error page** (defined in `src/lib/error-page.ts`). It's returned by the request middleware in `src/start.ts`:

```text
SSR request → errorMiddleware.next() throws → middleware logs error + returns renderErrorPage()
```

So:
- Vercel **is** running our app (build succeeded, function deployed).
- Env vars **are** reaching the function (otherwise the supabase admin client would throw a different message we'd see in build, not at request time).
- Some code path is throwing during server-side rendering of `/` or `/login`.

The original stack is `console.error`-ed inside that middleware — it lands in **Vercel's runtime logs**, which I can't read from here.

## Step 1 — Get the real error (you, ~1 min)

In Vercel:
1. Open your project → **Logs** tab (or **Deployments → latest → Functions → Runtime Logs**).
2. Refresh the broken URL once.
3. Copy the most recent red/error line plus the stack trace underneath and paste it in chat.

If nothing shows under Runtime Logs, try **Functions → `index` (or `_server`) → Logs**.

## Step 2 — Most likely causes (ranked, I'll fix whichever matches)

| # | Cause | Symptom in logs | Fix |
|---|---|---|---|
| 1 | `attachSupabaseAuth` middleware calling `supabase.auth.getSession()` on the server where `localStorage` storage is undefined and something throws | `TypeError` mentioning `storage` or `getSession` | Make the attacher no-op on the server (it already should — verify) |
| 2 | A route loader / component touches `window`, `document`, or `localStorage` during SSR | `ReferenceError: window is not defined` | Wrap the offending access in `useEffect` or `<ClientOnly>` |
| 3 | Supabase client proxy throws because `VITE_SUPABASE_URL` wasn't inlined at Vercel build time | `Missing Supabase environment variable(s)` | Re-check env-var **scope** (must be ticked for Production at build time, not just runtime — Vercel inlines `VITE_*` at build) and **Redeploy** without cache |
| 4 | Vercel target output mismatch — `vercel.json` points at `.vercel/output` but the build emitted to `dist/` | 404 with no error log | Update `vercel.json` outputDirectory, or remove it and let TanStack's vercel preset handle it |
| 5 | `@tanstack/react-start` vercel preset version mismatch | Module-init crash on first request | Pin to a known-good version |

## Step 3 — Quick fallback if you can't find logs

If Vercel logs are empty/locked, I can temporarily make the middleware re-throw the error so Vercel's default error page shows the message inline. That's a 2-line edit, ship a new deploy, screenshot the page, then revert. Tell me to do this if logs aren't accessible.

## Technical context

- `src/start.ts` `errorMiddleware` catches all SSR throws and returns `renderErrorPage()`. The real stack is only in `console.error`, which goes to Vercel function logs — not Cloudflare logs (which I can read) and not the browser.
- `vite.config.vercel.ts` uses `tanstackStart({ target: "vercel" })` with no `server.entry` override, so `src/server.ts` (the Cloudflare wrapper) is **not** used on Vercel — only `src/start.ts` is.
- The Lovable preview hits 200s, confirming the bug is Vercel-specific.

## What I need from you to proceed

The error line + stack from Vercel runtime logs (Step 1), or your go-ahead to do Step 3 (temporary re-throw to surface it).
