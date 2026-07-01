// Guarded PWA registration. Only registers in production on the real
// deployed origin. In Lovable preview / dev / iframes / ?sw=off, it
// unregisters any matching worker to avoid stale caches.

const SW_URL = "/sw.js";

function shouldRegister(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  try {
    if (window.self !== window.top) return false;
  } catch {
    return false;
  }
  const url = new URL(window.location.href);
  if (url.searchParams.get("sw") === "off") return false;
  const host = url.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return false;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return false;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return false;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return false;
  return true;
}

async function unregisterMatching() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs.map((r) => {
      const scriptUrl = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
      if (scriptUrl.endsWith(SW_URL) || scriptUrl.endsWith("/service-worker.js")) {
        return r.unregister();
      }
      return Promise.resolve();
    })
  );
}

export function registerPWA() {
  if (!shouldRegister()) {
    // Clean up prior registrations if we're not in a valid context.
    void unregisterMatching();
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SW_URL).catch((err) => {
      console.warn("SW register failed", err);
    });
  });
}