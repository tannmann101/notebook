# Notebook

A personal notebook. Somewhere to put a thought down before deciding what kind
of thought it is.

## Where this is

The home screen only — static HTML, CSS and a little vanilla JavaScript, no
build step and no dependencies. The figures on the page are samples for setting
the look; nothing is stored yet.

The screen does two things. You write an entry and choose a notebook to file it
in — leave that alone and it stays a **floating thought**, kept but not put away.
Below it, the notebook ledger doubles as the breakdown: entries and words per
notebook, with a bar showing each one's share. Picking a row sets where the next
entry lands, so selecting a notebook and reading its numbers are the same
gesture.

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
| `app.js` | Notebook data, the ledger, filing an entry, `n` to focus |

## The look

A letterpress composing stone in a dark room — soot ground with a warm olive
bias, bone ink, brass for emphasis, verdigris for tags. Young Serif for display,
Petrona for reading, Spline Sans Mono for datestamps and counts. The tokens all
live at the top of `styles.css`; change them there and the page follows.

## Next

Storage, then entry pages, then search. Nothing is decided yet.

Notebooks live in a single `notebooks` array at the top of `app.js`, with
unfiled entries in `floating` beside it. Everything on the page renders from
those two, which is where persistence will hook in.
