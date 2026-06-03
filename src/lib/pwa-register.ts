// Guarded service worker registration. Only registers in production on the
// real published origin. Unregisters stale workers everywhere else.
const STALE_SW_PATHS = ["/sw.js", "/service-worker.js"];

function shouldRefuse(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const url = new URL(window.location.href);
  if (url.searchParams.get("sw") === "off") return true;
  const h = url.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  return false;
}

async function unregisterStale() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const r of regs) {
      const path = r.active?.scriptURL ? new URL(r.active.scriptURL).pathname : "";
      if (STALE_SW_PATHS.some((p) => path.endsWith(p))) await r.unregister();
    }
  } catch {
    /* noop */
  }
}

export async function registerPwa() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (shouldRefuse()) {
    await unregisterStale();
    return;
  }
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (err) {
    console.warn("[pwa] register failed", err);
  }
}
