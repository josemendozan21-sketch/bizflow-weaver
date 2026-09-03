/**
 * Detección de versión nueva publicada.
 *
 * Compara el bundle principal que está usando la pestaña actual con el que
 * anuncia el index.html del servidor. Si cambió (nuevo despliegue), limpia
 * cachés + service workers y recarga, de modo que todos los dispositivos y
 * sesiones abiertas terminen en la última versión publicada.
 */

const CHECK_INTERVAL_MS = 60_000;
let checking = false;
let reloading = false;

function currentBundleUrl(): string | null {
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'));
  const main = scripts.find((s) => /\/assets\/|index/.test(s.src));
  return main?.src ? new URL(main.src, location.href).pathname : null;
}

function bundleUrlFromHtml(html: string): string | null {
  const match = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/i);
  if (!match) return null;
  try {
    return new URL(match[1], location.href).pathname;
  } catch {
    return null;
  }
}

async function hardReload() {
  if (reloading) return;
  reloading = true;
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
  } catch {
    /* sin permisos: recargamos igual */
  }
  const url = new URL(location.href);
  url.searchParams.set("v", Date.now().toString(36));
  location.replace(url.toString());
}

async function checkForUpdate() {
  if (checking || reloading || document.visibilityState !== "visible") return;
  checking = true;
  try {
    const res = await fetch(`/index.html?_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const remote = bundleUrlFromHtml(await res.text());
    const local = currentBundleUrl();
    if (remote && local && remote !== local) {
      await hardReload();
    }
  } catch {
    /* red intermitente: reintenta luego */
  } finally {
    checking = false;
  }
}

export function startVersionCheck() {
  if (typeof window === "undefined" || !import.meta.env.PROD) return;
  window.setTimeout(checkForUpdate, 3_000);
  window.setInterval(checkForUpdate, CHECK_INTERVAL_MS);
  window.addEventListener("focus", () => void checkForUpdate());
  document.addEventListener("visibilitychange", () => void checkForUpdate());
}
