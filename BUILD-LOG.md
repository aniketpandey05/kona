# What has been built

The fourth document, and the only one that talks about code.

| | |
| --- | --- |
| **`DIRECTION.md`** | What Kona is, and what every surface does |
| **`DEFINITIONS.md`** | What every word means, in the present tense of the finished product |
| **`DESIGN-LOG.md`** | Every decision, why it was made, and the few still open |
| **`BUILD-LOG.md`** | What has actually been built, in the order it was built. This file |

`DESIGN-LOG.md` says *what was decided*. This says *what was done about it* —
in order, with what was checked and what was left behind. It exists because a
decision and its implementation drift apart quietly, and because the gap
between them is the thing nobody can reconstruct six months later.

**It is not a changelog for users.** Those ship with the build (4). This is for
whoever is building next, which is usually the same person having forgotten.

Each entry names the decisions it serves, what was checked rather than assumed,
and what it deliberately left undone. Anything left undone is also named where
it will be met — a loose end in `DESIGN-LOG.md`, or the next entry here.

---

## Stage 0 — the foundations

*One token file, one shared passage core. 3a and 3b. Nothing is built on top
of a screen that still decides its own colours.*

### One token file — `08f0dd2`

Eight stylesheets each decided `--accent` alone, and Kona's own orange was
three different oranges depending on the screen (3a). `src/design/tokens.json`
is now the one place any token is decided: **82 values** read off the boards in
`design/mockups`, `tokens.css` generated from it, `tokens.ts` for the few a
stylesheet cannot reach — the painter builds its `::highlight()` rules from
script, so it needs the pens as values.

`painter.ts` holds no colours of its own now.

**Checked:** `npm run tokens` regenerates; `tests/designTokens.test.ts` fails
if it was not run.

**Decided in passing**, and written up in `DESIGN-LOG.md` under *3a and 3b, as
built*: JSON rather than TypeScript as the source, and why; a scale rather than
the drawings' twenty-four font sizes; the boards' pen values over the code's;
the in-page mark flat rather than the gradient the boards draw, because
`::highlight()` cannot render one.

### LF, so a fresh clone passes — `fa54ae4`

`core.autocrlf` is on, so checking out `tokens.css` handed back a CRLF copy
while the generator writes LF. The drift test compares them byte for byte, so
on a fresh clone it failed over line endings rather than over a value — the one
thing that test must not do, because a test that cries wolf is one everybody
learns to skip.

**Found by** deleting the file and checking it out again, which is what a clone
does. `.gitattributes` pins both files to LF; the test normalises as well.

### The tokens reach the panel — `4869092`

`tokens.css` declared everything on `:root` alone, which quietly excluded the
surface that matters most. The panel mounts in a shadow root with its
stylesheet inlined, so `:root` there is the *article's* document; reaching it
that way would mean writing Kona's tokens into somebody else's page and
inheriting whatever that page had set.

The stylesheet now opens `:root, :host, .kona-tokens`.

### One shared passage core — `bf6270d`

3b(b). `<Passage color text note />` is the whole surface — the pen, the words,
your note. No prop for which room it is in: there are two rooms by 17, and a
room is set once on an ancestor (`.kona-slab`, or nothing at all for paper,
since the library is the place).

**Checked in both rooms:** Source Serif 18/1.58 on paper, Inter 13/1.5 on the
slab, the note keeping its warm fill on paper and dropping to the accent edge
alone on the slab.

One test parses `passage.css` and fails on a `var()` naming a token that does
not exist — a misspelled custom property renders nothing and reports nothing,
so a passage would simply lose its colour in silence. Confirmed it bites by
introducing a typo and watching it fail.

**Left:** the pen dot is `aria-hidden`, so the colour needs saying by the first
frame built around a passage. Recorded under *Loose ends*.

### The fonts — `d8022e4`, decided in `4cfe23d`

The boards load Inter and Source Serif 4 from Google, which cannot ship:
decision 6 forbids a request made on account of a page you are reading. The
files are in the repository — latin, upright, one variable weight axis each,
**47 KB and 50 KB**. `npm run fonts` copies them out of `@fontsource-variable`,
so their provenance is executable rather than folklore.

