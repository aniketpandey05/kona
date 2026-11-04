# Kona: the design

Three documents, one job each, and two sets of drawings.

| | |
| --- | --- |
| **`DIRECTION.md`** | What Kona is, and what every surface of it does. This file. |
| **`DEFINITIONS.md`** | What every word means, in the present tense of the finished product. |
| **`DESIGN-LOG.md`** | Every decision, why it was made, and the few still open. |
| **Panel mockup** | The in-page panel, five states. |
| **Library mockup** | The library, the settings, and the phones. Thirteen boards. |

This file is the design drawn together. Where it says *(2e)* it is naming the
decision that settled something, and where it says *board 7* it is naming the
drawing.

---

## 1. What Kona is

**You highlight a passage anywhere you read, and you can find it again and land
on the exact words.**

Everything else is downstream of that. Not a bookmark manager, not a
read-later app, not a notes tool that accepts quotes. The unit is a passage,
and the test is whether you get back to it.

**It works where people now actually read**, which includes AI chats. A
conversation with ChatGPT is reading, the good part is worth keeping, and
nothing else treats it as a page.

---

## 2. Why anybody would choose it

Three things, and only three.

**It lands.** Most tools store the text. Kona re-finds the passage on a page
that has been rewritten since — exactly, then ignoring whitespace, then
approximately — and says so plainly when it cannot (13).

**It covers AI chats**, where a lot of the useful reading now happens.

**It cannot read your library.** Encrypted on the device, embeddings computed
on the device, and an install with no account sends nothing anywhere (6). A
highlight library is a reading history — an illness, a lawsuit, an election —
and the rest of this field holds that in the clear.

---

## 3. The surfaces

### In the page — the extension

**The extension highlights, and does nothing else** (3c). It is the only part
of Kona that can, because only it runs inside the page you are reading.

**The panel** is about *this page* (2a) and has three resting states, not two
(2b): out of the way by default, a small mark when there is something here, and
open when you ask. It **floats and never pushes the page** (2c), and on a page
with nothing kept it is one faded mark and no more (2d) — an empty panel on
every page in the world is the fastest way to be uninstalled.

**It always says where highlights are going** (2e), in words. When the active
space is shared it says *that* too, with the number of people, because
silently publishing your reading to colleagues is the worst failure available
here (25).

**The bar** appears when you mark something: colours, a note, and the space it
went to — with a single tap to take it back out (2g), never a modifier key,
because a phone has none. **Tapping a highlight you already made brings up the
same bar** (10c), now with delete. Not archive: archiving leaves a highlight
painted, so doing it here would change nothing you can see.

Nothing of Kona ever enters the page's DOM. Highlights are painted with the CSS
Custom Highlight API, which is why a tap has to be hit-tested rather than
handled, and why a highlight over a link lets the link win.

**The popup** survives for one reason: `permissions.request` must come from an
extension page on a gesture (3e). **Nothing is built in** — not even the AI
chats — so a fresh install asks for nothing and raises no warning, and Kona
asks for a site while you are standing on it. It does not list the sites you
have allowed; the browser already does that, authoritatively.

### Everywhere else — the library

**The library is the place** (3f), holding two views of what you keep:
*Highlights*, by where you read, and *Spaces*, by what you want to find out.

**Three kinds of control, in three places** (17), which is the thing the first
mockup got wrong:

| | |
| --- | --- |
| **The nav** | Where you are. One at a time |
| **The search box** | Across all of it (15) |
| **The chips** | Colour, site, when. They stack |

The nav is Gmail-shaped and folds behind three bars on a phone. It is also what
makes Pro's unlimited spaces survivable: forty rows scan, forty tabs do not.

**A space is a place to put highlights together. That is the whole of it**
(20). It has a name, a question, a note and a hand order; it can hold a page
you have not read yet; and three different verbs take things out of it —
**remove from this space**, **archive**, **delete** — each leaving more
standing than the next.

**Archive works like Gmail's** (10): out of the default view, still in search,
still painted, still in its spaces. An ordinary bulk gesture, not a considered
one.

