/**
 * AI Skill Exchange - Service Worker
 * Provides offline caching, network-first API fallbacks, and PWA offline support.
 */

const CACHE_NAME = "ai-skill-exchange-v1";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/credits",
  "/campus-insights",
  "/learn",
  "/skills",
  "/projects/new",
  "/profile",
  "/manifest.json",
  "/globe.svg",
  "/file.svg",
];

// Install event - precache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[ServiceWorker] Pre-cache warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - claim clients and clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - handle offline requests
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ignore non-GET requests for cache matching
  if (event.request.method !== "GET") {
    return;
  }

  // 1. API calls: Network-first, fall back to cached response
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and update cache if response is good
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Network failed - return cached response if available
          const cached = await caches.match(event.request);
          if (cached) {
            return cached;
          }
          // Return synthetic offline response instead of crashing
          return new Response(
            JSON.stringify({ offline: true, error: "Network unavailable. Serving offline mode." }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", "X-Offline-Fallback": "true" },
            }
          );
        })
    );
    return;
  }

  // 2. Static files and pages: Stale-while-revalidate or Cache-first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to revalidate cache
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Offline - no-op, cachedResponse already served
          });
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(event.request).catch(async () => {
        // If navigation request fails, return cached root or dashboard
        if (event.request.mode === "navigate") {
          const fallback = await caches.match("/dashboard") || await caches.match("/");
          if (fallback) return fallback;
        }
        return new Response("Application is offline. Please refresh when connected.", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        });
      });
    })
  );
});