**Checked:** both report `status: "loaded"`, the only two font requests are
local, and Inter measures 278px against the system stack's 255px on the same
line — so it is the bundled file doing the work and not a silent fallback. Also
verified git stored the `.woff2` files byte-identically, given the line-ending
trap above.

**3g** then settled what the panel gets: nothing. A font inside the shadow root
costs either ~64 KB of base64 parsed on every page Kona is allowed on, or a
manifest change declaring the file web-accessible — and `host_permissions` was
emptied in 3e precisely so the manifest asks for as little as it can. Drawn
side by side at 13px the difference is a little width and a little looseness.
Reversible in one commit if the panel ever looks wrong beside the library.

That commit also brought the licence rule into step: **Apache-2.0 and MIT for
code, OFL for fonts**, in `DIRECTION.md` and the settled table both.

---

## The panel

*The face of the product, and the thing a person is actually looking at while
they use Kona.*

### 2h: where it sits — `f4a6ed9`

2a to 2g say what the panel shows and never say where it is, and the two boards
that draw it open disagreed. Most of that was not a disagreement — `Open` holds
three highlights and `Space` holds twelve, so the height is content rather than
a rule. The inset was real, and 24 won.

**Settled:** fixed, docked right at 24px, 324 wide, content height capped to
the viewport; the bottom sheet below 840px; mounted on `documentElement` rather
than `body`; the contested bottom-right corner accepted rather than engineered
around.

### Rebuilt on the tokens — `6f6ec03`

Three resting states, every value from `tokens.css`, rows drawn by the shared
`<Passage>` — the first thing that proves 3a and 3b hold rather than asserting
them.

**Checked in the harness:** empty state at 24/24, 38px, 0.72 opacity; the
counted pill; the open panel at right 24, top 24, 324 wide, max-height 720 in a
768 viewport; the sheet at 760px; the passage computing to Inter 13 on
`#e8e6e3`, which is the slab reading its tokens through `:host` inside the
shadow root. No console errors.

**Found while wiring:** the 2h anchor change silently did nothing, because the
harness mock appended to `body` regardless of what `anchor` said. A harness
that always mounts on `body` could never show the fixed-positioning hazard 2h
exists to name. The mock honours the anchor now.

Removing the old panel orphaned ~440 lines that only it used. `App.tsx`: 766 →
325.

### The bar — `6fac811`

2g and 10c are one surface, which is 2g's own argument: *the thing that tells
you where a highlight went is the same thing that changes where it went.* One
`Bar`, used twice — by the selection, where a pen makes the highlight, and by a
highlight you tapped, where a pen changes it and Delete appears.

It needed nothing from the controller. A plain click on highlighted text
already opened that highlight's card, and the card already carried `focusNote`.

**Corrected:** the old toolbar drew the pen dots in the *transparent* value,
the one meant for painting over someone's text. The bar is one of Kona's own
rooms, so the dots are the pen at full strength. There is a test pinning it.

**No archive on the bar.** An archived highlight is still painted where you
made it, so the gesture would change nothing you can see.

**Checked with tests rather than clicks** — the Browser pane was hidden, so the
page had no layout and a click could not be hit-tested against a painted range.
The selection bar was confirmed live; the rest is ten tests.

### The active space — `9c4abf8`

The last thing decision 2 describes that did not exist. The design log's table
said it plainly: no active id, no control, no hook in the save path.

**Decided and written into `DEFINITIONS.md`:** the active space belongs to the
device, not to the space. Partly because it is a statement about what you are
doing at this desk. Mainly because it must not travel — spaces move between
people, and if "active" lived on the space, opening one somebody sent you would
quietly redirect where your own highlights go, which 25 calls the worst failure
available here.

A deleted space clears the id, so highlights are never filed into nothing while
the panel claims otherwise.

The panel gained 2e and 2f: the going-to strip in words, the second tab with
the space's passages from every page, and a picker rather than a fifth screen.
The resting mark names the space too. The bar gained 2g's chip.

**Checked end to end in the harness:** marking filed into the space (0 → 1);
both tabs counted up live; the bar came up saying *In Amoebas*; and the escape
hatch took it out of the space while leaving it in the library and still
painted on the page — which is the definition's own claim about what removal
does.

