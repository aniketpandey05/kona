# What has been built

The fourth document, and the only one that talks about code.

| | |
| --- | --- |
| **`DIRECTION.md`** | What Kona is, and what every surface does |
| **`DEFINITIONS.md`** | What every word means, in the present tense of the finished product |
| **`DESIGN-LOG.md`** | Every decision, why it was made, and the few still open |
| **`BUILD-LOG.md`** | What has actually been built, in the order it was built. This file |

`DESIGN-LOG.md` says *what was decided*. This says *what was done about it*,
in order, with what was checked and what was left behind. It exists because a
decision and its implementation drift apart quietly, and because the gap
between them is the thing nobody can reconstruct six months later.

**It is not a changelog for users.** Those ship with the build (4). This is for
whoever is building next, which is usually the same person having forgotten.

Each entry names the decisions it serves, what was checked rather than assumed,
and what it deliberately left undone. Anything left undone is also named where
it will be met: a loose end in `DESIGN-LOG.md`, or the next entry here.

---

## Stage 0, the foundations

*One token file, one shared passage core. 3a and 3b. Nothing is built on top
of a screen that still decides its own colours.*

### One token file, `08f0dd2`

Eight stylesheets each decided `--accent` alone, and Kona's own orange was
three different oranges depending on the screen (3a). `src/design/tokens.json`
is now the one place any token is decided: **82 values** read off the boards in
`design/mockups`, `tokens.css` generated from it, `tokens.ts` for the few a
stylesheet cannot reach, the painter builds its `::highlight()` rules from
script, so it needs the pens as values.

`painter.ts` holds no colours of its own now.

**Checked:** `npm run tokens` regenerates; `tests/designTokens.test.ts` fails
if it was not run.

**Decided in passing**, and written up in `DESIGN-LOG.md` under *3a and 3b, as
built*: JSON rather than TypeScript as the source, and why; a scale rather than
the drawings' twenty-four font sizes; the boards' pen values over the code's;
the in-page mark flat rather than the gradient the boards draw, because
`::highlight()` cannot render one.

### LF, so a fresh clone passes, `fa54ae4`

`core.autocrlf` is on, so checking out `tokens.css` handed back a CRLF copy
while the generator writes LF. The drift test compares them byte for byte, so
on a fresh clone it failed over line endings rather than over a value, the one
thing that test must not do, because a test that cries wolf is one everybody
learns to skip.

**Found by** deleting the file and checking it out again, which is what a clone
does. `.gitattributes` pins both files to LF; the test normalises as well.

### The tokens reach the panel, `4869092`

`tokens.css` declared everything on `:root` alone, which quietly excluded the
surface that matters most. The panel mounts in a shadow root with its
stylesheet inlined, so `:root` there is the *article's* document; reaching it
that way would mean writing Kona's tokens into somebody else's page and
inheriting whatever that page had set.

The stylesheet now opens `:root, :host, .kona-tokens`.

### One shared passage core, `bf6270d`

3b(b). `<Passage color text note />` is the whole surface: the pen, the words,
your note. No prop for which room it is in: there are two rooms by 17, and a
room is set once on an ancestor (`.kona-slab`, or nothing at all for paper,
since the library is the place).

**Checked in both rooms:** Source Serif 18/1.58 on paper, Inter 13/1.5 on the
slab, the note keeping its warm fill on paper and dropping to the accent edge
alone on the slab.

One test parses `passage.css` and fails on a `var()` naming a token that does
not exist: a misspelled custom property renders nothing and reports nothing,
so a passage would simply lose its colour in silence. Confirmed it bites by
introducing a typo and watching it fail.

**Left:** the pen dot is `aria-hidden`, so the colour needs saying by the first
frame built around a passage. Recorded under *Loose ends*.

### The fonts: `d8022e4`, decided in `4cfe23d`

The boards load Inter and Source Serif 4 from Google, which cannot ship:
decision 6 forbids a request made on account of a page you are reading. The
files are in the repository: latin, upright, one variable weight axis each,
**47 KB and 50 KB**. `npm run fonts` copies them out of `@fontsource-variable`,
so their provenance is executable rather than folklore.

**Checked:** both report `status: "loaded"`, the only two font requests are
local, and Inter measures 278px against the system stack's 255px on the same
line, so it is the bundled file doing the work and not a silent fallback. Also
verified git stored the `.woff2` files byte-identically, given the line-ending
trap above.

