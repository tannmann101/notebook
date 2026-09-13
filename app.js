/* Notebook.

   An entry is a thread. You start it with a line, and every time you come back
   you add a dated sitting to the same thread. Entries live in a notebook, or
   they float.

   Three views, one composer. The composer moves to whichever view is asking:
   on the home screen it starts an entry, in a notebook it starts one already
   filed there, and inside an entry it picks the thread back up.

   Nothing is stored. Figures come from data.js and reset on refresh. */

(function () {
  "use strict";

  var data = window.NOTEBOOK_DATA;
  var notebooks = data.notebooks;
  var floating = { id: "floating", name: "Floating thoughts", dye: "none",
                   entries: data.floating, loose: true };

  var dyes = ["brass", "verdigris", "oxblood", "bone", "slate", "lead"];

  var view = "home";        /* home | book | entry */
  var openBook = null;      /* container being viewed */
  var openEntry = null;     /* entry being viewed */
  var selected = "";        /* composer destination on home; "" is floating */
  var context = "home";     /* where the composer currently sits */
  var composing = false;
  var clips = [];
  var dragDepth = 0;

  var HINT_REST = "Left unfiled, it stays a floating thought — kept, just not put away.";
  var HINT_WRITE = "Enter files it · Shift + Enter for a new line · Paste or drop to clip · Esc steps back";
  var HINT_PICKUP = "Enter adds it to this entry, dated today · Esc steps back";

  var el = {};
  [ "entry-form", "entry", "thesis", "count", "hint", "next-folio", "dest-echo",
    "dest", "dest-btn", "dest-dye", "dest-name", "dest-menu", "dest-fixed",
    "books", "book-new", "float-btn", "float-n",
    "counts", "clips", "attach-btn", "file-input", "dateline", "composer",
    "view-home", "view-book", "view-entry", "home-body", "results",
    "find-all", "find-all-n", "find-book", "find-book-n",
    "slot-home", "slot-book", "slot-entry", "book-dye", "book-name",
    "book-entries", "book-empty", "entry-back", "entry-folio", "entry-title",
    "entry-meta", "entry-passages", "pickup-date", "colophon"
  ].forEach(function (id) {
    el[id.replace(/-(\w)/g, function (m, c) { return c.toUpperCase(); })] =
      document.getElementById(id);
  });
  el.body = document.body;
  el.open = document.querySelector(".open");

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

  function dateFor(daysAgo) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - daysAgo);
    return d;
  }

  function stamp(daysAgo) {
    var d = dateFor(daysAgo);
    var month = d.toLocaleDateString(undefined, { month: "short" })
      .replace(".", "").toUpperCase();
    return String(d.getDate()).padStart(2, "0") + " " + month + " " + d.getFullYear();
  }

  function containers() { return notebooks.concat([floating]); }

  function containerById(id) {
    if (id === "floating" || id === "") { return floating; }
    for (var i = 0; i < notebooks.length; i += 1) {
      if (notebooks[i].id === id) { return notebooks[i]; }
    }
    return null;
  }

  function findEntry(folio) {
    var found = null;
    containers().forEach(function (c) {
      c.entries.forEach(function (e) {
        if (e.folio === folio) { found = { entry: e, container: c }; }
      });
    });
    return found;
  }

  function openingLine(entry) {
    var first = entry.passages.slice()
      .sort(function (a, b) { return b.daysAgo - a.daysAgo; })[0];
    return (first.text.split("\n")[0] || "").trim();
  }

  /* an entry is named by however it opened */
  function titleOf(entry) {
    return clamp(openingLine(entry), 64);
  }

  function entryWords(entry) {
    return entry.passages.reduce(function (n, p) { return n + wordsIn(p.text); }, 0);
  }

  function entryTouched(entry) {
    return Math.min.apply(null, entry.passages.map(function (p) { return p.daysAgo; }));
  }

  function entryStarted(entry) {
    return Math.max.apply(null, entry.passages.map(function (p) { return p.daysAgo; }));
  }

  function entryClips(entry) {
    return entry.passages.reduce(function (n, p) { return n + p.clips.length; }, 0);
  }

  function countWords(container) {
    return container.entries.reduce(function (n, e) { return n + entryWords(e); }, 0);
  }

  function byRecency(a, b) { return entryTouched(a) - entryTouched(b); }

  /* the row's second line: the latest sitting, minus whatever the title
     already showed */
  function snipFor(entry) {
    var latest = entry.passages.slice()
      .sort(function (a, b) { return a.daysAgo - b.daysAgo; })[0]
      .text.replace(/\s+/g, " ");

    if (entry.passages.length > 1) { return clamp(latest, 118); }

    /* one sitting: show whatever the title didn't. If the title already ran
       out of room, a continuation would start mid-thought — say nothing. */
    var opening = openingLine(entry);
    if (opening.length > 64) { return ""; }
    return clamp(latest.slice(opening.length).trim(), 118);
  }

  function sittings(n) { return n + (n === 1 ? " sitting" : " sittings"); }

  function nextFolio() {
    var top = 0;
    containers().forEach(function (c) {
      c.entries.forEach(function (e) {
        var n = parseInt(e.folio.replace("F.", ""), 10);
        if (n > top) { top = n; }
      });
    });
    return "F." + String(top + 1).padStart(3, "0");
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

  /* --- routing ------------------------------------------------------------ */

  function go(hash) {
    if (window.location.hash === hash) { route(); } else { window.location.hash = hash; }
  }

  function route() {
    var hash = window.location.hash || "#/";
    var parts = hash.replace(/^#\//, "").split("/");

    if (parts[0] === "n" && parts[1]) {
      var container = containerById(decodeURIComponent(parts[1]));
      if (container) { showBook(container); return; }
    }
    if (parts[0] === "e" && parts[1]) {
      var hit = findEntry(decodeURIComponent(parts[1]).toUpperCase());
      if (hit) { showEntry(hit.entry, hit.container); return; }
    }
    showHome();
  }

  function setView(name) {
    view = name;
    el.body.dataset.view = name;
    el.viewHome.hidden = name !== "home";
    el.viewBook.hidden = name !== "book";
    el.viewEntry.hidden = name !== "entry";
    el.colophon.hidden = name !== "home";
    window.scrollTo(0, 0);
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
      el.destFixed.textContent = "→ picking up " + openEntry.folio;
    }

    el.entry.placeholder = onEntry
      ? "Pick it up…"
      : "A line, a scrap, a thought…";

    if (!el.hint.classList.contains("slate__hint--done")) { el.hint.textContent = restingHint(); }
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
    el.nextFolio.textContent = nextFolio();
    renderBooks();
    renderSelection();
    runSearch(el.findAll, el.findAllN, null);
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
    var entries = 0, words = 0, oldest = 0;
    containers().forEach(function (c) {
      entries += c.entries.length;
      words += countWords(c);
      c.entries.forEach(function (e) {
        var started = entryStarted(e);
        if (started > oldest) { oldest = started; }
      });
    });

    el.counts.textContent = "";
    el.counts.appendChild(countItem("Notebooks", num(notebooks.length)));
    el.counts.appendChild(countItem("Entries", num(entries)));
    el.counts.appendChild(countItem("Words", num(words)));
    el.counts.appendChild(countItem("Kept since", dateFor(oldest)
      .toLocaleDateString(undefined, { month: "short", year: "numeric" })));
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
    el.findBook.value = "";
    renderBookEntries(container.entries.slice().sort(byRecency));
    el.findBookN.textContent = "";
  }

  function entryRow(entry, container, snippetNode) {
    var li = elem("li", "row");
    var btn = elem("button", "row__btn");
    btn.type = "button";
    btn.dataset.folio = entry.folio;

    var head = elem("div", "row__head");
    head.appendChild(elem("span", "row__stamp stamp", stamp(entryTouched(entry))));
    if (container && container !== openBook) {
      var where = elem("span", "row__where stamp");
      where.appendChild(dyeNode(container.dye));
      where.appendChild(document.createTextNode(container.loose ? "floating" : container.name));
      head.appendChild(where);
    }
    head.appendChild(elem("span", "row__folio stamp", entry.folio));

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
    if (btn) { go("#/e/" + btn.dataset.folio); }
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

    el.entryFolio.textContent = "Entry " + entry.folio;
    el.entryTitle.textContent = titleOf(entry);
    el.entryMeta.textContent = "Started " + stamp(entryStarted(entry));

    renderPassages();
    moveComposer(el.slotEntry, "entry");
    el.pickupDate.textContent = "Today · " + stamp(0);
  }

  function clipNode(clip) {
    var li = elem("li", "clip clip--still");
    li.appendChild(elem("span", "clip__mark", clip.mark));
    var body = elem("div", "clip__body");
    body.appendChild(elem("span", "clip__name", clip.name));
    body.appendChild(elem("span", "clip__meta", clip.meta));
    li.appendChild(body);
    return li;
  }

  function renderPassages() {
    el.entryPassages.textContent = "";

    openEntry.passages.slice()
      .sort(function (a, b) { return b.daysAgo - a.daysAgo; })
      .forEach(function (passage) {
        var li = elem("li", "passage");
        li.appendChild(elem("p", "passage__stamp stamp", stamp(passage.daysAgo)));

        var body = elem("div", "passage__body");
        passage.text.split("\n").forEach(function (line) {
          if (line.trim()) { body.appendChild(elem("p", "passage__text", line)); }
        });

        if (passage.clips.length) {
          var list = elem("ul", "clips clips--still");
          passage.clips.forEach(function (c) { list.appendChild(clipNode(c)); });
          body.appendChild(list);
        }

        li.appendChild(body);
        el.entryPassages.appendChild(li);
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

  /* one search, two scopes: pass a container to stay inside it */
  function runSearch(input, counter, container) {
    var query = input.value.trim().toLowerCase();
    var scope = container ? [container] : containers();

    if (query === "") {
      counter.textContent = "";
      if (container) {
        renderBookEntries(container.entries.slice().sort(byRecency));
      } else {
        el.results.hidden = true;
        el.results.textContent = "";
        el.homeBody.hidden = false;
      }
      return;
    }

    var found = [];
    scope.forEach(function (c) {
      c.entries.forEach(function (entry) {
        var hit = matches(entry, query) ||
          (titleOf(entry).toLowerCase().indexOf(query) > -1 ? titleOf(entry) : null);
        if (hit) { found.push({ entry: entry, container: c, hit: hit }); }
      });
    });
    found.sort(function (a, b) { return entryTouched(a.entry) - entryTouched(b.entry); });

    counter.textContent = found.length === 1 ? "1 entry" : found.length + " entries";

    if (container) {
      el.bookEntries.textContent = "";
      found.forEach(function (f) {
        el.bookEntries.appendChild(entryRow(f.entry, container, snippetFor(f.hit, query)));
      });
      el.bookEmpty.hidden = found.length > 0;
      return;
    }

    el.homeBody.hidden = true;
    el.results.hidden = false;
    el.results.textContent = "";

    var list = elem("ol", "entries");
    found.forEach(function (f) {
      list.appendChild(entryRow(f.entry, f.container, snippetFor(f.hit, query)));
    });
    if (!found.length) {
      el.results.appendChild(elem("p", "empty", "Nothing matches that. It may not have been written down yet."));
    }
    el.results.appendChild(list);
  }

  el.findAll.addEventListener("input", function () {
    runSearch(el.findAll, el.findAllN, null);
  });
  el.findBook.addEventListener("input", function () {
    runSearch(el.findBook, el.findBookN, openBook);
  });

  [el.findAll, el.findBook].forEach(function (input) {
    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        input.value = "";
        input.dispatchEvent(new Event("input"));
        input.blur();
      }
    });
  });

  el.results.addEventListener("click", function (event) {
    var btn = event.target.closest(".row__btn");
    if (btn) { go("#/e/" + btn.dataset.folio); }
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
    var sep = elem("li", "dest__sep");
    sep.setAttribute("role", "presentation");
    el.destMenu.appendChild(sep);
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
    var book = containerById(selected);
    el.destDye.className = "dye dye--" + book.dye;
    el.destName.textContent = book.loose ? "Floating thought" : book.name;
    el.destEcho.textContent = book.loose ? "floating" : book.name;
  }

  /* --- clipped resources --------------------------------------------------

     Paste a URL, paste a screenshot, drop a file anywhere, or use Attach.
     Nothing is uploaded — name, kind and size are held until storage lands. */

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
      var clip = { mark: markFor(file), name: file.name,
                   meta: formatSize(file.size), thumb: null };
      clips.push(clip);

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
      var li = elem("li", "clip");

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

  function say(message, folio) {
    window.clearTimeout(hintTimer);
    el.hint.textContent = message;
    el.hint.classList.add("slate__hint--done");

    if (folio) {
      var link = document.createElement("a");
      link.className = "hint__open";
      link.href = "#/e/" + folio;
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
    var passage = {
      daysAgo: 0,
      text: text || clips[0].name,
      clips: clips.map(function (c) {
        return { mark: c.mark, name: c.name, meta: c.meta };
      })
    };

    clips = [];
    el.entry.value = "";
    renderClips();
    updateCount();
    grow();

    if (context === "entry") {
      openEntry.passages.push(passage);
      renderPassages();
      say("Added to " + openEntry.folio + " · " + words + " w" + clipped);
      el.entry.focus();
      return;
    }

    var container = context === "book" ? openBook : containerById(selected);
    var entry = { folio: nextFolio(), passages: [passage] };
    container.entries.push(entry);

    if (context === "book") {
      renderBookEntries(container.entries.slice().sort(byRecency));
      say(entry.folio + " started in " + container.name + " · " + words + " w" + clipped,
        entry.folio);
    } else {
      renderBooks();
      el.nextFolio.textContent = nextFolio();
      say(container.loose
        ? entry.folio + " left floating · " + words + " w" + clipped
        : entry.folio + " → " + container.name + " · " + words + " w" + clipped,
        entry.folio);
    }

    el.entry.focus();
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

      var id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
      notebooks.push({ id: id, name: name,
                       dye: dyes[notebooks.length % dyes.length], entries: [] });
      selected = id;
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
      el.entry.focus();
    } else if (event.key === "/") {
      var box = view === "book" ? el.findBook : el.findAll;
      if (view !== "entry") { event.preventDefault(); box.focus(); }
    } else if (event.key === "Escape" && view !== "home") {
      go(view === "entry" ? "#/n/" + openBook.id : "#/");
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

  renderClips();
  updateCount();
  route();
  grow();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measureThesis);
  }
  measureThesis();
})();
