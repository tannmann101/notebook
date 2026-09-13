# Notebook

A personal notebook. Somewhere to put a thought down before deciding what kind
of thought it is.

## Where this is

The home screen only — static HTML, CSS and a little vanilla JavaScript, no
build step and no dependencies. The figures on the page are samples for setting
the look; nothing is stored yet.

The screen has two states.

**At rest** it's an index: notebooks with their entry counts, and a separate
panel for **floating thoughts** — entries that never got filed. They're kept, and
counted, but they're deliberately not a notebook. Picking a notebook sets where
the next entry lands and scopes the figures at the bottom to that notebook:
entries, words, last entry.

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
| `app.js` | Notebook data, the index, compose mode, filing an entry |

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
| `Esc` | Step back out |
| paste a link | Clip it to the entry |
| drop a file | Clip it to the entry |

## Next

Storage, then entry pages, then search. Nothing is decided yet.

Notebooks live in a single `notebooks` array at the top of `app.js`, with
unfiled entries in `floating` beside it. Everything on the page renders from
those two, which is where persistence will hook in.
