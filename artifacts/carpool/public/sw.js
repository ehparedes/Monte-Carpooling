const CACHE_NAME = "monte-carpooling-v4";
const STATIC_ASSETS = ["/", "/manifest.json", "/images/logo-mark.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/ws/")) return;
  if (url.pathname.includes("hot-update")) return;

  // Páginas: siempre del servidor; el caché solo se usa si no hay conexión.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Assets con nombre versionado (index-XXXX.js): nunca cambian, caché primero.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetchAndCache(request))
    );
    return;
  }

  // Resto (imágenes, manifest): copia guardada y se actualiza por detrás.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetchAndCache(request).catch(() => cached);
      return cached || network;
    })
  );
});

function fetchAndCache(request) {
  return fetch(request).then((response) => {
    if (response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    }
    return response;
  });
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put("/", clone));
    }
    return response;
  } catch {
    const cached = (await caches.match(request)) || (await caches.match("/"));
    return cached || Response.error();
  }
}

/* ===== PUSH NOTIFICATIONS ===== */
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = { title: "Monte Carpooling", body: "Tenés una notificación nueva", icon: "/images/logo-mark.png", url: "/" };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || "/images/logo-mark.png",
      badge: "/images/logo-mark.png",
      data: { url: payload.url || "/" },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
