const CACHE_NAME = "a1vs-cache-v1";
const OFFLINE_URL = "/offline.html";

const APP_SHELL = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/assets/generated/frontend/public/assets/generated/a1vs-icon-192.dim_192x192.png",
  "/assets/generated/frontend/public/assets/generated/a1vs-icon-512.dim_512x512.png"
];

// Install: cache the app shell and offline page
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first with offline fallback
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests and chrome-extension or cross-origin requests
  if (
    event.request.method !== "GET" ||
    !event.request.url.startsWith(self.location.origin)
  ) {
    return;
  }

  // For API calls, always go to network
  if (event.request.url.includes("/api/")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for static assets
        if (
          response.ok &&
          (event.request.url.includes("/assets/") ||
            event.request.url.endsWith(".js") ||
            event.request.url.endsWith(".css") ||
            event.request.url.endsWith(".png") ||
            event.request.url.endsWith(".jpg") ||
            event.request.url.endsWith(".ico"))
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed -- try cache first
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // For navigation requests, show offline page
          if (event.request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});
