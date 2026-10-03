const CACHE = "pocket-store-shell-v1";
const PREFIJO = "pocket-store-shell-";

const ARCHIVOS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

const URLS_LOCALES = new Set(
  ARCHIVOS.map((archivo) => new URL(archivo, self.location.href).href)
);

// INSTALL: guarda la estructura de la aplicación.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await cache.addAll(ARCHIVOS);
      await self.skipWaiting();
    })
  );
});

// ACTIVATE: elimina versiones anteriores de nuestra caché.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();

      await Promise.all(
        nombres
          .filter((nombre) =>
            nombre.startsWith(PREFIJO) && nombre !== CACHE
          )
          .map((nombre) => caches.delete(nombre))
      );

      await self.clients.claim();
    })()
  );
});

// FETCH: sirve el App Shell desde la caché.
self.addEventListener("fetch", (event) => {
  const solicitud = event.request;
  const url = new URL(solicitud.url);

  if (solicitud.method !== "GET") return;

  // API e imágenes externas: solo red, sin caché.
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(solicitud, { cache: "no-store" }));
    return;
  }

  // Solo interceptamos los archivos de nuestra aplicación.
  if (!URLS_LOCALES.has(url.href)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const guardado = await cache.match(solicitud);

      return guardado || fetch(solicitud);
    })()
  );
});