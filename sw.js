/* The installed app's shell.

   Bump VERSION when the shell changes — the old cache is dropped on activate.
   Your notes are not in here; they're in IndexedDB, and this never touches
   them. */

var VERSION = "notebook-shell-v5";
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

/* Network first, with the cache as the safety net rather than the default.

   Serving the page from the network but its code from the cache is how you end
   up running new markup against old script, so everything the app is made of
   comes from the same place: the network when there is one, the cache when
   there isn't. A slow connection falls back rather than hanging. */
var PATIENCE = 3500;

function fromNetworkFirst(request) {
  var fell = false;

  var network = fetch(request).then(function (response) {
    var copy = response.clone();
    caches.open(VERSION).then(function (cache) { cache.put(request, copy); });
    return response;
  });

  var waited = new Promise(function (resolve) {
    setTimeout(function () {
      caches.match(request).then(function (hit) {
        if (hit) { fell = true; resolve(hit); }
      });
    }, PATIENCE);
  });

  return Promise.race([network, waited]).catch(function () {
    return caches.match(request).then(function (hit) {
      return hit || caches.match("./index.html");
    });
  }).then(function (response) {
    void fell;
    return response;
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

  /* the page and the code it runs travel together */
  event.respondWith(fromNetworkFirst(request));
});