---

## The bridge

*What makes one library instead of two. 3c agreed it was worth building; 3i
settled the three things 3c left open.*

### 3i, then the bridge — this commit

A free user has no sync, so the library on the web has to read what the
extension saved on the same machine. A web page cannot reach into extension
storage and the extension cannot hand it over from outside; what it can do is
run a content script inside Kona's own page, where it has both. They talk by
`postMessage`. `externally_connectable` is tidier and is Chrome's alone, and
Kona ships on Firefox and Safari.

**Settled first, as 3i:** one origin and it is Kona's own; read and write
rather than read-only, because a read-only bridge means a second write path
and two write paths against one store is duplicated *meaning*; and the four
refusals, which are the part that matters.

**Turned up rather than solved: there is no domain yet.** `kona.example` is a
placeholder that appears in one mailto link. The origin now lives in one named
constant, `KONA_ORIGINS` in `src/core/bridge.ts`, which the manifest, the
content script and the page client all read. That constant is what changes
when there is a real domain — a placeholder copied into three files is how a
domain gets missed at launch.

**The refusals are shared, not written twice.** They started inline on both
sides; two copies of a security check are two chances for one of them to be
relaxed alone. `fromThisPage` is now one function both halves call.

**Measured in a real browser**, because the argument for the `source` check
rested on a claim worth confirming:

| | |
| --- | --- |
| same-window `postMessage` | `event.source === window` is true, origin matches — so the ordinary case works |
| a parent posting into a framed Kona | `event.origin` is **Kona's own**, identical to `location.origin`; `source` is the parent |

That second row is the whole argument. An origin check alone cannot see a
same-origin frame — the event really does carry Kona's origin. Only the source
tells them apart. The comment in `bridge.ts` had said the origin check was
useless here; it is not, it catches the *cross-origin* sender, and the two
halves do different jobs. Corrected to say so.

**A real failure found, and not papered over.** The round-trip test failed on
all six cases. The cause was happy-dom: it delivers `message` events whose
`source` is an `EventTarget` rather than the sending window, which no browser
does. The fix was to restore spec behaviour in the test environment, *not* to
relax the check — weakening a security check so a test passes is the wrong way
round. The real `fromThisPage` still runs and still decides.

**Checked in the built manifest**, not just in source: one `content_scripts`
entry, `matches: ['https://kona.example/*']`, `all_frames: false`,
`run_at: document_start`, and the dev origin correctly absent from the
production build.

**Left undone:** `app/src/storage.ts` has not been pointed at the bridge yet.
The client exists and round-trips; wiring the web app's library to prefer it
when the extension is present is the next step, and belongs with the Highlights
view rather than here.

---

## The library, and clearing the decks

### 3c and 3e — `f70615e`

Two settled decisions that had never been implemented.

**3c:** the extension's library, spaces and plans pages are gone — 4,698 lines
with their stylesheets. The extension's library page was already a browser tab
at a `chrome-extension://` address and the web app is a browser tab at an
ordinary one, so to the person using it nothing changes. What goes is a second
implementation that could come to disagree with the first.

**3e:** `host_permissions` is empty. A fresh install raises no warning about
anybody's site. **Verified in the built manifest**, not the source:
`host_permissions: []`, and the only content script is the bridge on Kona's own
origin.

That needed the chat adapters registered at runtime like every other site.
Which script owns which host lives in `core/sites.ts` under test, because this
is the part that fails quietly — ChatGPT handed the plain-page adapter still
highlights and stops understanding a conversation. One test covers a host that
merely ends in the right letters.

The soft switch went with it: `local:disabled-sites` was a second list that
could disagree with the browser's. One background test asserted the old
built-in filtering and now asserts the new truth.

### The Highlights view — `cb3a2f3`

The third piece of the loop, and the first screen to use the paper room the
token file has had since stage 0 with nothing rendering it.

17's three kinds of control in three places: the nav says where you are, the
search box spans everything, the chips stack. Rows are the shared `<Passage>`,
so the passage a person recognises in the panel is the one they read back here
— Source Serif at 18px rather than Inter at 13.

