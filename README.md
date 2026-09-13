# Notebook

A personal notebook. Somewhere to put a thought down before deciding what kind
of thought it is.

## Where this is

A static site — HTML, CSS and vanilla JavaScript, no build step and no
dependencies. It installs to a desktop or a phone home screen and runs offline.

## How it works

An **entry** is a thread, not a note. It opens with a line and accumulates dated
**sittings** — every time you come back to it, what you write is stamped with
that day and added to the same thread. An entry lives in a notebook, or it
floats.

Entries are numbered in one sequence across the whole notebook — `Entry 0059` —
and the next entry takes the next number wherever it's filed. Additions don't
take numbers of their own: they're dated sittings on the entry they belong to.
The number is the entry's name; its opening line does the describing, in lists
and in search.

Sittings are stamped with their date. A time appears only when two sittings
share a day, since that's the only time the date can't tell them apart.

## Putting things away

**File** an entry from its own page — *File in…* offers the same list the
composer does, so a floating thought becomes an entry in a notebook, a filed one
moves elsewhere, and anything can go back to floating. The entry keeps its
number and every sitting; only where it lives changes.

**Archive** a notebook from its own page. It keeps every entry and stays
searchable — it just leaves the index and the filing menu, folded behind an
"n archived" line on the home screen. Open it from there and the same button
says **Restore**.

**Delete** an entry from its page. It asks once — the button becomes *Delete for
good?* for five seconds — then removes the entry and any files clipped to it.
That one doesn't come back.

## Copying out

Three levels, all plain text with no markup, so it reads the same in a mail
draft, a text file or a document. **Copy entry** takes one thread with every
sitting and its clips. **Copy notebook** takes every entry in it, newest first,
separated by rules. **Copy everything** takes the whole snapshot, notebook by
notebook, floating thoughts included. Lines aren't hard-wrapped, so they reflow
wherever they land.

If the clipboard can't be reached — some embeds block it — the report opens in a
panel with the text selected, ready to copy by hand.

**Home** is the index: notebooks with their entry counts, and a panel for
floating thoughts. **A notebook** reads the way it was written — oldest at the
top, newest at the foot, in step with the numbering. **An entry** shows its
sittings the same way, with today's waiting at the bottom.

An entry keeps the place where it was started; coming back to it later adds a
sitting without moving it up the page, the way a page in a real notebook stays
where it is. Search results are the exception — those come back newest first,
because that's what you're usually after when you go looking.

**Search** lives in the rail and is the same field everywhere. Type and results
take over the page; clear it and you're back where you were. Start typing while
inside a notebook and it scopes itself to that notebook — a chip in the field
says so, and clicking the chip off widens the same query to everything.

One composer serves all three, moving to whichever view is asking. On home it
starts an entry and you pick where it goes. In a notebook it starts one already
filed there. Inside an entry it picks the thread back up, dated today.

**Composing** starts the moment you click into the writing area. The room dims,
a lamp comes up, the headline steps aside, and what you type takes its place at
display scale. Esc steps back out. No modal, no page change, nothing to dismiss.

Past a couple of lines it stops being a thought and starts being a document, and
the writing surface follows: display type settles to a reading size at a 64ch
measure, the controls stick to the bottom of the panel so they don't scroll away
under a long entry, and **Enter starts a new line while ⌘/Ctrl + Enter files
it**. Below that it's the other way round — Enter files, Shift+Enter breaks a
line — because a passing thought should cost one keystroke. The hint line under
the composer always says which one you're in, and on a phone the Enter button
does the filing either way.

A **resource** can ride along with the entry. Paste a URL and it becomes a clip
instead of raw text; paste a screenshot, drop a file anywhere on the window, or
use Attach. Clips sit between your words and the rule, so they read as part of
the entry rather than an attachment tray. Images show a thumbnail, everything
else gets its kind — `PDF`, `TXT`, `LINK`. Nothing is uploaded: the name, kind
and size are held until storage lands.

## Where your notes live

In this browser, on this device — IndexedDB, via `store.js`. Nothing is
uploaded, there is no account, and there is no server to go down. The site
itself is public; your notes are not on it.

The flip side: **there is no sync.** A notebook written on the laptop is not the
notebook on the phone. Each install keeps its own — which is the point, if you
take notes differently on each.

