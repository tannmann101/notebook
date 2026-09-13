/* The installed app's shell.

   Bump VERSION when the shell changes — the old cache is dropped on activate.
   Your notes are not in here; they're in IndexedDB, and this never touches
   them. */

var VERSION = "notebook-shell-v1";
var FONTS = "notebook-fonts-v1";

var SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./store.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(VERSION)
      .then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== VERSION && key !== FONTS) { return caches.delete(key); }
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function fromNetworkFirst(request) {
  return fetch(request).then(function (response) {
    var copy = response.clone();
    caches.open(VERSION).then(function (cache) { cache.put(request, copy); });
    return response;
  }).catch(function () {
    return caches.match(request).then(function (hit) {
      return hit || caches.match("./index.html");
    });
  });
}

function fromCacheFirst(request, cacheName) {
  return caches.match(request).then(function (hit) {
    var fresh = fetch(request).then(function (response) {
      var copy = response.clone();
      caches.open(cacheName).then(function (cache) { cache.put(request, copy); });
      return response;
    }).catch(function () { return hit; });
    return hit || fresh;
  });
}

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") { return; }

  var url = new URL(request.url);

  /* the typefaces, so an offline launch still looks like itself */
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(fromCacheFirst(request, FONTS));
    return;
  }

  if (url.origin !== self.location.origin) { return; }

  if (request.mode === "navigate") {
    event.respondWith(fromNetworkFirst(request));
    return;
  }

  event.respondWith(fromCacheFirst(request, VERSION));
});