**3g** then settled what the panel gets: nothing. A font inside the shadow root
costs either ~64 KB of base64 parsed on every page Kona is allowed on, or a
manifest change declaring the file web-accessible, and `host_permissions` was
emptied in 3e precisely so the manifest asks for as little as it can. Drawn
side by side at 13px the difference is a little width and a little looseness.
Reversible in one commit if the panel ever looks wrong beside the library.

That commit also brought the licence rule into step: **Apache-2.0 and MIT for
code, OFL for fonts**, in `DIRECTION.md` and the settled table both.

---

## The panel

*The face of the product, and the thing a person is actually looking at while
they use Kona.*

### 2h: where it sits, `f4a6ed9`

2a to 2g say what the panel shows and never say where it is, and the two boards
that draw it open disagreed. Most of that was not a disagreement, `Open` holds
three highlights and `Space` holds twelve, so the height is content rather than
a rule. The inset was real, and 24 won.

**Settled:** fixed, docked right at 24px, 324 wide, content height capped to
the viewport; the bottom sheet below 840px; mounted on `documentElement` rather
than `body`; the contested bottom-right corner accepted rather than engineered
around.

### Rebuilt on the tokens, `6f6ec03`

Three resting states, every value from `tokens.css`, rows drawn by the shared
`<Passage>`, the first thing that proves 3a and 3b hold rather than asserting
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

### The bar, `6fac811`

2g and 10c are one surface, which is 2g's own argument: *the thing that tells
you where a highlight went is the same thing that changes where it went.* One
`Bar`, used twice: by the selection, where a pen makes the highlight, and by a
highlight you tapped, where a pen changes it and Delete appears.

It needed nothing from the controller. A plain click on highlighted text
already opened that highlight's card, and the card already carried `focusNote`.

**Corrected:** the old toolbar drew the pen dots in the *transparent* value,
the one meant for painting over someone's text. The bar is one of Kona's own
rooms, so the dots are the pen at full strength. There is a test pinning it.

**No archive on the bar.** An archived highlight is still painted where you
made it, so the gesture would change nothing you can see.

**Checked with tests rather than clicks**: the Browser pane was hidden, so the
page had no layout and a click could not be hit-tested against a painted range.
The selection bar was confirmed live; the rest is ten tests.

### The active space, `9c4abf8`

The last thing decision 2 describes that did not exist. The design log's table
said it plainly: no active id, no control, no hook in the save path.

**Decided and written into `DEFINITIONS.md`:** the active space belongs to the
device, not to the space. Partly because it is a statement about what you are
doing at this desk. Mainly because it must not travel, spaces move between
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
painted on the page, which is the definition's own claim about what removal
does.

---

## The bridge

*What makes one library instead of two. 3c agreed it was worth building; 3i
settled the three things 3c left open.*

### 3i, then the bridge, this commit

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
when there is a real domain, a placeholder copied into three files is how a
domain gets missed at launch.

**The refusals are shared, not written twice.** They started inline on both
sides; two copies of a security check are two chances for one of them to be
relaxed alone. `fromThisPage` is now one function both halves call.

**Measured in a real browser**, because the argument for the `source` check
rested on a claim worth confirming:

| | |
| --- | --- |
| same-window `postMessage` | `event.source === window` is true, origin matches, so the ordinary case works |
| a parent posting into a framed Kona | `event.origin` is **Kona's own**, identical to `location.origin`; `source` is the parent |

That second row is the whole argument. An origin check alone cannot see a
same-origin frame, the event really does carry Kona's origin. Only the source
tells them apart. The comment in `bridge.ts` had said the origin check was
useless here; it is not, it catches the *cross-origin* sender, and the two
halves do different jobs. Corrected to say so.

**A real failure found, and not papered over.** The round-trip test failed on
all six cases. The cause was happy-dom: it delivers `message` events whose
`source` is an `EventTarget` rather than the sending window, which no browser
does. The fix was to restore spec behaviour in the test environment, *not* to
relax the check, weakening a security check so a test passes is the wrong way
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

### 3c and 3e, `f70615e`

Two settled decisions that had never been implemented.

