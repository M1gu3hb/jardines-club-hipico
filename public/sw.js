/* Service worker mínimo para instalabilidad (PWA).
   NO cachea de forma agresiva (el sitio es dinámico/en vivo): solo pasa las
   peticiones a la red. Su presencia + un fetch handler habilitan "Instalar app". */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  // Passthrough: siempre red. Sin caché para evitar contenido viejo.
  event.respondWith(fetch(event.request).catch(() => new Response("", { status: 504 })));
});
