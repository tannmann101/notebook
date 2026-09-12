/* Notebook — home screen.

   The notebook list is the page: it's where a new entry is filed and where the
   entry/word breakdown is read. One selection does both jobs — the row you pick
   is the row new entries land in.

   Figures below are samples. Storage comes next; nothing here survives a
   refresh yet. */

(function () {
  "use strict";

  /* --- data -------------------------------------------------------------- */

  var notebooks = [
    { id: "half-built",  name: "Half-built",  dye: "brass",     entries: 17, words: 21930 },
    { id: "field-notes", name: "Field notes", dye: "verdigris", entries: 37, words: 15170 },
    { id: "workshop",    name: "Workshop",    dye: "oxblood",   entries: 24, words: 12480 },
    { id: "scraps",      name: "Scraps",      dye: "lead",      entries: 31, words:  4340 },
    { id: "kitchen",     name: "Kitchen",     dye: "bone",      entries: 11, words:  4180 },
    { id: "margins",     name: "Margins",     dye: "slate",     entries:  8, words:   760 }
  ];

  /* Entries nobody filed. Not a notebook — kept apart from the count. */
  var floating = { entries: 19, words: 2344 };

  var dyes = ["brass", "verdigris", "oxblood", "bone", "slate", "lead"];
  var nextFolio = 15;
  var selected = "";           /* "" means floating */

  /* --- elements ---------------------------------------------------------- */

  var el = {
    form: document.getElementById("entry-form"),
    input: document.getElementById("entry"),
    count: document.getElementById("count"),
    dest: document.getElementById("dest"),
    destEcho: document.getElementById("dest-echo"),
    folio: document.getElementById("next-folio"),
    hint: document.getElementById("hint"),
    books: document.getElementById("books"),
    booksNote: document.getElementById("books-note"),
    bookNew: document.getElementById("book-new"),
    dateline: document.getElementById("dateline"),
    totalBooks: document.getElementById("total-books"),
    totalEntries: document.getElementById("total-entries"),
    totalWords: document.getElementById("total-words")
  };

  var standingHint = el.hint.textContent;
  var hintTimer = null;

  /* --- helpers ----------------------------------------------------------- */

  function wordsIn(text) {
    var trimmed = text.trim();
    return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
  }

  function folioLabel(n) {
    return "F." + String(n).padStart(3, "0");
  }

  function num(n) {
    return n.toLocaleString();
  }

  function bookById(id) {
    for (var i = 0; i < notebooks.length; i += 1) {
      if (notebooks[i].id === id) { return notebooks[i]; }
    }
    return null;
  }

  function totals() {
    var t = { entries: floating.entries, words: floating.words };
    notebooks.forEach(function (b) {
      t.entries += b.entries;
      t.words += b.words;
    });
    return t;
  }

  function filedEntries() {
    return notebooks.reduce(function (n, b) { return n + b.entries; }, 0);
  }

  /* --- the ledger -------------------------------------------------------- */

  function makeRow(book, widest, isFloating) {
    var li = document.createElement("li");
    li.className = "book" + (isFloating ? " book--floating" : "");

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "book__btn";
    btn.setAttribute("aria-pressed", String(selected === book.id));
    btn.dataset.id = book.id;

    var name = document.createElement("span");
    name.className = "book__name";
    var dye = document.createElement("span");
    dye.className = "dye dye--" + book.dye;
    dye.setAttribute("aria-hidden", "true");
    name.appendChild(dye);
    name.appendChild(document.createTextNode(book.name));

    var entries = document.createElement("span");
    entries.className = "book__n stamp";
    entries.textContent = num(book.entries);

    var words = document.createElement("span");
    words.className = "book__w stamp";
    words.textContent = num(book.words);

    var bar = document.createElement("span");
    bar.className = "book__bar";
    var fill = document.createElement("span");
    fill.className = "book__fill";
    fill.style.width = (widest ? Math.max(book.words / widest * 100, 1.5) : 0) + "%";
    bar.appendChild(fill);

    btn.appendChild(name);
    btn.appendChild(entries);
    btn.appendChild(words);
    btn.appendChild(bar);
    li.appendChild(btn);
    return li;
  }

  function renderBooks() {
    var widest = Math.max.apply(null, notebooks.map(function (b) { return b.words; })
      .concat([floating.words]));

    el.books.textContent = "";
    notebooks.forEach(function (b) {
      el.books.appendChild(makeRow(b, widest, false));
    });
    el.books.appendChild(makeRow(
      { id: "", name: "Floating thoughts", dye: "none",
        entries: floating.entries, words: floating.words },
      widest, true
    ));

    el.booksNote.textContent = num(filedEntries()) + " filed · " +
      num(floating.entries) + " floating";
  }

  function renderDest() {
    el.dest.textContent = "";

    var none = document.createElement("option");
    none.value = "";
    none.textContent = "Floating thought";
    el.dest.appendChild(none);

    notebooks.forEach(function (b) {
      var opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.name;
      el.dest.appendChild(opt);
    });

    el.dest.value = selected;
  }

  function renderCounts() {
    var t = totals();
    el.totalBooks.textContent = num(notebooks.length);
    el.totalEntries.textContent = num(t.entries);
    el.totalWords.textContent = num(t.words);
  }

  function renderSelection() {
    var book = bookById(selected);
    el.destEcho.textContent = book ? book.name : "floating";
    el.dest.value = selected;

    var buttons = el.books.querySelectorAll(".book__btn");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].setAttribute("aria-pressed",
        String(buttons[i].dataset.id === selected));
    }
  }

  function render() {
    renderBooks();
    renderDest();
    renderCounts();
    renderSelection();
  }

  /* --- dateline ---------------------------------------------------------- */

  var narrow = window.matchMedia("(max-width: 34em)");

  function writeDateline() {
    var now = new Date();
    var time = now.toLocaleTimeString(undefined, {
      hour: "numeric", minute: "2-digit"
    });

    if (narrow.matches) {
      el.dateline.textContent = now.toLocaleDateString(undefined, {
        day: "numeric", month: "short"
      }) + " · " + time;
      return;
    }

    var day = now.toLocaleDateString(undefined, { weekday: "long" });
    var date = now.toLocaleDateString(undefined, {
      day: "numeric", month: "long", year: "numeric"
    });
    el.dateline.textContent = day + " · " + date + " · " + time;
  }

  /* --- setting an entry -------------------------------------------------- */

  function say(message) {
    window.clearTimeout(hintTimer);
    el.hint.textContent = message;
    el.hint.classList.add("stick__hint--done");
    hintTimer = window.setTimeout(function () {
      el.hint.textContent = standingHint;
      el.hint.classList.remove("stick__hint--done");
    }, 7000);
  }

  el.input.addEventListener("input", function () {
    el.count.textContent = wordsIn(el.input.value) + " w";
  });

  el.dest.addEventListener("change", function () {
    selected = el.dest.value;
    renderSelection();
  });

  el.form.addEventListener("submit", function (event) {
    event.preventDefault();

    var text = el.input.value.trim();
    if (text === "") {
      el.input.focus();
      return;
    }

    var words = wordsIn(text);
    var book = bookById(selected);
    var folio = folioLabel(nextFolio);

    if (book) {
      book.entries += 1;
      book.words += words;
    } else {
      floating.entries += 1;
      floating.words += words;
    }

    nextFolio += 1;
    el.folio.textContent = folioLabel(nextFolio);
    el.input.value = "";
    el.count.textContent = "0 w";
    render();
    say(book
      ? folio + " set down in " + book.name + ", " + words + " w."
      : folio + " left floating, " + words + " w. File it any time.");
    el.input.focus();
  });

  /* --- ledger interaction ------------------------------------------------ */

  el.books.addEventListener("click", function (event) {
    var btn = event.target.closest(".book__btn");
    if (!btn) { return; }
    selected = btn.dataset.id;
    renderSelection();
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
        id: id,
        name: name,
        dye: dyes[notebooks.length % dyes.length],
        entries: 0,
        words: 0
      });
      selected = id;
      closeNewBook(form);
      render();
      say(name + " started. New entries land there.");
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { closeNewBook(form); }
    });
  });

  /* --- keyboard ---------------------------------------------------------- */

  document.addEventListener("keydown", function (event) {
    var typingElsewhere =
      event.target.matches("input, textarea, select, [contenteditable]");

    if (event.key === "n" && !typingElsewhere &&
        !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      el.input.focus();
    }

    if (event.key === "Escape" && event.target === el.input) {
      el.input.blur();
    }
  });

  /* --- go ---------------------------------------------------------------- */

  notebooks.sort(function (a, b) { return b.words - a.words; });
  writeDateline();
  setInterval(writeDateline, 30000);
  narrow.addEventListener("change", writeDateline);
  render();
})();