**3c:** the extension's library, spaces and plans pages are gone: 4,698 lines
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
is the part that fails quietly, ChatGPT handed the plain-page adapter still
highlights and stops understanding a conversation. One test covers a host that
merely ends in the right letters.

The soft switch went with it: `local:disabled-sites` was a second list that
could disagree with the browser's. One background test asserted the old
built-in filtering and now asserts the new truth.

### The Highlights view, `cb3a2f3`

The third piece of the loop, and the first screen to use the paper room the
token file has had since stage 0 with nothing rendering it.

17's three kinds of control in three places: the nav says where you are, the
search box spans everything, the chips stack. Rows are the shared `<Passage>`,
so the passage a person recognises in the panel is the one they read back here
Source Serif at 18px rather than Inter at 13.

`app/src/source.ts` decides where the library reads from: the bridge when the
extension is here, the app's own storage when it is not. One or the other and
never both.

**Checked in the browser** with four seeded highlights: the colour chip narrows
to one and unpicking restores four; a search for *osmosis* finds the one;
clearing restores four; the site chip finds the chatgpt.com one.

### Loose ends, this commit

`quote.ts` now says nine where it said seventeen, with the arithmetic beside
it. `SHIPPED_AHEAD` is deleted rather than deferred: 3c left it with nowhere to
be said. `conversationId` is deferred on purpose, it is the middle of every
storage key, so it is a migration rather than a rename, and `DESIGN-LOG.md`
now says so instead of implying it was forgotten.

`REVIEW.md` collects every decision taken without asking, grouped by what it
would cost to change.

---

## The rest of the in-page product

### The note editor, and two things that should not exist, this commit

The last of `src/ui/styles.css`, which is now deleted.

**The note editor** is rebuilt on the tokens as `Note.tsx`, and it lost half of
itself on the way: the old card carried the pens and Delete in its header, but
10c put both on the bar and the editor opens *from* that bar. Repeating them
was the same control in two places, one click apart, disagreeing about which
you pressed. What is left is what the editor is actually for: your words, and
your tags.

**Search in the panel was already decided against.** 15 says *no search in the
panel* in as many words. The palette had simply never been removed, which makes
it the third settled decision this rebuild found unimplemented, after 3c and
3e.

**The minimap had never been decided at all**, not in any of the three
documents, not on any board. 2j settles it: it goes. 2b settles three resting
states and a permanent fourth thing is not one of them; 2c says Kona is a guest
on every page, and a guest does not put two pieces of furniture in the room.

Removing both left the controller carrying their machinery: the search state,
the tick building, the viewport slice tracked on every scroll. All gone.

**Measured afterwards.** The in-page surfaces now declare **zero** values of
their own: `panel.css`, `bar.css` and `note.css` all read entirely from the
token file. Only the extension's own pages are left, `popup.css` at 21 and
`welcome.css` at 18. The build dropped from **548 KB to 468 KB**.

**A test environment finding worth keeping.** The click-away save could not be
tested until I measured when preact's effects actually run under happy-dom:
not on the render tick, and not on the next one: they need a frame, because
preact schedules on `requestAnimationFrame` and happy-dom backs that with a
timer. The test waits for one rather than guessing.

---

## Finishing the extension

### Welcome becomes About, and the last two stylesheets, this commit

**The main ability first.** The instruction was that it must never degrade, so
before changing anything more I checked what the rebuild had actually touched
in the matching core. `locate.ts`, `textIndex.ts`, `link.ts`, `pageUrl.ts`,
`order.ts`, `search.ts`, `retrieve.ts`, `tags.ts`, `text.ts`, **zero changes**
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
halfway comes back: the phone analogy, where only setup that finished stops
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
fonts. **Verified that did not leak into the content script**, no font
reference in any `content-scripts/*.js`, which is 3g holding.

---

## Archiving, the caps, and a regression

### Archiving and the two Free limits, `234a364`

Decision 10, and the shape is the whole of it: **archived is a filter on one
list, not a place.** A place has to be known about by everything, search
whether to look there, counts whether to count it, spaces whether to show it,
export whether to include it, and each is a chance for two surfaces to
disagree about where something is. A filter is known about by one list.

`Mark` gains `archivedAt`, absent until it happens, so every highlight ever
saved is already correct with no migration.