`app/src/source.ts` decides where the library reads from: the bridge when the
extension is here, the app's own storage when it is not. One or the other and
never both.

**Checked in the browser** with four seeded highlights: the colour chip narrows
to one and unpicking restores four; a search for *osmosis* finds the one;
clearing restores four; the site chip finds the chatgpt.com one.

### Loose ends — this commit

`quote.ts` now says nine where it said seventeen, with the arithmetic beside
it. `SHIPPED_AHEAD` is deleted rather than deferred: 3c left it with nowhere to
be said. `conversationId` is deferred on purpose — it is the middle of every
storage key, so it is a migration rather than a rename, and `DESIGN-LOG.md`
now says so instead of implying it was forgotten.

`REVIEW.md` collects every decision taken without asking, grouped by what it
would cost to change.

---

## The rest of the in-page product

### The note editor, and two things that should not exist — this commit

The last of `src/ui/styles.css`, which is now deleted.

**The note editor** is rebuilt on the tokens as `Note.tsx`, and it lost half of
itself on the way: the old card carried the pens and Delete in its header, but
10c put both on the bar and the editor opens *from* that bar. Repeating them
was the same control in two places, one click apart, disagreeing about which
you pressed. What is left is what the editor is actually for — your words, and
your tags.

**Search in the panel was already decided against.** 15 says *no search in the
panel* in as many words. The palette had simply never been removed, which makes
it the third settled decision this rebuild found unimplemented, after 3c and
3e.

**The minimap had never been decided at all** — not in any of the three
documents, not on any board. 2j settles it: it goes. 2b settles three resting
states and a permanent fourth thing is not one of them; 2c says Kona is a guest
on every page, and a guest does not put two pieces of furniture in the room.

Removing both left the controller carrying their machinery — the search state,
the tick building, the viewport slice tracked on every scroll. All gone.

**Measured afterwards.** The in-page surfaces now declare **zero** values of
their own: `panel.css`, `bar.css` and `note.css` all read entirely from the
token file. Only the extension's own pages are left — `popup.css` at 21 and
`welcome.css` at 18. The build dropped from **548 KB to 468 KB**.

**A test environment finding worth keeping.** The click-away save could not be
tested until I measured when preact's effects actually run under happy-dom:
not on the render tick, and not on the next one — they need a frame, because
preact schedules on `requestAnimationFrame` and happy-dom backs that with a
timer. The test waits for one rather than guessing.

---

## Finishing the extension

### Welcome becomes About, and the last two stylesheets — this commit

**The main ability first.** The instruction was that it must never degrade, so
before changing anything more I checked what the rebuild had actually touched
in the matching core. `locate.ts`, `textIndex.ts`, `link.ts`, `pageUrl.ts`,
`order.ts`, `search.ts`, `retrieve.ts`, `tags.ts`, `text.ts` — **zero changes**
across the whole rebuild. `quote.ts` is a comment. `painter.ts` changed only
where its values come from.

That one exception had **no test at all**, which made it the only unguarded
place in the thing Kona exists to do. `tests/painter.test.ts` now covers it:
the rules it writes, the layers it registers, the ranges it hands over, that it
repaints from scratch so a deleted highlight stops being drawn, and that it
takes everything of its own away again. The CSS Custom Highlight API does not
exist in happy-dom, so the two globals are stood up thinly.

**Decision 4, built.** One place that changes role: Welcome once, About
thereafter, flipping on reaching the end rather than on being opened. The
background now asks the flag instead of the install reason, so a Welcome closed
halfway comes back — the phone analogy, where only setup that finished stops
returning.

The round trip is **done rather than described**, which is the part of 4 that
matters: pick a pen, select the passage, it is painted by the real
`HighlightPainter`; scroll away; find it again and it flashes where it was.
Every tool can colour text, so a page that stops at *you highlighted something*
has demonstrated a yellow background.

**Checked in a browser**, not only in tests: marking painted one range in
`kona-yellow`, the three steps advanced, *Find it again* put a range in
`kona-flash`, and finishing flipped the heading from *Kona* to *About Kona*,
dropped the ladder and the demonstration, kept the releases, and persisted.

