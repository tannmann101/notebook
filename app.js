/* Notebook — home screen behavior.
   Deliberately thin: enough for the screen to feel real while we settle the
   look. No storage yet, so nothing here outlives a refresh. */

(function () {
  "use strict";

  var entryForm = document.getElementById("entry-form");
  var entryInput = document.getElementById("entry");
  var countEl = document.getElementById("count");
  var entriesEl = document.getElementById("entries");
  var nextFolioEl = document.getElementById("next-folio");
  var datelineEl = document.getElementById("dateline");
  var totalEntriesEl = document.getElementById("total-entries");
  var totalWordsEl = document.getElementById("total-words");

  var nextFolio = 15;
  var totals = { entries: 147, words: 61204 };

  /* --- dateline ---------------------------------------------------------- */

  var narrow = window.matchMedia("(max-width: 34em)");

  function writeDateline() {
    var now = new Date();
    var time = now.toLocaleTimeString(undefined, {
      hour: "numeric", minute: "2-digit"
    });

    if (narrow.matches) {
      datelineEl.textContent = now.toLocaleDateString(undefined, {
        day: "numeric", month: "short"
      }) + " · " + time;
      return;
    }

    var day = now.toLocaleDateString(undefined, { weekday: "long" });
    var date = now.toLocaleDateString(undefined, {
      day: "numeric", month: "long", year: "numeric"
    });
    datelineEl.textContent = day + " · " + date + " · " + time;
  }

  writeDateline();
  setInterval(writeDateline, 30000);
  narrow.addEventListener("change", writeDateline);

  /* --- word count -------------------------------------------------------- */

  function wordsIn(text) {
    var trimmed = text.trim();
    return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
  }

  entryInput.addEventListener("input", function () {
    countEl.textContent = wordsIn(entryInput.value) + " w";
  });

  /* --- setting an entry -------------------------------------------------- */

  function folioLabel(n) {
    return "F." + String(n).padStart(3, "0");
  }

  function titleAndRest(text) {
    /* First sentence (or first 60-odd characters) becomes the title; the
       remainder is the excerpt. Same instinct as a real notebook: the
       opening line names the page. */
    var match = text.match(/^(.{1,72}?)([.!?—](\s|$)|$)/);
    var title = match ? match[1].trim() : text.slice(0, 72).trim();
    var rest = text.slice(match ? match[0].length : title.length).trim();
    return { title: title, rest: rest };
  }

  function makeEntry(text) {
    var parts = titleAndRest(text);
    var words = wordsIn(text);

    var li = document.createElement("li");
    li.className = "entry entry--fresh";

    var folio = document.createElement("span");
    folio.className = "entry__folio stamp";
    folio.textContent = folioLabel(nextFolio);

    var body = document.createElement("div");
    body.className = "entry__body";

    var h3 = document.createElement("h3");
    h3.className = "entry__title";
    var a = document.createElement("a");
    a.href = "#";
    a.textContent = parts.title;
    h3.appendChild(a);
    body.appendChild(h3);

    if (parts.rest) {
      var p = document.createElement("p");
      p.className = "entry__excerpt";
      p.textContent = parts.rest;
      body.appendChild(p);
    }

    var meta = document.createElement("p");
    meta.className = "entry__meta";
    var tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = "unfiled";
    var stamp = document.createElement("span");
    stamp.className = "stamp";
    stamp.textContent = words + " w · just now";
    meta.appendChild(tag);
    meta.appendChild(stamp);
    body.appendChild(meta);

    li.appendChild(folio);
    li.appendChild(body);
    return li;
  }

  entryForm.addEventListener("submit", function (event) {
    event.preventDefault();

    var text = entryInput.value.trim();
    if (text === "") {
      entryInput.focus();
      return;
    }

    entriesEl.prepend(makeEntry(text));

    totals.entries += 1;
    totals.words += wordsIn(text);
    totalEntriesEl.textContent = totals.entries.toLocaleString();
    totalWordsEl.textContent = totals.words.toLocaleString();

    nextFolio += 1;
    nextFolioEl.textContent = folioLabel(nextFolio);

    entryInput.value = "";
    countEl.textContent = "0 w";
    entryInput.focus();
  });

  /* --- keyboard ---------------------------------------------------------- */

  document.addEventListener("keydown", function (event) {
    var typingElsewhere =
      event.target.matches("input, textarea, [contenteditable]");

    if (event.key === "n" && !typingElsewhere &&
        !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      entryInput.focus();
    }

    if (event.key === "Escape" && event.target === entryInput) {
      entryInput.blur();
    }
  });
})();