The boundary is origin + browser + container, not device: a different browser on
the same machine is a different notebook, and on iOS a home-screen app keeps its
own storage apart from Safari. Pick one per device and stay in it.

**Room.** Text is effectively free — a sitting is a few hundred bytes, a
thousand entries about a megabyte. Attachments are the whole budget. The
colophon shows what's actually on disk.

**Keeping it.** At boot the app calls `navigator.storage.persist()`, which asks
the browser not to evict the data under disk pressure. Browsers grant it to
installed and well-used sites; Safari also clears script-writable storage after
seven days of not opening a site, and home-screen apps are exempt. If the
request is refused the colophon says so in orange. **Installing it is what
protects the notes**, not a nicety.

**Backup.** *Back up* writes a single JSON file with the notebooks, the entries
and the attached files inline. *Restore* merges it back: nothing already there
is overwritten, and an incoming entry only takes a new number if its own is
already in use — so restoring onto a fresh device gives the numbers back
unchanged, and restoring onto a device that already has notes adds to them
instead of colliding.

## Running it

Service workers and IndexedDB need a real origin, so open it over HTTP rather
than as a file:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Installing it

Published by GitHub Actions to GitHub Pages on every push
(`.github/workflows/pages.yml`).

**One manual step, once.** In the repository: **Settings → Pages → Build and
deployment → Source: GitHub Actions**. The workflow token is allowed to publish
to Pages but not to create the site, so this can't be automated — until it's
switched on, every run fails with *Get Pages site failed*. Afterwards, re-run
the workflow (or push anything) and the site appears at
`https://<owner>.github.io/notebook/`.

| | |
| --- | --- |
| **iPhone** | Open the site in Safari → Share → **Add to Home Screen** |
| **macOS** | Safari → File → **Add to Dock**, or Chrome → **Install** in the address bar |
| **Windows / Linux** | Chrome or Edge → **Install** in the address bar |

Installed, it opens without browser chrome and works with no connection — the
shell is cached by `sw.js`, and your notes were never remote to begin with.

## Files

| File | What's in it |
| --- | --- |
| `index.html` | Page structure and the sample entries |
| `styles.css` | Design tokens and every rule on the page |
| `store.js` | IndexedDB: notebooks, entries, and clipped files |
| `app.js` | Views, routing, search, compose mode, clips, reports |
| `sw.js` | Caches the shell so it opens offline |
| `manifest.webmanifest` | Name, icons and colors for the installed app |

## The look

A machine shop after hours, not a library. Soot ground with a warm olive bias,
bone ink, brass on the one thing that matters, and a cloth dye per notebook.
Archivo set tight and slightly condensed does the talking; Spline Sans Mono
handles anything that counts. The tokens all live at the top of `styles.css`;
change them there and the page follows. Ink contrast against the ground runs
16:1, 6.9:1 and 4.5:1 for the three levels, so even the smallest datestamp
clears AA.

Three planes keep the sections apart, so nothing has to be told apart by
spacing alone. **Chrome** — the rail and the colophon — sits a step darker than
the page and frames it top and bottom. **The ground** is the page itself.
**Panels** are working surfaces a step lighter, each with its own hairline edge
and, where it helps, a labelled top row: the writing surface, the notebook
index, an entry list, the sittings, the search results. Inside a panel, rows are
divided by hairlines only — the panel's edge is what says where the section
stops. Small controls are set *into* a panel, darker than the surface they sit
on. Floating thoughts keep a dashed edge, because they are still not a notebook.

Past about 1090px the page becomes two columns: the work runs down the main
column while an aside holds where you are and what you can do — the notebook
index on the home screen, the notebook's name and Copy inside one, the entry's
number and Copy inside that. The aside sticks while the main column scrolls.
Below that width it stacks back to a single column, aside first, which is the
order a phone wants anyway.

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

Sync is the open question. Local-only is what makes this simple, private and
free to run; it is also why the phone and the laptop keep separate notebooks.

The whole notebook is loaded from IndexedDB at boot and held in memory, so
rendering stays synchronous and every change is written straight back. That is
fine at personal scale — thousands of entries — and it is the shape a sync layer
would sit on top of, if there is ever one.

Sittings carry real timestamps (`at`, epoch milliseconds). Every figure on the
page is derived: entry counts, word counts, dates, "kept since".
