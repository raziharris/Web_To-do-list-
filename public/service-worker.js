const CACHE_NAME = "my-tasks-v3";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL);

  const indexResponse = await fetch("/index.html", { cache: "no-cache" });
  const indexMarkup = await indexResponse.clone().text();
  await cache.put("/index.html", indexResponse);

  const builtAssetUrls = [...indexMarkup.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((url) => url.startsWith("/assets/"));

  if (builtAssetUrls.length > 0) {
    await cache.addAll(builtAssetUrls);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", responseClone));
          return response;
        })
        .catch(() => caches.match("/index.html")),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return response;
      });
    }),
  );
});
function getNotificationPayload(data = {}) {
  return {
    title: data.title || "Task completed",
    options: {
      body: data.body || "A task was marked as done.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "task-completed",
      renotify: true,
      data: {
        url: data.url || "/",
      },
    },
  };
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "SHOW_TASK_NOTIFICATION") {
    return;
  }

  const payload = getNotificationPayload(event.data.payload);
  event.waitUntil(self.registration.showNotification(payload.title, payload.options));
});

self.addEventListener("push", (event) => {
  let pushData = {};

  try {
    pushData = event.data ? event.data.json() : {};
  } catch (_error) {
    pushData = {
      body: event.data?.text(),
    };
  }

  const payload = getNotificationPayload(pushData);
  event.waitUntil(self.registration.showNotification(payload.title, payload.options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const matchingClient = clientList.find((client) => new URL(client.url).pathname === targetUrl);

      if (matchingClient) {
        return matchingClient.focus();
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});