Both caps are per device, because Free has no sync and its counts are local
(10a). **Fifteen archived at a time**, a working set rather than a quota,
un-archiving hands the slot straight back, and reaching the cap never deletes
or un-archives anything on its own (7). **Five spaces, a hard five**, because
archiving a space is Pro and so nothing defeats it.

Bulk, because 10 says otherwise it is not a feature. Asking for more than there
is room for archives what fits and says so. The notice offers bringing one back
or Pro, with **no delete in it**, offering delete there teaches people to
delete when they meant to tidy.

**Two bugs, both found by driving it rather than reading it.**

The Archived view showed the *unarchived* rows: the filter's `useMemo` did not
depend on the view, so switching never recomputed. It looked entirely fine.

Then the counts disagreed with the data, storage held exactly fifteen archived
and the nav said six. Every save tells the store and the store tells the
library, so archiving fifteen starts fifteen reads at once; they do not return
in the order they went out, and an early one landed last and put a stale
library on screen. Reads are sequence-guarded now. That is the worst kind of
wrong, because the data was right and nothing looked broken.

### A regression I caused, and did not notice, `d7d4991`

Worth recording as a failure rather than a fix. When the rebuilt Highlights
view took the default route two commits earlier, everything in the old screen's
default branch stopped being reachable: the install prompt (24), folder sync,
the backup, the theme, and the **Android share target** (1h).

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

## Spaces

### Rebuilt as 20 settled it, `7571299`

**A space is a place to put highlights together. That is the whole of it.**
Everything else on that screen was what had quietly grown on top.

So findings and the write-up are gone from the view, because 20 took them out
of the definitions entirely: a finding was only ever a highlight with a note on
it, and the write-up was a second way to make a page 3d already provides,
shared spaces live on the web, openable by somebody who has installed nothing,
every highlight linking to the exact words. *That* is the document.

`Space` gains the `note` field it was supposed to have (1e), which the gap
table had been reporting as missing for a while. Spaces now lives **inside**
the library rather than beside it, which is 3f, the library is the place and
holds two views of what you keep.

That also avoided repeating the stranding mistake: nothing had to be re-routed
away from, because the library already owned the address.

**The five-space cap is enforced where spaces are made.** At five the button is
gone and the notice says what 7 says: delete one you have finished with, or
pay. Kona itself never removes or hides anything.

**Checked by driving it:** five made one after another, the sixth refused with
the wall, a space opened from the nav, and removing a highlight took the space
from three to two while the library stayed at twenty-one, the third verb
working, out of this space and nowhere else.

### `team/` is left alone, deliberately

3d says the Team demo **folds into** the web app rather than standing beside
it. Folding needs somewhere to fold into, and the web app has no shared spaces
none of Team is built, and it is frozen.

Deleting `team/` would therefore not be folding, it would be removing a working
demo and breaking five links on the landing page for no gain. The duplication
3d objects to (a third `memo.ts`, `types.ts`, `store.ts`) is real and is
**still there**, and it is the thing to fix when Team thaws, by building shared
spaces in `app/` rather than by deleting the demo first.

---

## Finishing the web app

### Settings, and every view a route, `e896da3`

Export is the part of this that matters, and decision 6 is why: Kona cannot
read your library, so if you lose every device the data is genuinely gone. A
file you keep is **the only backup that exists**, which turns export from a
courtesy into a safety feature, and nothing that is a safety feature goes
behind a tier. Free, always, both formats (14). Checked both: the backup
round-trips four out and four back, and the Markdown carries the passage and
the note.

**I nearly repeated the stranding mistake in the same week I wrote it up.** The
first draft of this screen replaced folder sync with a paragraph saying there
is no server yet. True, and it would have removed the only way a Free library
reaches a second device today. Folder sync is here, on the same
`useFolderSync`, saying plainly that it is not decision 6's hosted sync and
does not run itself.

**A bug the move exposed:** the nav said *Highlights* while *Settings* was
showing. The view was held in state beside the route, so clearing one did not
clear the other: and `replaceState` fires no `hashchange`, so the pane never
heard. Every view is a route now, which makes that disagreement impossible
rather than fixed.

### A share gets its own screen, `62bc20f`

`App.tsx`, `Spaces.tsx` and `app.css` are gone: **1,971 lines**, and the 27
values that were keeping two of the three oranges alive.

