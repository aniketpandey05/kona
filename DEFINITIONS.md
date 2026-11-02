# What every word in Kona means

One meaning per word, written down before anything is built with it.

This file exists because the same screen got built four times and the pricing
got written in four places that disagreed. That is what happens when a word
means slightly different things to whoever is typing at the time. Anything
built from here on uses these words with these meanings, and if a meaning turns
out to be wrong, it is changed **here** first.

The three documents: `DIRECTION.md` is why, this is what, `DESIGN-LOG.md` is
what is still undecided.

---

## The things a person makes

### Highlight

A passage of text you marked on a page, kept with everything needed to find it
again: the words, the page it was on, the text around it, and a colour.

It is the atom of Kona. Everything else points at highlights.

- It lives in **the library**, always, and in exactly one place there.
- It is never *inside* anything else. A space does not contain highlights; it
  points at them. The same highlight can be pointed at by several spaces and
  is still one highlight.
- Deleting it is the only thing that removes it.

### Note

Your own words, attached to one highlight. Optional. One per highlight.

A note is what *you* thought. The highlight is what the *page* said. The two
are never mixed together, including in the write-up and in exports.

### Tag

A short label on a highlight, up to twelve per highlight, used to filter the
library.

A tag is a property of a highlight, the way a colour is. **Tags and spaces are
independent and do not compete.** A space can gather highlights carrying any
tags, from any number of pages; a highlight keeps its tags whether or not it is
in a space. Neither one implies the other, and neither is a lesser version of
the other.

### Page

One address, with tracking parameters ignored, so that arriving from a search
result and arriving from a link are the same page.

What counts as tracking is a named list, not a guess: `utm_*`, `fbclid`,
`gclid` and the rest. A plain word like `ref` is never stripped, because a site
may mean something by it.

> **Naming debt:** the code calls this a `conversationId`, on ordinary web
> pages as well as AI chats, because chats came first. The word is wrong for
> most of what Kona now covers. Renaming is cheap and has not been done.

### Library

Every highlight you have, from everywhere, in one searchable place.

**The library is organised by where you read.** That is the whole distinction
from a space, which is organised by what you want to find out.

---

## Spaces

### Space

**A workspace for researching one topic across many links.**

It points at highlights, gathered from any number of pages, carrying any tags.
It does not hold them; they stay in the library.

A space is not a folder and not a tag. A folder is where a thing is kept, and a
highlight is already kept in the library. A tag is a label on one highlight. A
space is a piece of *work* with a topic and, eventually, something to show for
it.

### Solo space

A space with one person in it. **Personal, and deliberately low ceremony:**
search different things, put them in, make sense of them later.

Nothing in it is required. A space holding a question and twelve highlights,
with no findings and no decision, is a finished and perfectly good space. It
must look that way and never like a form somebody abandoned.

### Shared space

A space more than one person is in. Everything a solo space is, plus discussion
and deciding together. **Team tier.**

Only here do these appear at all, in the data and on the screen:

- who gathered which highlight
- comment threads on a passage
- marking a thread settled
- the people in the space, and their signatures

A solo user never sees any of it. That is not a gate bolted over a shared
feature; it is that none of it means anything with one person.

### Finding

A claim you drew out of a space, carrying the passages it rests on.

Findings are what the write-up is assembled from. Optional, like everything in
a solo space.

### Open question

Something the space has not settled. Optional. The reason to come back to it.

### Decision

What the space concluded, if it concluded anything. Optional, and more useful
to a team than to one person.

### Write-up

The document a space produces: the question, the findings, each citing the
passages behind it, with links that land on the exact words for a reader who
has never installed Kona.

**Free.** A space that cannot produce a write-up is a folder, and the point of
a space is that it produces something.

### Archive

Putting a space out of the way without losing it. **Team tier.**

Free and Pro do not have it, and the five-space cap is therefore a hard five.
Archiving would turn the cap into a formality, and that is a reason for someone
to pay rather than a hardship.

---

## Surfaces

### Extension

Kona in a browser. **The only surface that can highlight.** Chrome, Edge,
Firefox, Safari on a Mac, and Safari on an iPhone or iPad.

### Panel

The strip Kona shows inside the page you are reading. It is about *this page*.
It is where a person spends most of their time and should be the best-made
thing in the product.

### Phone app

Kona as an installable web app. It cannot highlight — Chrome on Android has no
extensions — so it is a reader for the library, plus capture by sharing a link
to it. **The Android answer.**

### Desktop app

Kona as a program on a computer. It cannot highlight either. It exists only
because Firefox and Safari cannot pick a sync folder. **Frozen**, because
hosted sync closes that gap for everyone with nothing to download.

### Device

One browser profile, or one installation of the phone or desktop app. What
"one device" and "all your devices" are counted in.

---

## Money

### Free

The extension, on one device, with no account. Unlimited highlights, notes and
tags. Search by word. **Five spaces, a hard five.** No sync.

### Pro

Everything in Free, on every device, kept in step. Unlimited spaces. Hybrid
search. One person.

### Team

Everything in Pro, plus shared spaces: discussion, who gathered what, deciding
together, and archiving.

### Sync

Your library on more than one device, kept in step without you wiring anything
up. **Paid.** What exists today — a folder you own, or a file you carry — is
not this.

### Hybrid search

Searching by meaning as well as by word.

Today's search is by word (BM25) plus a thesaurus Kona learns from your own
library. Hybrid search is that plus real embeddings, which is a genuine
capability and not a switch thrown on something that already works.

### Account

Not yet defined. See decision 5 in `DESIGN-LOG.md`. Everything paid depends on
it, including the free cap, because you cannot cap what you cannot identify.
