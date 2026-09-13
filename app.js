/* Notebook — home screen.

   Two states:
     rest     — an index of notebooks, with unfiled thoughts kept apart.
     compose  — focus the writing area and the room goes down, a lamp comes
                up, and what you type takes the headline's place at display
                scale. Enter files it. Esc steps back.

   Figures below are samples. Storage comes next; nothing survives a refresh. */

(function () {
  "use strict";

  /* --- data -------------------------------------------------------------- */

  var notebooks = [
    { id: "field-notes", name: "Field notes", dye: "verdigris", entries: 37, words: 15170, lastDays: 1 },
    { id: "scraps",      name: "Scraps",      dye: "lead",      entries: 31, words:  4340, lastDays: 0 },
    { id: "workshop",    name: "Workshop",    dye: "oxblood",   entries: 24, words: 12480, lastDays: 2 },
    { id: "half-built",  name: "Half-built",  dye: "brass",     entries: 17, words: 21930, lastDays: 9 },
    { id: "kitchen",     name: "Kitchen",     dye: "bone",      entries: 11, words:  4180, lastDays: 4 },
    { id: "margins",     name: "Margins",     dye: "slate",     entries:  8, words:   760, lastDays: 16 }
  ];

  /* Entries nobody filed. Not a notebook, and not counted as one. */
  var floating = { id: "", name: "Floating thought", dye: "none",
                   entries: 19, words: 2344, lastDays: 0 };

  var dyes = ["brass", "verdigris", "oxblood", "bone", "slate", "lead"];
  var keptSince = "4 Mar 2024";

  var nextFolio = 15;
  var selected = "";        /* "" is floating */
  var composing = false;

  var HINT_REST = "Left unfiled, it stays a floating thought — kept, just not put away.";
  var HINT_WRITE = "Enter files it · Shift + Enter for a new line · Paste or drop to clip · Esc steps back";

  /* --- elements ---------------------------------------------------------- */

  var el = {
    body: document.body,
    form: document.getElementById("entry-form"),
    area: document.getElementById("entry"),
    thesis: document.getElementById("thesis"),
    count: document.getElementById("count"),
    hint: document.getElementById("hint"),
    folio: document.getElementById("next-folio"),
    destEcho: document.getElementById("dest-echo"),
    dest: document.getElementById("dest"),
    destBtn: document.getElementById("dest-btn"),
    destDye: document.getElementById("dest-dye"),
    destName: document.getElementById("dest-name"),
    destMenu: document.getElementById("dest-menu"),
    books: document.getElementById("books"),
    booksNote: document.getElementById("books-note"),
    bookNew: document.getElementById("book-new"),
    floatBtn: document.getElementById("float-btn"),
    floatN: document.getElementById("float-n"),
    floatW: document.getElementById("float-w"),
    counts: document.getElementById("counts"),
    clips: document.getElementById("clips"),
    attachBtn: document.getElementById("attach-btn"),
    fileInput: document.getElementById("file-input"),
    dateline: document.getElementById("dateline"),
    open: document.querySelector(".open")
  };

  var hintTimer = null;

  /* --- helpers ----------------------------------------------------------- */

  function wordsIn(text) {
    var trimmed = text.trim();
    return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
  }

  function folioLabel(n) { return "F." + String(n).padStart(3, "0"); }
  function num(n) { return n.toLocaleString(); }

  function bookById(id) {
    for (var i = 0; i < notebooks.length; i += 1) {
      if (notebooks[i].id === id) { return notebooks[i]; }
    }
    return null;
  }

  function current() { return bookById(selected) || floating; }

  function totals() {
    var t = { entries: floating.entries, words: floating.words };
    notebooks.forEach(function (b) { t.entries += b.entries; t.words += b.words; });
    return t;
  }

  function sinceLast(days) {
    if (days === 0) { return "Today"; }
    if (days === 1) { return "Yesterday"; }
    if (days < 14) { return days + " days ago"; }
    return Math.round(days / 7) + " weeks ago";
  }

  function dyeNode(name) {
    var d = document.createElement("span");
    d.className = "dye dye--" + name;
    d.setAttribute("aria-hidden", "true");
    return d;
  }

  /* --- the notebook index ------------------------------------------------ */

  function renderBooks() {
    el.books.textContent = "";

    notebooks.forEach(function (book) {
      var li = document.createElement("li");
      li.className = "book";

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "book__btn";
      btn.dataset.id = book.id;
      btn.setAttribute("aria-pressed", String(selected === book.id));

      var name = document.createElement("span");
      name.className = "book__name";
      name.appendChild(dyeNode(book.dye));
      name.appendChild(document.createTextNode(book.name));

      var leader = document.createElement("span");
      leader.className = "book__leader";
      leader.setAttribute("aria-hidden", "true");

      var n = document.createElement("span");
      n.className = "book__n stamp";
      n.textContent = num(book.entries);

      btn.appendChild(name);
      btn.appendChild(leader);
      btn.appendChild(n);
      li.appendChild(btn);
      el.books.appendChild(li);
    });

    var filed = notebooks.reduce(function (n, b) { return n + b.entries; }, 0);
    el.booksNote.textContent = notebooks.length + " books · " + num(filed) + " entries";
    el.floatN.textContent = num(floating.entries);
    el.floatW.textContent = num(floating.words);
  }

  /* --- the colophon, scoped to whatever is selected ----------------------- */

  function countItem(label, value, dye, isScope) {
    var wrap = document.createElement("div");
    if (isScope) { wrap.className = "counts__scope"; }

    var dt = document.createElement("dt");
    if (dye) { dt.appendChild(dyeNode(dye)); }
    dt.appendChild(document.createTextNode(label));

    var dd = document.createElement("dd");
    dd.textContent = value;

    wrap.appendChild(dt);
    wrap.appendChild(dd);
    return wrap;
  }

  function renderCounts() {
    var book = bookById(selected);
    el.counts.textContent = "";

    if (!book) {
      var t = totals();
      el.counts.appendChild(countItem("Notebooks", num(notebooks.length)));
      el.counts.appendChild(countItem("Entries", num(t.entries)));
      el.counts.appendChild(countItem("Words", num(t.words)));
      el.counts.appendChild(countItem("Kept since", keptSince));
      return;
    }

    el.counts.appendChild(countItem("Notebook", book.name, book.dye, true));
    el.counts.appendChild(countItem("Entries", num(book.entries)));
    el.counts.appendChild(countItem("Words", num(book.words)));
    el.counts.appendChild(countItem("Last entry", sinceLast(book.lastDays)));

    var all = document.createElement("button");
    all.type = "button";
    all.className = "counts__all";
    all.textContent = "All";
    all.addEventListener("click", function () { select(""); });
    el.counts.appendChild(all);
  }

  /* --- destination picker ------------------------------------------------ */

  function renderMenu() {
    el.destMenu.textContent = "";

    function option(item, extraClass) {
      var li = document.createElement("li");
      li.className = "dest__opt" + (extraClass ? " " + extraClass : "");
      li.setAttribute("role", "option");
      li.setAttribute("tabindex", "-1");
      li.setAttribute("aria-selected", String(selected === item.id));
      li.dataset.id = item.id;
      li.appendChild(dyeNode(item.dye));
      li.appendChild(document.createTextNode(item.name));
      return li;
    }

    el.destMenu.appendChild(option(floating, "dest__opt--none"));

    var sep = document.createElement("li");
    sep.className = "dest__sep";
    sep.setAttribute("role", "presentation");
    el.destMenu.appendChild(sep);

    notebooks.forEach(function (b) { el.destMenu.appendChild(option(b)); });
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
    var i = opts.indexOf(from);
    var next = opts[(i + step + opts.length) % opts.length];
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
    select(opt.dataset.id);
    closeMenu(true);
  });

  el.destMenu.addEventListener("keydown", function (event) {
    var opt = event.target.closest(".dest__opt");
    if (!opt) { return; }

    if (event.key === "ArrowDown") { event.preventDefault(); moveInMenu(opt, 1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); moveInMenu(opt, -1); }
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select(opt.dataset.id);
      closeMenu(true);
    } else if (event.key === "Escape" || event.key === "Tab") {
      closeMenu(true);
    }
  });

  /* --- selection --------------------------------------------------------- */

  function select(id) {
    selected = id;
    renderSelection();
  }

  function renderSelection() {
    var book = bookById(selected);
    var item = book || floating;

    el.destDye.className = "dye dye--" + item.dye;
    el.destName.textContent = book ? book.name : "Floating thought";
    el.destEcho.textContent = book ? book.name : "floating";

    var buttons = el.books.querySelectorAll(".book__btn");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].setAttribute("aria-pressed", String(buttons[i].dataset.id === selected));
    }
    el.floatBtn.setAttribute("aria-pressed", String(!book));

    renderCounts();
  }

  el.books.addEventListener("click", function (event) {
    var btn = event.target.closest(".book__btn");
    if (btn) { select(btn.dataset.id); }
  });

  el.floatBtn.addEventListener("click", function () { select(""); });

  /* --- compose mode ------------------------------------------------------ */

  function measureThesis() {
    if (composing) { return; }
    document.documentElement.style.setProperty(
      "--thesis-h", (el.thesis.scrollHeight + 2) + "px");
  }

  function grow() {
    el.area.style.height = "auto";
    el.area.style.height = el.area.scrollHeight + "px";
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
      el.hint.textContent = on ? HINT_WRITE : HINT_REST;
    }
    requestAnimationFrame(grow);
  }

  function say(message) {
    window.clearTimeout(hintTimer);
    el.hint.textContent = message;
    el.hint.classList.add("slate__hint--done");
    hintTimer = window.setTimeout(function () {
      el.hint.classList.remove("slate__hint--done");
      el.hint.textContent = composing ? HINT_WRITE : HINT_REST;
    }, 7000);
  }

  el.area.addEventListener("focus", function () { setMode(true); });

  el.area.addEventListener("input", function () {
    updateCount();
    grow();
  });

  el.area.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      el.form.requestSubmit();
    } else if (event.key === "Escape") {
      el.area.blur();
      setMode(false);
    }
  });

  /* Clicking off the writing area puts the room back up. */
  document.addEventListener("mousedown", function (event) {
    if (menuOpen() && !event.target.closest(".dest")) { closeMenu(false); }
    if (composing && !event.target.closest(".open")) {
      el.area.blur();
      setMode(false);
    }
  });

  /* --- clipped resources --------------------------------------------------

     A link or a file rides along with the entry. Paste a URL, paste a
     screenshot, drop a file anywhere on the window, or use Attach. Nothing
     here is uploaded — we hold the name, kind and size until storage lands. */

  var clips = [];
  var dragDepth = 0;

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
    el.area.focus();
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
        mark: markFor(file),
        name: file.name,
        meta: formatSize(file.size),
        thumb: null
      };
      clips.push(clip);

      /* a picture is worth showing; everything else gets its mark */
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
      var li = document.createElement("li");
      li.className = "clip";

      if (clip.thumb) {
        var img = document.createElement("img");
        img.className = "clip__thumb";
        img.src = clip.thumb;
        img.alt = "";
        li.appendChild(img);
      } else {
        var mark = document.createElement("span");
        mark.className = "clip__mark";
        mark.textContent = clip.mark;
        li.appendChild(mark);
      }

      var body = document.createElement("div");
      body.className = "clip__body";

      var name = document.createElement("span");
      name.className = "clip__name";
      name.textContent = clip.name;

      var meta = document.createElement("span");
      meta.className = "clip__meta";
      meta.textContent = clip.meta;

      body.appendChild(name);
      body.appendChild(meta);
      li.appendChild(body);

      var drop = document.createElement("button");
      drop.type = "button";
      drop.className = "clip__x";
      drop.textContent = "\u00d7";
      drop.setAttribute("aria-label", "Remove " + clip.name);
      drop.addEventListener("click", function () {
        clips.splice(index, 1);
        renderClips();
        updateCount();
        grow();
        el.area.focus();
      });
      li.appendChild(drop);

      el.clips.appendChild(li);
    });
  }

  function updateCount() {
    var label = wordsIn(el.area.value) + " w";
    if (clips.length) { label += " · " + clipCount(); }
    el.count.textContent = label;
  }

  /* paste a link, or a screenshot, straight into the entry */
  el.area.addEventListener("paste", function (event) {
    var data = event.clipboardData;
    if (!data) { return; }

    if (data.files && data.files.length) {
      event.preventDefault();
      addFiles(data.files);
      return;
    }

    var text = data.getData("text");
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

  /* drop anywhere on the window */
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

  /* --- filing an entry --------------------------------------------------- */

  el.form.addEventListener("submit", function (event) {
    event.preventDefault();

    var text = el.area.value.trim();

    /* typed a bare URL and nothing else? that's a resource, not a sentence */
    if (isUrl(text)) {
      el.area.value = "";
      addLink(text);
      text = "";
    }

    if (text === "" && clips.length === 0) { el.area.focus(); return; }

    var words = wordsIn(text);
    var clipped = clips.length ? " · " + clipCount() : "";
    var book = bookById(selected);
    var folio = folioLabel(nextFolio);
    var target = book || floating;

    target.entries += 1;
    target.words += words;
    target.lastDays = 0;

    nextFolio += 1;
    el.folio.textContent = folioLabel(nextFolio);
    el.area.value = "";
    clips = [];
    renderClips();
    updateCount();
    grow();

    renderBooks();
    renderSelection();

    say(book
      ? folio + " → " + book.name + " · " + words + " w" + clipped
      : folio + " left floating · " + words + " w" + clipped);

    el.area.focus();
  });

  /* --- a new notebook ---------------------------------------------------- */

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

    var add = document.createElement("button");
    add.type = "submit";
    add.className = "book-new__add stamp";
    add.textContent = "Add";

    form.appendChild(input);
    form.appendChild(add);
    el.bookNew.replaceWith(form);
    input.focus();

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var name = input.value.trim();
      if (name === "") { closeNewBook(form); return; }

      var id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
      notebooks.push({
        id: id, name: name, dye: dyes[notebooks.length % dyes.length],
        entries: 0, words: 0, lastDays: 0
      });
      closeNewBook(form);
      renderBooks();
      select(id);
      say(name + " started · new entries land there");
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { closeNewBook(form); }
    });
  });

  /* --- dateline ---------------------------------------------------------- */

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

  /* --- keyboard ---------------------------------------------------------- */

  document.addEventListener("keydown", function (event) {
    var typing = event.target.matches("input, textarea, [contenteditable]");

    if (event.key === "n" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      el.area.focus();
    }
  });

  window.addEventListener("resize", function () {
    measureThesis();
    grow();
  });

  /* --- go ---------------------------------------------------------------- */

  el.hint.textContent = HINT_REST;
  writeDateline();
  setInterval(writeDateline, 30000);
  narrow.addEventListener("change", writeDateline);

  renderBooks();
  renderSelection();
  renderClips();
  updateCount();
  grow();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measureThesis);
  }
  measureThesis();
})();