The releases ship with the build (`src/core/releases.ts`), because 6 says a
Free install sends nothing anywhere and fetching a changelog would reveal that
somebody has Kona and when they opened it.

**3a is now finished for the whole extension.** Every stylesheet in `src/`
declares **zero** values of its own, and Kona's orange is one value living only
in the token source. `#c2410c` and `#fb923c` are gone from the extension
entirely.

The build grew to 584 KB because the extension's own pages now carry the
fonts. **Verified that did not leak into the content script** — no font
reference in any `content-scripts/*.js`, which is 3g holding.

---

## Archiving, the caps, and a regression

### Archiving and the two Free limits — `234a364`

Decision 10, and the shape is the whole of it: **archived is a filter on one
list, not a place.** A place has to be known about by everything — search
whether to look there, counts whether to count it, spaces whether to show it,
export whether to include it — and each is a chance for two surfaces to
disagree about where something is. A filter is known about by one list.

`Mark` gains `archivedAt`, absent until it happens, so every highlight ever
saved is already correct with no migration.

Both caps are per device, because Free has no sync and its counts are local
(10a). **Fifteen archived at a time**, a working set rather than a quota —
un-archiving hands the slot straight back, and reaching the cap never deletes
or un-archives anything on its own (7). **Five spaces, a hard five**, because
archiving a space is Pro and so nothing defeats it.

Bulk, because 10 says otherwise it is not a feature. Asking for more than there
is room for archives what fits and says so. The notice offers bringing one back
or Pro, with **no delete in it** — offering delete there teaches people to
delete when they meant to tidy.

**Two bugs, both found by driving it rather than reading it.**

The Archived view showed the *unarchived* rows: the filter's `useMemo` did not
depend on the view, so switching never recomputed. It looked entirely fine.

Then the counts disagreed with the data — storage held exactly fifteen archived
and the nav said six. Every save tells the store and the store tells the
library, so archiving fifteen starts fifteen reads at once; they do not return
in the order they went out, and an early one landed last and put a stale
library on screen. Reads are sequence-guarded now. That is the worst kind of
wrong, because the data was right and nothing looked broken.

### A regression I caused, and did not notice — `d7d4991`

Worth recording as a failure rather than a fix. When the rebuilt Highlights
view took the default route two commits earlier, everything in the old screen's
default branch stopped being reachable: the install prompt (24), folder sync,
the backup, the theme — and the **Android share target** (1h).

The share one was the worst. A share arrives on a plain URL with no fragment at
all, so it was landing on the library and capturing nothing, silently. It is
now recognised by what it carries rather than where it points, and checked
before any routing, because it is the one arrival that cannot say where it
wants to go. Settings and sync are reachable at `#/settings`, linked from the
nav.

**The lesson for the rest of the rebuild:** replacing a screen's route is not
the same as replacing a screen. Everything that screen was also doing has to be
found first. The next one to watch is Spaces, which is in the same file.

---

## Where it stands

| | |
| --- | --- |
| Tests | 476 |
| `src/ui/App.tsx` | 766 → 279 lines |
| Removed | 4,698 lines of duplicated screens, plus the soft switch |
| Built | the token file, the passage core, the fonts, the panel, the bar, the note editor, the active space, the bridge, the Highlights view, Welcome/About, archiving and both Free caps |
| Removed as decided | the extension's library, spaces and plans pages; the soft switch; the panel's search (15); the minimap (2j) |
| The extension, on the tokens | **all of it.** Every stylesheet in `src/` declares nothing of its own |
| Kona's orange | one value, in the token source alone |
| Not yet | Spaces rebuilt, the settings screen rebuilt, `team/` folded in (3d), the paid half |

**Still carrying the old sketch:** `team/` has not been touched, so 3d — one
web app, not two — is still only a decision. `app/`'s Spaces screen is still
the old one, and the dead library branch beside it comes out when Spaces is
rebuilt.

**Kona has no domain.** The bridge's origin, the manifest match and the Library
button all read `KONA_ORIGINS`, so there is one edit to make when there is a
real one. Until then the Library button opens a page that does not exist.
