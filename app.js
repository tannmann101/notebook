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
  var HINT_WRITE = "Enter files it · Shift + Enter for a new line · Esc steps back";

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
    el.count.textContent = wordsIn(el.area.value) + " w";
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

  /* --- filing an entry --------------------------------------------------- */

  el.form.addEventListener("submit", function (event) {
    event.preventDefault();

    var text = el.area.value.trim();
    if (text === "") { el.area.focus(); return; }

    var words = wordsIn(text);
    var book = bookById(selected);
    var folio = folioLabel(nextFolio);
    var target = book || floating;

    target.entries += 1;
    target.words += words;
    target.lastDays = 0;

    nextFolio += 1;
    el.folio.textContent = folioLabel(nextFolio);
    el.area.value = "";
    el.count.textContent = "0 w";
    grow();

    renderBooks();
    renderSelection();

    say(book
      ? folio + " → " + book.name + " · " + words + " w"
      : folio + " left floating · " + words + " w");

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
  grow();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measureThesis);
  }
  measureThesis();
})();
