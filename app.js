/* Notebook.

   An entry is a thread. You start it with a line, and every time you come back
   you add a dated sitting to the same thread. Entries live in a notebook, or
   they float. Entry numbers run in one sequence across everything.

   Three views, one composer. The composer moves to whichever view is asking:
   on the home screen it starts an entry, in a notebook it starts one already
   filed there, and inside an entry it picks the thread back up.

   The whole notebook is loaded from IndexedDB at boot and held in memory, so
   rendering stays synchronous and every change is written straight back. */

(function () {
  "use strict";

  var notebooks = [];
  var floating = { id: "floating", name: "Floating thoughts", dye: "none",
                   entries: [], loose: true };

  var dyes = ["brass", "verdigris", "oxblood", "bone", "slate", "lead"];

  var view = "home";
  var openBook = null;
  var openEntry = null;
  var selected = "";
  var context = "home";
  var composing = false;
  var finding = false;
  var scope = null;
  var clips = [];
  var dragDepth = 0;

  var HINT_REST = "Left unfiled, it stays a floating thought — kept, just not put away.";
  var HINT_WRITE = "Enter files it · Shift + Enter for a new line · Paste or drop to clip · Esc steps back";
  var HINT_PICKUP = "Enter adds it to this entry, dated today · Esc steps back";

  var el = {};
  [ "entry-form", "entry", "thesis", "count", "hint", "next-entry", "dest-echo",
    "dest", "dest-btn", "dest-dye", "dest-name", "dest-menu", "dest-fixed",
    "books", "books-empty", "book-new", "float-btn", "float-n",
    "counts", "clips", "attach-btn", "file-input", "dateline", "composer",
    "view-home", "view-book", "view-entry", "results",
    "find", "find-n", "find-scope", "results-head", "results-list", "results-empty",
    "slot-home", "slot-book", "slot-entry", "book-dye", "book-name",
    "book-entries", "book-empty", "entry-back", "entry-title",
    "entry-meta", "entry-passages", "pickup-date", "colophon",
    "copy-entry", "copy-book", "copy-all",
    "report", "report-head", "report-text", "report-close"
  ].forEach(function (id) {
    el[id.replace(/-(\w)/g, function (m, c) { return c.toUpperCase(); })] =
      document.getElementById(id);
  });
  el.body = document.body;

  var hintTimer = null;

  /* --- small helpers ------------------------------------------------------ */

  function wordsIn(text) {
    var trimmed = text.trim();
    return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
  }

  function num(n) { return n.toLocaleString(); }

  function clamp(text, max) {
    return text.length > max ? text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : text;
  }

  function stamp(at) {
    var d = new Date(at);
    var month = d.toLocaleDateString(undefined, { month: "short" })
      .replace(".", "").toUpperCase();
    return String(d.getDate()).padStart(2, "0") + " " + month + " " + d.getFullYear();
  }

  function timeOf(passage) {
    return new Date(passage.at)
      .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function dayKey(at) {
    var d = new Date(at);
    return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
  }

  function containers() { return notebooks.concat([floating]); }

  function containerById(id) {
    if (id === "floating" || id === "") { return floating; }
    for (var i = 0; i < notebooks.length; i += 1) {
      if (notebooks[i].id === id) { return notebooks[i]; }
    }
    return null;
  }

  function findEntry(n) {
    var found = null;
    containers().forEach(function (c) {
      c.entries.forEach(function (e) {
        if (e.n === n) { found = { entry: e, container: c }; }
      });
    });
    return found;
  }

  function openingLine(entry) {
    var first = inOrder(entry.passages)[0];
    return (first.text.split("\n")[0] || "").trim();
  }

  function titleOf(entry) { return clamp(openingLine(entry), 64); }

  function entryNo(entry) { return String(entry.n).padStart(4, "0"); }
  function entryLabel(entry) { return "Entry " + entryNo(entry); }

  /* oldest first, which is the order they were written */
  function inOrder(passages) {
    return passages.slice().sort(function (a, b) { return a.at - b.at; });
  }

  function entryStarted(entry) {
    return Math.min.apply(null, entry.passages.map(function (p) { return p.at; }));
  }

  function entryTouched(entry) {
    return Math.max.apply(null, entry.passages.map(function (p) { return p.at; }));
  }

  function entryWords(entry) {
    return entry.passages.reduce(function (n, p) { return n + wordsIn(p.text); }, 0);
  }

  function entryClips(entry) {
    return entry.passages.reduce(function (n, p) { return n + p.clips.length; }, 0);
  }

  function countWords(container) {
    return container.entries.reduce(function (n, e) { return n + entryWords(e); }, 0);
  }

  /* most recently touched first */
  function byRecency(a, b) { return entryTouched(b) - entryTouched(a); }

  function sittings(n) { return n + (n === 1 ? " sitting" : " sittings"); }

  /* a time is only worth showing when the date alone doesn't tell them apart */
  function sharesDay(passages, passage) {
    var key = dayKey(passage.at);
    return passages.filter(function (p) { return dayKey(p.at) === key; }).length > 1;
  }

  function snipFor(entry) {
    var passages = inOrder(entry.passages);
    var latest = passages[passages.length - 1].text.replace(/\s+/g, " ");

    if (entry.passages.length > 1) { return clamp(latest, 118); }

    var opening = openingLine(entry);
    if (opening.length > 64) { return ""; }
    return clamp(latest.slice(opening.length).trim(), 118);
  }

  function nextNumber() {
    var top = 0;
    containers().forEach(function (c) {
      c.entries.forEach(function (e) { if (e.n > top) { top = e.n; } });
    });
    return top + 1;
  }

  function dyeNode(name) {
    var d = document.createElement("span");
    d.className = "dye dye--" + name;
    d.setAttribute("aria-hidden", "true");
    return d;
  }

  function elem(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  /* --- writing through to storage ----------------------------------------- */

  function save(entry, container) {
    entry.book = container.loose ? "" : container.id;
    Store.putEntry(entry).catch(function (err) {
      say("Couldn't save that — " + (err && err.name ? err.name : "storage error"));
    });
  }

  /* --- routing ------------------------------------------------------------ */

  function go(hash) {
    if (window.location.hash === hash) { route(); } else { window.location.hash = hash; }
  }

  function route() {
    if (finding) {
      el.find.value = "";
      finding = false;
      scope = null;
      renderScope();
      el.findN.textContent = "";
    }

    var hash = window.location.hash || "#/";
    var parts = hash.replace(/^#\//, "").split("/");

    if (parts[0] === "n" && parts[1]) {
      var container = containerById(decodeURIComponent(parts[1]));
      if (container) { showBook(container); return; }
    }
    if (parts[0] === "e" && parts[1]) {
      var hit = findEntry(parseInt(parts[1], 10));
      if (hit) { showEntry(hit.entry, hit.container); return; }
    }
    showHome();
  }

  function setView(name) {
    view = name;
    el.body.dataset.view = name;
    showViews();
    window.scrollTo(0, 0);
  }

  function showViews() {
    el.viewHome.hidden = finding || view !== "home";
    el.viewBook.hidden = finding || view !== "book";
    el.viewEntry.hidden = finding || view !== "entry";
    el.colophon.hidden = finding || view !== "home";
    el.results.hidden = !finding;
  }

  /* --- the composer, wherever it's needed --------------------------------- */

  function moveComposer(slot, which) {
    context = which;
    slot.appendChild(el.composer);

    var onEntry = which === "entry";
    el.dest.hidden = which !== "home";
    el.destFixed.hidden = which === "home";

    if (which === "book") {
      el.destFixed.textContent = "→ " + openBook.name;
    } else if (onEntry) {
      el.destFixed.textContent = "→ " + entryLabel(openEntry);
    }

    el.entry.placeholder = onEntry ? "Pick it up…" : "A line, a scrap, a thought…";
    if (!el.hint.classList.contains("slate__hint--done")) {
      el.hint.textContent = restingHint();
    }
  }

  function restingHint() {
    if (composing) { return context === "entry" ? HINT_PICKUP : HINT_WRITE; }
    if (context === "entry") { return "Adds a new dated sitting to this entry."; }
    if (context === "book") { return "Anything you write here is filed in " + openBook.name + "."; }
    return HINT_REST;
  }

  /* --- home --------------------------------------------------------------- */

  function showHome() {
    setView("home");
    moveComposer(el.slotHome, "home");
    el.nextEntry.textContent = String(nextNumber()).padStart(4, "0");
    renderBooks();
    renderSelection();
  }

  function renderBooks() {
    el.books.textContent = "";

    notebooks.forEach(function (book) {
      var li = elem("li", "book");
      var btn = elem("button", "book__btn");
      btn.type = "button";
      btn.dataset.id = book.id;

      var name = elem("span", "book__name");
      name.appendChild(dyeNode(book.dye));
      name.appendChild(document.createTextNode(book.name));

      var leader = elem("span", "book__leader");
      leader.setAttribute("aria-hidden", "true");

      btn.appendChild(name);
      btn.appendChild(leader);
      btn.appendChild(elem("span", "book__n stamp", num(book.entries.length)));
      li.appendChild(btn);
      el.books.appendChild(li);
    });

    el.booksEmpty.hidden = notebooks.length > 0;
    el.floatN.textContent = num(floating.entries.length);
    renderCounts();
  }

  function countItem(label, value) {
    var wrap = document.createElement("div");
    wrap.appendChild(elem("dt", null, label));
    wrap.appendChild(elem("dd", null, value));
    return wrap;
  }

  function renderCounts() {
    var entries = 0, words = 0, oldest = null;
    containers().forEach(function (c) {
      entries += c.entries.length;
      words += countWords(c);
      c.entries.forEach(function (e) {
        var started = entryStarted(e);
        if (oldest === null || started < oldest) { oldest = started; }
      });
    });

    el.counts.textContent = "";
    el.counts.appendChild(countItem("Notebooks", num(notebooks.length)));
    el.counts.appendChild(countItem("Entries", num(entries)));
    el.counts.appendChild(countItem("Words", num(words)));
    el.counts.appendChild(countItem("Kept since", oldest === null ? "—" :
      new Date(oldest).toLocaleDateString(undefined, { month: "short", year: "numeric" })));
  }

  el.books.addEventListener("click", function (event) {
    var btn = event.target.closest(".book__btn");
    if (btn) { go("#/n/" + btn.dataset.id); }
  });

  el.floatBtn.addEventListener("click", function () { go("#/n/floating"); });

  /* --- a notebook --------------------------------------------------------- */

  function showBook(container) {
    openBook = container;
    setView("book");
    moveComposer(el.slotBook, "book");

    el.bookDye.className = "dye dye--" + container.dye;
    el.bookName.textContent = container.name;
    renderBookEntries(container.entries.slice().sort(byRecency));
  }

  function entryRow(entry, container, snippetNode) {
    var li = elem("li", "row");
    var btn = elem("button", "row__btn");
    btn.type = "button";
    btn.dataset.n = entry.n;

    var head = elem("div", "row__head");
    head.appendChild(elem("span", "row__stamp stamp", stamp(entryTouched(entry))));
    if (container && container !== openBook) {
      var where = elem("span", "row__where stamp");
      where.appendChild(dyeNode(container.dye));
      where.appendChild(document.createTextNode(container.loose ? "floating" : container.name));
      head.appendChild(where);
    }
    head.appendChild(elem("span", "row__no stamp", entryNo(entry)));

    var body = elem("div", "row__body");
    body.appendChild(elem("h3", "row__title", titleOf(entry)));

    var snip = snippetNode;
    if (!snip) {
      var rest = snipFor(entry);
      if (rest) { snip = elem("p", "row__snip", rest); }
    }
    if (snip) { body.appendChild(snip); }

    var bits = [];
    if (entry.passages.length > 1) { bits.push(sittings(entry.passages.length)); }
    if (entryClips(entry)) { bits.push(entryClips(entry) + " clipped"); }
    if (bits.length) { body.appendChild(elem("p", "row__meta stamp", bits.join(" · "))); }

    btn.appendChild(head);
    btn.appendChild(body);
    li.appendChild(btn);
    return li;
  }

  function renderBookEntries(entries) {
    el.bookEntries.textContent = "";
    entries.forEach(function (entry) {
      el.bookEntries.appendChild(entryRow(entry, openBook));
    });
    el.bookEmpty.hidden = entries.length > 0;
  }

  el.bookEntries.addEventListener("click", function (event) {
    var btn = event.target.closest(".row__btn");
    if (btn) { go("#/e/" + btn.dataset.n); }
  });

  /* --- an entry ----------------------------------------------------------- */

  function showEntry(entry, container) {
    openEntry = entry;
    openBook = container;
    setView("entry");

    el.entryBack.href = "#/n/" + container.id;
    el.entryBack.textContent = "";
    el.entryBack.appendChild(elem("span", null, "←"));
    el.entryBack.appendChild(document.createTextNode(" " + container.name));

    el.entryTitle.textContent = entryLabel(entry);
    el.entryMeta.textContent = "Started " + stamp(entryStarted(entry));

    renderPassages();
    moveComposer(el.slotEntry, "entry");
    el.pickupDate.textContent = "Today · " + stamp(Date.now());
  }

  function clipNode(clip, still) {
    var li = elem("li", "clip" + (still ? " clip--still" : ""));

    if (clip.thumb) {
      var img = document.createElement("img");
      img.className = "clip__thumb";
      img.src = clip.thumb;
      img.alt = "";
      li.appendChild(img);
    } else {
      li.appendChild(elem("span", "clip__mark", clip.mark));
    }

    var body = elem("div", "clip__body");
    body.appendChild(elem("span", "clip__name", clip.name));
    body.appendChild(elem("span", "clip__meta", clip.meta));
    li.appendChild(body);
    return li;
  }

  function renderPassages() {
    el.entryPassages.textContent = "";

    inOrder(openEntry.passages).forEach(function (passage) {
      var li = elem("li", "passage");

      var when = elem("p", "passage__stamp stamp", stamp(passage.at));
      if (sharesDay(openEntry.passages, passage)) {
        when.appendChild(elem("span", "passage__time", timeOf(passage)));
      }
      li.appendChild(when);

      var body = elem("div", "passage__body");
      passage.text.split("\n").forEach(function (line) {
        if (line.trim()) { body.appendChild(elem("p", "passage__text", line)); }
      });

      if (passage.clips.length) {
        var list = elem("ul", "clips clips--still");
        passage.clips.forEach(function (c) {
          var node = clipNode(c, true);
          if (c.href || c.id) {
            node.classList.add("clip--open");
            node.addEventListener("click", function () { openClip(c); });
          }
          list.appendChild(node);
        });
        body.appendChild(list);
      }

      li.appendChild(body);
      el.entryPassages.appendChild(li);
    });
  }

  /* a clipped thing should open when you ask it to */
  function openClip(clip) {
    if (clip.href) { window.open(clip.href, "_blank", "noopener"); return; }
    Store.getFile(clip.id).then(function (blob) {
      if (!blob) { return; }
      var url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
    });
  }

  /* --- search ------------------------------------------------------------- */

  function snippetFor(text, query) {
    var flat = text.replace(/\s+/g, " ");
    var at = flat.toLowerCase().indexOf(query);
    var p = elem("p", "row__snip");

    if (at < 0) { p.textContent = clamp(flat, 118); return p; }

    var from = Math.max(0, at - 44);
    var head = (from > 0 ? "…" : "") + flat.slice(from, at);
    var tail = flat.slice(at + query.length, at + query.length + 74);

    p.appendChild(document.createTextNode(head));
    p.appendChild(elem("mark", null, flat.slice(at, at + query.length)));
    p.appendChild(document.createTextNode(tail + (flat.length > at + query.length + 74 ? "…" : "")));
    return p;
  }

  function matches(entry, query) {
    var hit = null;
    entry.passages.forEach(function (p) {
      if (!hit && p.text.toLowerCase().indexOf(query) > -1) { hit = p.text; }
      p.clips.forEach(function (c) {
        if (!hit && (c.name + " " + c.meta).toLowerCase().indexOf(query) > -1) {
          hit = c.name + " " + c.meta;
        }
      });
    });
    return hit;
  }

  function scopeFor() {
    if (view === "book" || view === "entry") { return openBook; }
    return null;
  }

  function renderScope() {
    el.findScope.hidden = !scope;
    if (scope) { el.findScope.textContent = "in " + scope.name; }
  }

  function runSearch() {
    var query = el.find.value.trim().toLowerCase();

    if (query === "") {
      finding = false;
      scope = null;
      el.findN.textContent = "";
      renderScope();
      showViews();
      return;
    }

    if (!finding) {
      finding = true;
      scope = scopeFor();
      renderScope();
      showViews();
    }

    var found = [];
    (scope ? [scope] : containers()).forEach(function (c) {
      c.entries.forEach(function (entry) {
        var hit = matches(entry, query) ||
          (titleOf(entry).toLowerCase().indexOf(query) > -1 ? titleOf(entry) : null);
        if (hit) { found.push({ entry: entry, container: c, hit: hit }); }
      });
    });
    found.sort(function (a, b) { return entryTouched(b.entry) - entryTouched(a.entry); });

    el.findN.textContent = found.length ? String(found.length) : "";
    el.resultsHead.textContent = (found.length === 1 ? "1 entry" : found.length + " entries") +
      (scope ? " in " + scope.name : " across everything");

    el.resultsList.textContent = "";
    found.forEach(function (f) {
      el.resultsList.appendChild(
        entryRow(f.entry, scope ? null : f.container, snippetFor(f.hit, query)));
    });
    el.resultsEmpty.hidden = found.length > 0;
  }

  function clearSearch() {
    el.find.value = "";
    runSearch();
  }

  el.find.addEventListener("input", runSearch);

  el.find.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (el.find.value) { clearSearch(); } else { el.find.blur(); }
    }
  });

  el.findScope.addEventListener("click", function () {
    scope = null;
    renderScope();
    runSearch();
    el.find.focus();
  });

  el.results.addEventListener("click", function (event) {
    var btn = event.target.closest(".row__btn");
    if (btn) {
      el.find.value = "";
      finding = false;
      scope = null;
      renderScope();
      el.findN.textContent = "";
      go("#/e/" + btn.dataset.n);
    }
  });

  /* --- destination picker ------------------------------------------------- */

  function renderMenu() {
    el.destMenu.textContent = "";

    function option(item, id, extra) {
      var li = elem("li", "dest__opt" + (extra ? " " + extra : ""));
      li.setAttribute("role", "option");
      li.setAttribute("tabindex", "-1");
      li.setAttribute("aria-selected", String(selected === id));
      li.dataset.id = id;
      li.appendChild(dyeNode(item.dye));
      li.appendChild(document.createTextNode(item.loose ? "Floating thought" : item.name));
      return li;
    }

    el.destMenu.appendChild(option(floating, "", "dest__opt--none"));
    if (notebooks.length) {
      var sep = elem("li", "dest__sep");
      sep.setAttribute("role", "presentation");
      el.destMenu.appendChild(sep);
    }
    notebooks.forEach(function (b) { el.destMenu.appendChild(option(b, b.id)); });
  }

  function menuOpen() { return el.destBtn.getAttribute("aria-expanded") === "true"; }

  function openMenu() {
    renderMenu();
    el.destMenu.hidden = false;
    el.destBtn.setAttribute("aria-expanded", "true");
    var active = el.destMenu.querySelector('[aria-selected="true"]') ||
                 el.destMenu.querySelector(".dest__opt");
    if (active) { active.focus(); }
  }

  function closeMenu(returnFocus) {
    el.destMenu.hidden = true;
    el.destBtn.setAttribute("aria-expanded", "false");
    if (returnFocus) { el.destBtn.focus(); }
  }

  function moveInMenu(from, step) {
    var opts = Array.prototype.slice.call(el.destMenu.querySelectorAll(".dest__opt"));
    var next = opts[(opts.indexOf(from) + step + opts.length) % opts.length];
    if (next) { next.focus(); }
  }

  el.destBtn.addEventListener("click", function () {
    if (menuOpen()) { closeMenu(false); } else { openMenu(); }
  });

  el.destBtn.addEventListener("keydown", function (event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu();
    }
  });

  el.destMenu.addEventListener("click", function (event) {
    var opt = event.target.closest(".dest__opt");
    if (!opt) { return; }
    selected = opt.dataset.id;
    renderSelection();
    closeMenu(true);
  });

  el.destMenu.addEventListener("keydown", function (event) {
    var opt = event.target.closest(".dest__opt");
    if (!opt) { return; }

    if (event.key === "ArrowDown") { event.preventDefault(); moveInMenu(opt, 1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); moveInMenu(opt, -1); }
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selected = opt.dataset.id;
      renderSelection();
      closeMenu(true);
    } else if (event.key === "Escape" || event.key === "Tab") {
      closeMenu(true);
    }
  });

  function renderSelection() {
    var book = containerById(selected) || floating;
    el.destDye.className = "dye dye--" + book.dye;
    el.destName.textContent = book.loose ? "Floating thought" : book.name;
    el.destEcho.textContent = book.loose ? "floating" : book.name;
  }

  /* --- clipped resources --------------------------------------------------

     Paste a URL, paste a screenshot, drop a file anywhere, or use Attach.
     Files are kept in IndexedDB alongside the entry; nothing is uploaded. */

  function isUrl(text) {
    return /^(https?:\/\/|www\.)\S+$/i.test(text.trim());
  }

  function formatSize(bytes) {
    if (bytes < 1024) { return bytes + " B"; }
    var units = ["KB", "MB", "GB"];
    var n = bytes / 1024;
    var i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; }
    return (n < 10 ? n.toFixed(1) : Math.round(n)) + " " + units[i];
  }

  function markFor(file) {
    var type = file.type || "";
    if (type.indexOf("image/") === 0) { return "IMG"; }
    if (type === "application/pdf") { return "PDF"; }
    if (type.indexOf("audio/") === 0) { return "AUD"; }
    if (type.indexOf("video/") === 0) { return "VID"; }
    if (type.indexOf("text/") === 0) { return "TXT"; }

    var dot = file.name.lastIndexOf(".");
    if (dot > -1 && dot < file.name.length - 1) {
      return file.name.slice(dot + 1, dot + 5).toUpperCase();
    }
    return "FILE";
  }

  function clipCount() {
    return clips.length + (clips.length === 1 ? " clip" : " clips");
  }

  function afterClips() {
    renderClips();
    updateCount();
    if (!composing) { setMode(true); }
    el.entry.focus();
    grow();
  }

  function addLink(raw) {
    var text = raw.trim();
    var href = /^www\./i.test(text) ? "https://" + text : text;
    var name, meta;

    try {
      var url = new URL(href);
      name = url.hostname.replace(/^www\./, "");
      meta = (url.pathname === "/" ? "" : decodeURIComponent(url.pathname)) + url.search;
      if (!meta) { meta = "link"; }
    } catch (err) {
      name = text;
      meta = "link";
    }

    clips.push({ mark: "LINK", name: name, meta: meta, href: href, thumb: null });
    afterClips();
  }

  function addFiles(list) {
    Array.prototype.forEach.call(list, function (file) {
      var clip = {
        id: "f" + Date.now() + Math.random().toString(36).slice(2, 8),
        mark: markFor(file),
        name: file.name,
        meta: formatSize(file.size),
        thumb: null
      };
      clips.push(clip);
      Store.putFile(clip.id, file);

      if (file.type.indexOf("image/") === 0 && file.size < 8 * 1024 * 1024) {
        var reader = new FileReader();
        reader.onload = function () { clip.thumb = reader.result; renderClips(); };
        reader.readAsDataURL(file);
      }
    });
    afterClips();
  }

  function renderClips() {
    el.clips.textContent = "";
    el.clips.hidden = clips.length === 0;

    clips.forEach(function (clip, index) {
      var li = clipNode(clip, false);

      var remove = elem("button", "clip__x", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", "Remove " + clip.name);
      remove.addEventListener("click", function () {
        clips.splice(index, 1);
        renderClips();
        updateCount();
        grow();
        el.entry.focus();
      });
      li.appendChild(remove);

      el.clips.appendChild(li);
    });
  }

  function updateCount() {
    var words = wordsIn(el.entry.value);
    var bits = [];
    if (words) { bits.push(words + " w"); }
    if (clips.length) { bits.push(clipCount()); }
    el.count.textContent = bits.join(" · ");
  }

  el.entry.addEventListener("paste", function (event) {
    var payload = event.clipboardData;
    if (!payload) { return; }

    if (payload.files && payload.files.length) {
      event.preventDefault();
      addFiles(payload.files);
      return;
    }

    var text = payload.getData("text");
    if (text && isUrl(text)) {
      event.preventDefault();
      addLink(text);
    }
  });

  el.attachBtn.addEventListener("click", function () { el.fileInput.click(); });

  el.fileInput.addEventListener("change", function () {
    if (el.fileInput.files.length) { addFiles(el.fileInput.files); }
    el.fileInput.value = "";
  });

  function draggingFiles(event) {
    var types = event.dataTransfer && event.dataTransfer.types;
    return !!types && Array.prototype.indexOf.call(types, "Files") > -1;
  }

  window.addEventListener("dragenter", function (event) {
    if (!draggingFiles(event)) { return; }
    event.preventDefault();
    dragDepth += 1;
    el.body.dataset.drop = "on";
  });

  window.addEventListener("dragover", function (event) {
    if (draggingFiles(event)) { event.preventDefault(); }
  });

  window.addEventListener("dragleave", function () {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) { delete el.body.dataset.drop; }
  });

  window.addEventListener("drop", function (event) {
    if (!draggingFiles(event)) { return; }
    event.preventDefault();
    dragDepth = 0;
    delete el.body.dataset.drop;
    addFiles(event.dataTransfer.files);
  });

  /* --- compose mode ------------------------------------------------------- */

  function measureThesis() {
    if (composing) { return; }
    document.documentElement.style.setProperty(
      "--thesis-h", (el.thesis.scrollHeight + 2) + "px");
  }

  function grow() {
    el.entry.style.height = "auto";
    el.entry.style.height = el.entry.scrollHeight + "px";
  }

  function setMode(on) {
    if (composing === on) { return; }
    composing = on;

    if (on) {
      measureThesis();
      el.body.dataset.mode = "compose";
    } else {
      delete el.body.dataset.mode;
    }

    if (!el.hint.classList.contains("slate__hint--done")) {
      el.hint.textContent = restingHint();
    }
    requestAnimationFrame(grow);
  }

  function say(message, n) {
    window.clearTimeout(hintTimer);
    el.hint.textContent = message;
    el.hint.classList.add("slate__hint--done");

    if (n) {
      var link = document.createElement("a");
      link.className = "hint__open";
      link.href = "#/e/" + n;
      link.textContent = "Open";
      el.hint.appendChild(document.createTextNode(" "));
      el.hint.appendChild(link);
    }

    hintTimer = window.setTimeout(function () {
      el.hint.classList.remove("slate__hint--done");
      el.hint.textContent = restingHint();
    }, 9000);
  }

  el.entry.addEventListener("focus", function () { setMode(true); });

  el.entry.addEventListener("input", function () {
    updateCount();
    grow();
  });

  el.entry.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      el.entryForm.requestSubmit();
    } else if (event.key === "Escape") {
      el.entry.blur();
      setMode(false);
    }
  });

  document.addEventListener("mousedown", function (event) {
    if (menuOpen() && !event.target.closest(".dest")) { closeMenu(false); }
    if (composing && !event.target.closest(".composer") &&
        !event.target.closest(".pickup")) {
      el.entry.blur();
      setMode(false);
    }
  });

  /* --- writing it down ---------------------------------------------------- */

  el.entryForm.addEventListener("submit", function (event) {
    event.preventDefault();

    var text = el.entry.value.trim();

    if (isUrl(text)) {
      el.entry.value = "";
      addLink(text);
      text = "";
    }
    if (text === "" && clips.length === 0) { el.entry.focus(); return; }

    var words = wordsIn(text);
    var clipped = clips.length ? " · " + clipCount() : "";
    var counted = words ? " · " + words + " w" : "";
    var passage = {
      at: Date.now(),
      text: text || clips[0].name,
      clips: clips.slice()
    };

    clips = [];
    el.entry.value = "";
    renderClips();
    updateCount();
    grow();

    if (context === "entry") {
      openEntry.passages.push(passage);
      save(openEntry, openBook);
      renderPassages();
      say("Added to " + entryLabel(openEntry) + counted + clipped);
      el.entry.focus();
      return;
    }

    var container = context === "book" ? openBook : (containerById(selected) || floating);
    var entry = { n: nextNumber(), book: "", passages: [passage] };
    container.entries.push(entry);
    save(entry, container);

    if (context === "book") {
      renderBookEntries(container.entries.slice().sort(byRecency));
      say(entryLabel(entry) + " started in " + container.name + counted + clipped, entry.n);
    } else {
      renderBooks();
      el.nextEntry.textContent = String(nextNumber()).padStart(4, "0");
      say(container.loose
        ? entryLabel(entry) + " left floating" + counted + clipped
        : entryLabel(entry) + " → " + container.name + counted + clipped,
        entry.n);
    }

    el.entry.focus();
  });

  /* --- copying it out -----------------------------------------------------

     Plain text, no markup: it should read the same in a mail draft, a text
     file, or a document. Lines aren't hard-wrapped so they reflow wherever
     they land. */

  var RULE = "────────────────────────────────────────";
  var HEAVY = "════════════════════════════════════════";

  function reportEntry(entry, container, nested) {
    var head = "ENTRY " + entryNo(entry);
    if (!nested) { head += " · " + (container.loose ? "Floating" : container.name); }

    var out = [head, "Started " + stamp(entryStarted(entry)), ""];

    inOrder(entry.passages).forEach(function (passage) {
      out.push(stamp(passage.at) + " · " + timeOf(passage));
      out.push(passage.text);
      passage.clips.forEach(function (c) {
        out.push("    [" + c.mark + "] " + c.name + (c.meta ? " · " + c.meta : ""));
      });
      out.push("");
    });

    return out.join("\n").trim();
  }

  function reportContainer(container, nested) {
    var entries = container.entries.slice().sort(byRecency);
    var count = entries.length + (entries.length === 1 ? " entry" : " entries");

    var out = [container.name.toUpperCase(),
               nested ? count : count + " · copied " + stamp(Date.now()), ""];

    entries.forEach(function (entry, i) {
      if (i) { out.push(RULE, ""); }
      out.push(reportEntry(entry, container, true), "");
    });

    if (!entries.length) { out.push("(empty)"); }
    return out.join("\n").trim();
  }

  function reportEverything() {
    var entries = 0;
    containers().forEach(function (c) { entries += c.entries.length; });

    var out = ["NOTEBOOK — FULL SNAPSHOT",
               "Copied " + stamp(Date.now()) + " · " + notebooks.length + " notebooks · " +
               entries + (entries === 1 ? " entry" : " entries"), ""];

    containers().forEach(function (c) {
      out.push(HEAVY, "");
      out.push(reportContainer(c, true), "");
    });

    return out.join("\n").trim();
  }

  function legacyCopy(text) {
    var pad = document.createElement("textarea");
    pad.value = text;
    pad.setAttribute("readonly", "");
    pad.style.cssText = "position:fixed;top:-1000px;opacity:0";
    document.body.appendChild(pad);
    pad.select();

    var ok = false;
    try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
    document.body.removeChild(pad);
    return ok;
  }

  function flash(button, message) {
    var label = button.querySelector(".copy__label");
    if (button.dataset.said) { return; }
    button.dataset.said = label.textContent;
    label.textContent = message;
    button.classList.add("copy--done");

    window.setTimeout(function () {
      label.textContent = button.dataset.said;
      delete button.dataset.said;
      button.classList.remove("copy--done");
    }, 2200);
  }

  function openReport(text, what) {
    el.reportHead.textContent = "Select all, then copy — " + what;
    el.reportText.value = text;
    el.report.hidden = false;
    el.reportText.focus();
    el.reportText.select();
  }

  function copyOut(text, button, what) {
    function settle(ok) {
      if (ok) { flash(button, "Copied"); return; }
      flash(button, "Couldn't copy");
      openReport(text, what);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { settle(true); },
        function () { settle(legacyCopy(text)); }
      );
      return;
    }
    settle(legacyCopy(text));
  }

  el.copyEntry.addEventListener("click", function () {
    copyOut(reportEntry(openEntry, openBook), el.copyEntry, "Entry " + entryNo(openEntry));
  });

  el.copyBook.addEventListener("click", function () {
    copyOut(reportContainer(openBook), el.copyBook, openBook.name);
  });

  el.copyAll.addEventListener("click", function () {
    copyOut(reportEverything(), el.copyAll, "the full snapshot");
  });

  function closeReport() { el.report.hidden = true; }

  el.reportClose.addEventListener("click", closeReport);
  el.reportText.addEventListener("keydown", function (event) {
    if (event.key === "Escape") { closeReport(); }
  });
  el.report.addEventListener("click", function (event) {
    if (event.target === el.report) { closeReport(); }
  });

  /* --- a new notebook ----------------------------------------------------- */

  function closeNewBook(form) {
    form.replaceWith(el.bookNew);
    el.bookNew.focus();
  }

  el.bookNew.addEventListener("click", function () {
    var form = document.createElement("form");
    form.className = "book-new book-new--open";

    var input = document.createElement("input");
    input.type = "text";
    input.className = "book-new__input";
    input.placeholder = "Name it…";
    input.setAttribute("aria-label", "Name the new notebook");

    var add = elem("button", "book-new__add stamp", "Add");
    add.type = "submit";

    form.appendChild(input);
    form.appendChild(add);
    el.bookNew.replaceWith(form);
    input.focus();

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var name = input.value.trim();
      if (name === "") { closeNewBook(form); return; }

      var book = {
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now(),
        name: name,
        dye: dyes[notebooks.length % dyes.length],
        order: notebooks.length,
        entries: []
      };
      notebooks.push(book);
      Store.putBook(book);

      selected = book.id;
      closeNewBook(form);
      renderBooks();
      renderSelection();
      say(name + " started · new entries land there");
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { closeNewBook(form); }
    });
  });

  /* --- dateline ----------------------------------------------------------- */

  var narrow = window.matchMedia("(max-width: 34em)");

  function writeDateline() {
    var now = new Date();
    var time = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

    if (narrow.matches) {
      el.dateline.textContent =
        now.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " · " + time;
      return;
    }
    el.dateline.textContent =
      now.toLocaleDateString(undefined, { weekday: "long" }) + " · " +
      now.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) +
      " · " + time;
  }

  /* --- keyboard ----------------------------------------------------------- */

  document.addEventListener("keydown", function (event) {
    var typing = event.target.matches("input, textarea, [contenteditable]");
    if (typing || event.metaKey || event.ctrlKey || event.altKey) { return; }

    if (event.key === "n") {
      event.preventDefault();
      if (finding) { clearSearch(); }
      el.entry.focus();
    } else if (event.key === "/") {
      event.preventDefault();
      el.find.focus();
    } else if (event.key === "Escape") {
      if (!el.report.hidden) { closeReport(); }
      else if (finding) { clearSearch(); }
      else if (view !== "home") { go(view === "entry" ? "#/n/" + openBook.id : "#/"); }
    }
  });

  window.addEventListener("resize", function () {
    measureThesis();
    grow();
  });

  window.addEventListener("hashchange", route);

  /* --- go ----------------------------------------------------------------- */

  writeDateline();
  setInterval(writeDateline, 30000);
  narrow.addEventListener("change", writeDateline);

  Store.load().then(function (data) {
    data.books.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    data.books.forEach(function (b) {
      notebooks.push({ id: b.id, name: b.name, dye: b.dye, order: b.order, entries: [] });
    });

    data.entries.forEach(function (entry) {
      var container = containerById(entry.book) || floating;
      container.entries.push(entry);
    });
  }).catch(function () {
    /* no storage (private mode, or it's blocked) — run in memory for now */
    say("Storage isn't available here, so nothing will be kept after you close this.");
  }).then(function () {
    el.body.dataset.ready = "yes";
    renderClips();
    updateCount();
    route();
    grow();
    measureThesis();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureThesis);
    }
  });
})();
