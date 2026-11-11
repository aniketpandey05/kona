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

## Where it stands

| | |
| --- | --- |
| Tests | 437 |
| `src/ui/App.tsx` | 766 → 279 lines |
| Built | the token file, the passage core, the fonts, the panel, the bar, the active space, the bridge |
| Not yet | the library's Highlights view, and the web app wired to the bridge |

**Still carrying the old sketch:** `app/` and `team/` have not been touched, so
the three oranges live on outside the extension. They adopt the tokens as each
screen is rebuilt, which is the rule set in *3a and 3b, as built*.

**A settled decision not yet implemented:** 3e says nothing is built in and
`host_permissions` is empty. The manifest still grants four origins at install.
That is a behaviour change of its own and has a consequence for decision 4, so
it has not been folded into unrelated work.