A share gets a screen of its own because a share has no route, a plain URL
with a query and nothing else, which is how it went unnoticed for two commits.
Recognising it by what it carries is now the first thing `main.tsx` does, and
the only thing left that is not the library. It keeps the adoption rule: a
phone shares in two goes, text then link, so a passage kept moments ago with no
page is waiting for this URL rather than being a second thing.

**The desktop app keeps its reason to exist.** Its whole purpose is handing the
library a folder source that is a real path rather than a handle the browser
may forget, plus the tray's sync-now. Both are threaded through `Library` into
`Settings` rather than dropped with the screen that used to take them. Frozen,
not broken.

**Measured:** the only stylesheets still declaring values of their own are the
landing page and the frozen Team demo. Everything in the extension and
everything in the web app reads from `src/design/tokens.json`.

---

## Contrast, and the listing

### Two contrast defects, `4ec23ed`

Both found by computing ratios rather than looking at them.

**The serious one was in the main ability.** A mark is transparent, so the words
end up sitting on the mark *and the page under it*, and the painter wrote dark
ink on every mark regardless. Over a light page that reads at 9.5:1 or better.
Over a dark one it lands on a dark composite and falls to **1.5:1**, which means
the highlight made the text harder to read than not highlighting it. That is
most documentation sites in dark mode and ChatGPT in dark mode, which is a lot
of where Kona is meant to be used.

Two inks now, and the painter asks the page, which the controller already knew.
Worst pen measured: 9.52 with the dark ink on white, 5.02 with the light ink on
near-black. A mid-grey page is the one neither can fix, and the light ink is the
better of the two there.

**The test that should have caught it measured the wrong pair**: the ink against
the pen at full strength, which is a dot in Kona's own rooms and not what any
word sits on. It composites the mark over a page now, both ways, and keeps the
broken case as a record so switching the ink back cannot look like a tidy-up.

**The second one was mine.** White on `--kona-accent` is 3.50:1 and fails AA.
The deleted stylesheet had said so in a comment; the knowledge went with the
file, and three filled buttons shipped at 3.50 before it came up again. There is
an `accent-fill` token now at 5.09:1, and the ratio is computed in a test rather
than trusted to a comment.

### The listing described a product that no longer exists, `6b650ea`

An audit of what a store submission needs, and most of what it found was copy.

The **permission justifications** named three host permissions that no longer
exist, the first thing a reviewer compares against the manifest, and said
nothing about the one content script that does. The **privacy policy** listed
data Kona stopped storing when 3e deleted the soft switch. The **landing page**
was still selling findings, write-ups and a citing memo, all of which 20
removed, and put hybrid search in the Free tier where 11 makes it Pro's. And the
**prices were wrong in both places**: `plans.ts` said Pro was $7 a month and
Team $14 a seat, where 8 settled $30 a year or $3 a month and left Team's price
open.

The pricing test caught half of this on me, which is exactly what it is for: it
compares the site against `plans.ts` and fails when the price of the product
changes in one place only.

`TO-PRODUCTION.md` is new: what is left, in the order it has to happen, with
what each piece costs.

---

## Where it stands

| | |
| --- | --- |
| Tests | 484 |
| `src/ui/App.tsx` | 766 → 279 lines |
| Removed | 4,698 lines of duplicated screens, plus the soft switch |
| Built | the token file, the passage core, the fonts, the panel, the bar, the note editor, the active space, the bridge, the whole library: Highlights, Archived, Spaces, Settings, the share screen, Welcome/About, archiving and both Free caps |
| Removed as decided | the extension's library, spaces and plans pages; the soft switch; the panel's search (15); the minimap (2j) |
| On the tokens | **the extension and the web app, entirely.** Only the landing page and the frozen Team demo still decide their own |
| Kona's orange | one value in both products; the stragglers are `site/` and `team/` |
| Not yet | `team/` folded in (3d), the landing page, the paid half |

**Still carrying the old sketch:** `team/` has not been touched, so 3d, one
web app, not two, is still only a decision. `app/`'s Spaces screen is still
the old one, and the dead library branch beside it comes out when Spaces is
rebuilt.

**Kona's address is `https://aniketpandey05.github.io/kona`**, which it has
been publishing to on every push the whole time, the placeholder was the only
thing missing. The bridge's content script, the Library button and the page
client all read `KONA_ORIGINS`, so a custom domain later is one line.
