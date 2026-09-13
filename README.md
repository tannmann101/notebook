# Notebook

A personal notebook. Somewhere to put a thought down before deciding what kind
of thought it is.

## Where this is

Three screens — static HTML, CSS and a little vanilla JavaScript, no build step
and no dependencies. The figures on the page are samples for setting
the look; nothing is stored yet.

## How it works

An **entry** is a thread, not a note. It opens with a line and accumulates dated
**sittings** — every time you come back to it, what you write is stamped with
that day and added to the same thread. An entry lives in a notebook, or it
floats.

Entries are numbered in one sequence across the whole notebook — `Entry 0059` —
and the next entry takes the next number wherever it's filed. The number is the
entry's name; its opening line does the describing, in lists and in search.

**Home** is the index: notebooks with their entry counts, and a panel for
floating thoughts. **A notebook** lists its entries, newest touched first.
**An entry** shows its sittings in order, oldest at the top, with today's
waiting at the bottom.

**Search** lives in the rail and is the same field everywhere. Type and results
take over the page; clear it and you're back where you were. Start typing while
inside a notebook and it scopes itself to that notebook — a chip in the field
says so, and clicking the chip off widens the same query to everything.

One composer serves all three, moving to whichever view is asking. On home it
starts an entry and you pick where it goes. In a notebook it starts one already
filed there. Inside an entry it picks the thread back up, dated today.

**Composing** starts the moment you click into the writing area. The room dims,
a lamp comes up, the headline steps aside, and what you type takes its place at
display scale. Enter files it, Shift+Enter breaks a line, Esc steps back out.
No modal, no page change, nothing to dismiss.

A **resource** can ride along with the entry. Paste a URL and it becomes a clip
instead of raw text; paste a screenshot, drop a file anywhere on the window, or
use Attach. Clips sit between your words and the rule, so they read as part of
the entry rather than an attachment tray. Images show a thumbnail, everything
else gets its kind — `PDF`, `TXT`, `LINK`. Nothing is uploaded: the name, kind
and size are held until storage lands.

## Running it

Open `index.html` in a browser. That's the whole thing. For a local server:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Files

| File | What's in it |
| --- | --- |
| `index.html` | Page structure and the sample entries |
| `styles.css` | Design tokens and every rule on the page |
| `data.js` | Sample notebooks, entries and sittings — what storage replaces |
| `app.js` | Views, routing, search, compose mode, clips |

## The look

A machine shop after hours, not a library. Soot ground with a warm olive bias,
bone ink, brass on the one thing that matters, and a cloth dye per notebook.
Archivo set tight and slightly condensed does the talking; Spline Sans Mono
handles anything that counts. The tokens all live at the top of `styles.css`;
change them there and the page follows.

## Keys

| | |
| --- | --- |
| `n` | Start an entry |
| `Enter` | File it |
| `Shift` + `Enter` | New line |
| `/` | Search from the rail |
| `Esc` | Step back out, or up a level |
| paste a link | Clip it to the entry |
| drop a file | Clip it to the entry |

## Next

Storage, then entry pages, then search. Nothing is decided yet.

Everything renders from `window.NOTEBOOK_DATA` in `data.js`, and every figure on
the page is derived from it — entry counts, word counts, dates, "kept since".
Nothing is hardcoded, so persistence hooks in by replacing that one object.

Dates are stored as day offsets from today so the sample stays plausible
whenever it's opened. Real storage will want real timestamps.
