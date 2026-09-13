/* Storage.

   Everything lives in IndexedDB in the browser. Nothing is uploaded, and
   nothing leaves the device — which also means each device keeps its own
   notebook until there's a sync story.

   The whole notebook is small enough to hold in memory, so the app loads it
   once at boot and writes back on every change. That keeps rendering
   synchronous; only the edges are async. */

(function () {
  "use strict";

  var NAME = "notebook";
  var VERSION = 1;
  var db = null;

  function open() {
    return new Promise(function (resolve, reject) {
      if (db) { resolve(db); return; }

      var request = indexedDB.open(NAME, VERSION);

      request.onupgradeneeded = function (event) {
        var out = event.target.result;
        if (!out.objectStoreNames.contains("books")) {
          out.createObjectStore("books", { keyPath: "id" });
        }
        if (!out.objectStoreNames.contains("entries")) {
          out.createObjectStore("entries", { keyPath: "n" });
        }
        if (!out.objectStoreNames.contains("files")) {
          out.createObjectStore("files", { keyPath: "id" });
        }
      };

      request.onsuccess = function () { db = request.result; resolve(db); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function run(storeNames, mode, work) {
    return open().then(function (out) {
      return new Promise(function (resolve, reject) {
        var tx = out.transaction(storeNames, mode);
        var result;
        work(tx, function (value) { result = value; });
        tx.oncomplete = function () { resolve(result); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
    });
  }

  function all(storeName) {
    return run([storeName], "readonly", function (tx, done) {
      var request = tx.objectStore(storeName).getAll();
      request.onsuccess = function () { done(request.result); };
    });
  }

  window.Store = {

    /* everything at once, at boot */
    load: function () {
      return Promise.all([all("books"), all("entries")])
        .then(function (both) {
          return { books: both[0], entries: both[1] };
        });
    },

    putBook: function (book) {
      return run(["books"], "readwrite", function (tx) {
        tx.objectStore("books").put({
          id: book.id, name: book.name, dye: book.dye, order: book.order
        });
      });
    },

    /* passages carry real timestamps; clips carry a file id, not the file */
    putEntry: function (entry) {
      return run(["entries"], "readwrite", function (tx) {
        tx.objectStore("entries").put({
          n: entry.n,
          book: entry.book,
          passages: entry.passages.map(function (p) {
            return {
              at: p.at,
              text: p.text,
              clips: p.clips.map(function (c) {
                return { id: c.id, mark: c.mark, name: c.name,
                         meta: c.meta, href: c.href, thumb: c.thumb };
              })
            };
          })
        });
      });
    },

    putFile: function (id, blob) {
      return run(["files"], "readwrite", function (tx) {
        tx.objectStore("files").put({ id: id, blob: blob });
      });
    },

    /* an entry and whatever it was carrying */
    dropEntry: function (n, fileIds) {
      return run(["entries", "files"], "readwrite", function (tx) {
        tx.objectStore("entries").delete(n);
        var files = tx.objectStore("files");
        (fileIds || []).forEach(function (id) { files.delete(id); });
      });
    },

    getFile: function (id) {
      return run(["files"], "readonly", function (tx, done) {
        var request = tx.objectStore("files").get(id);
        request.onsuccess = function () {
          done(request.result ? request.result.blob : null);
        };
      });
    },

    /* Ask the browser not to evict us. Chrome grants this to installed or
       well-used sites; Safari grants it to home-screen apps. Without it the
       data is "best-effort" and can be cleared under disk pressure. */
    persist: function () {
      if (!navigator.storage || !navigator.storage.persist) {
        return Promise.resolve(null);
      }
      return navigator.storage.persisted().then(function (already) {
        return already ? true : navigator.storage.persist();
      }).catch(function () { return null; });
    },

    usage: function () {
      if (!navigator.storage || !navigator.storage.estimate) {
        return Promise.resolve(null);
      }
      return navigator.storage.estimate().catch(function () { return null; });
    },

    allFiles: function () { return all("files"); },

    /* One transaction, so a restore either lands or doesn't */
    restore: function (books, entries, files) {
      return run(["books", "entries", "files"], "readwrite", function (tx) {
        var b = tx.objectStore("books");
        var e = tx.objectStore("entries");
        var f = tx.objectStore("files");
        books.forEach(function (book) { b.put(book); });
        entries.forEach(function (entry) { e.put(entry); });
        files.forEach(function (file) { f.put(file); });
      });
    },

    /* for the export, and for proving the data is really yours */
    wipe: function () {
      return run(["books", "entries", "files"], "readwrite", function (tx) {
        tx.objectStore("books").clear();
        tx.objectStore("entries").clear();
        tx.objectStore("files").clear();
      });
    }
  };
})();
