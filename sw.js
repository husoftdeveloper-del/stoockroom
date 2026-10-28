/* Stoockroom service worker
 * Strategy: network-first for everything same-origin, cache fallback when
 * offline. That way a fresh `git pull` shows up on the very next load, while
 * the installed app still opens without a network connection.
 * Bump CACHE_VERSION whenever the shell changes.
 */
const CACHE_VERSION = "stoockroom-v5";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./auth.js",
  "./app.js",
  "./dashboard.html",
  "./dashboard.css",
  "./dashboard.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// The page asks us to activate a freshly downloaded version.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req, { cache: "reload" })
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Offline fallback for navigations.
        const shell = await caches.match("./index.html");
        return shell || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      })
  );
});