**The account row sits at the foot of the sidebar** (17a), quiet. *Sign in*, or
your name, or amber when sync has stopped — which is the only time Kona speaks,
because 23 gives a failed sync no other route to you.

**Pens** is the colour list (12): four to begin with, a picker, an opacity
slider, names from the hue. Editing it changes nothing already marked —
swapping a pen does not change marks on paper — so the colours in use can
outnumber the pens, and the ones you retired are still listed and still
filterable.

**Welcome becomes About** (4). It opens exactly once, the way a phone walks you
through setup, and afterwards it is the releases, the FAQ and the tutorials. Its
notes ship with the build, so opening it sends nothing anywhere.

### On a phone

**iPhone runs the extension**, inside the App Store container that Apple
requires anyway (9) — so one install gives both, and nobody performs the
Add-to-Home-Screen ritual that broke this product once already.

The phone already shows its own menu over selected text, and an extension
cannot replace it. **Kona takes one dot below the selection**, which becomes
the full bar when tapped (22, boards 9 and 10). This is the one decision that
cannot be settled from a desk.

**Android is both a place you read and a place you highlight** (1h). Firefox
runs the extension. Chrome has none, so capture is the share sheet — and Chrome
builds the link to the highlighted text itself, so what arrives is already
Kona's format. **The return trip needs no extension at all**, on either
browser, because the links are text fragments.

### Everywhere

**Dark in the page, light in our own rooms** (17). The panel is a dark slab
because it floats over somebody else's article and has to stay legible over
anything. The library is your own room. Dark mode is coming to the library
only, for the same reason.

**Kona opens as an app** on a desktop and on a phone (24) — the same web build,
installed. A tab is not a place.

---

## 4. The tiers

**Each rung is a different kind of thing, not a bigger number of the same
thing** (11).

| | |
| --- | --- |
| **Free** | Alone, on one device. Five spaces, fifteen archives at a time, unlimited highlights |
| **Pro** | Alone, everywhere, in step. Unlimited, plus hybrid search |
| **Team** | With other people |

**Limits exist only on Free**, so that rung is felt. Above it a limit would be
a second wall charged for once.

**An account means sync and nothing else** (5). Available on every tier,
required on none, and a library made before an account existed goes up intact
when one is made.

**Upgrades are offered where the limit is felt and nowhere else** (25) — the
sixteenth archive, the sixth space, a word search that missed by meaning.
Nothing in the extension is capped, so the extension sells nothing.

---

## 5. What survives the rebuild

**The existing interface is a sketch, not a constraint.** It was made on a
whiff, which is why the product is being rebuilt from these documents, and the
finished thing is expected to look very different.

**The matching core is the exception, and it is the valuable part:** `quote.ts`
with its three passes, `locate.ts` with its two, `textIndex.ts`, `painter.ts`,
`link.ts`, `pageUrl.ts`, and the ordering, search and tag code beside them.
That is years of the actual difficulty, under test. **Rebuild the screens, keep
the core.**

Two small things to fix while nothing is built on them: a stale comment in
`quote.ts` that says seventeen characters where the arithmetic says nine, and
`conversationId`, which is what the code calls a page because the chat sites
came first.

---

## 6. Still open

| | |
| --- | --- |
| **Team's price** (8) | Waits for what the setup costs to run. Pro is $3 a month |
| **The selection bar on a phone** (22) | Needs an iPhone, not a desk |

---

## 7. Money, and other people's code

**Pro is $3 a month**, through **Stripe on the web** — not Apple's in-app
purchase, which takes 30% in year one. At $3 the fixed part of a card fee is
about 13% of the price every month and about 4% once a year, so the
annual switch carries most of the margin rather than being decoration.

**Open source for solved problems** — `approx-string-match` is already doing
the approximate matching, and it is the Hypothesis author's work on exactly
this problem. Article extraction and embeddings are the same kind of thing.
**Never for what Kona is**: what a space is, how the panel feels, what happens
when a highlight cannot be found. **Apache-2.0 and MIT only.**
