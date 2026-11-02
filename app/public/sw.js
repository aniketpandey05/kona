// Kona holds everything in IndexedDB, so the only job here is to make the app
// installable and to keep its own shell working without a connection. Nothing
// a user saves is ever cached or sent anywhere.

// v2 rather than v1: the old worker could cache an index.html under a
// script's URL, and the name moving is what throws that away.
const CACHE = 'kona-shell-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['./', './index.html', './manifest.webmanifest'])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Network first, so a reinstalled app picks up a new build; fall back to the
  // cached shell when there is no connection.
  //
  // The shell is only a fallback for a *navigation*. Handing index.html back
  // for anything else is worse than failing: a module request that receives
  // HTML fails strict MIME checking, so the app does not boot and the console
  // says the server sent the wrong type, which sends you looking at the
  // server. That is what v1 did to every hashed script it had not cached yet,
  // which is any of them after a new build.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() =>
        caches.match(request).then((hit) => {
          if (hit) return hit;
          if (request.mode === 'navigate') return caches.match('./index.html');
          // Let it fail as what it is: a request that could not be made.
          return Response.error();
        }),
      ),
  );
});
