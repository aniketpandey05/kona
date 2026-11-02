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

**A grouping of highlights, from any number of pages, about one topic.**

That is the whole of it. A space is for researching amoebas by marking things
across five different articles and having all five in one place.

Why it needs to exist, in one line: **the library is organised by page, so
highlights about one topic read across five pages sit in five places. A space
is where they sit in one.**

What "grouping" means exactly, because this is the part everything else rests
on:

- The space **points at** highlights. The highlight stays in the library and
  stays one highlight. Nothing is copied and nothing is moved.
- Everything comes with it: its link, its note, its tags, its colour. A
  highlight in a space is not a reduced version of itself.
- **Clicking it in a space does exactly what clicking it in the library does**
  — it opens the page and lands on the exact words.
- Change its note while in a space and the note is changed, full stop, because
  there is only ever the one highlight.
- Removing it from a space removes it from the space. It is still in the
  library. Only deleting deletes.
- One highlight can be in several spaces at once.

### What a space has of its own

Beyond the highlights it points at:

| | |
| --- | --- |
| **Topic** | What it is called. The only required thing. |
| **Question** | What it is trying to settle, if it is trying to settle anything. Optional. |
| **Note** | Anything else worth saying about the space that is not the topic. Optional. |
| **Labels** | Its own short labels, working like tags do on a highlight, for pulling related spaces together. Optional. |
| **Created** | The day it was made. |
| **Active** | Whether this is the space being worked in right now. See below. |
| **Position** | Where it sits in your list. Spaces are reordered by hand, the way highlights already are. |
| **Findings, open questions, decision** | Optional, and drawn only once they hold something. |

### Active space

**The one space you are working in now.** While a space is active, a new
highlight goes into it as well as into the library, with nothing to file by
hand.

Researching one topic means marking twenty things across five pages, and
filing each one separately is twenty interruptions in the middle of reading.
Setting the topic once is one.

One space is active at a time, and none being active is normal — then
highlights go to the library only, as they do today.

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
- threads on a passage
- the people in the space, and their signatures

A solo user never sees any of it. That is not a gate bolted over a shared
feature; it is that none of it means anything with one person.

### Thread

The discussion hanging off one highlight, inside one space. The same passage
gathered under two questions has two separate threads, because the argument
about it in one is not the argument about it in the other.

A thread is in one of three states, and **the state decides how much room it
takes up**:

| State | What it means | How it looks |
| --- | --- | --- |
| **Talking** | People have said things. Nobody is waiting on anybody. | Shown as it is. |
| **Asking** | Somebody asked something and it has not been answered. The team owes a reply. | Stays open, and appears in the space's attention list. |
| **Settled** | Done with. | Collapsed to one line — who settled it and how many replies. Click to read it. |

Today only *settled* and *not settled* exist. **Asking** is the missing one,
and it is the one that does the work, because it is the difference between
"there is discussion here" and "something is waiting for you".

### Attention list

What a shared space shows at the top: **everything still waiting on somebody.**

It holds the space's own open questions and every thread in the *asking*
state, together, because they are the same kind of thing — a question attached
to a passage is an open question that happens to have a passage. Everything
settled is out of the way below.

This is the organising idea of a shared space. A space's job is to tell you
what still needs you.

### Raising a question (a ping)

**Somebody is unsure about a passage and wants everyone to look at it.**

It is one action with three effects: the thread goes to *asking*, the highlight
is marked as having a question on it, and everyone else in the space is told.

This is what makes *asking* work. A state nobody notices is not a state, and
raising a question is the deliberate act that puts a thread into it — rather
than hoping a teammate spots that a reply ended in a question mark.

A ping is not a separate kind of thing to store. It is a comment marked as a
question, which is why answering it and settling the thread put it away again.

**Two parts, and only one of them is shared:**

- **That a question was raised** — a fact about the space. Everybody sees it,
  it travels with the space, and it stays until the thread is settled.
- **Whether *you* have seen it yet** — yours alone. **This never travels with
  the space.** Spaces merge between people, and one person's unread is not
  another's; share it and everybody inherits everybody else's.

**What "told" can mean today:** nothing is pushed anywhere. A space reaches
other people by a shared folder or a handed-over file, so a raised question
arrives when their copy next syncs — which may be seconds on a desktop
watching a folder, or whenever they next open it. Real notifications need the
server that Team is waiting on. Until then a ping is a strong mark inside the
space, not an alert on somebody's phone, and the interface should not pretend
otherwise.

### Poll

**A quick way to ask "does everyone agree?" without ten replies saying yes.**

Put on a finding, a decision, or a highlight somebody has questioned. Anyone in
the space can start one, anyone can answer, and the tally is visible.

**A poll records agreement. It never acts on its own.** Nothing is removed,
settled or decided because a vote came out a certain way. That one rule is
what keeps it small: with no automatic consequence there is no need for a
quorum, a tie-break, a rule about who may vote, or an expiry — the things that
turn asking a question into a governance system.

So "four of five agree" is something the team knows, and then a person decides.
It also earns its keep in the write-up: a finding four people agreed with reads
differently from one nobody answered.

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
