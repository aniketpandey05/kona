# What every word in Kona means

One meaning per word, written down before anything is built with it.

This file exists because the same screen got built four times and the pricing
got written in four places that disagreed. That is what happens when a word
means slightly different things to whoever is typing at the time. Anything
built from here on uses these words with these meanings, and if a meaning turns
out to be wrong, it is changed **here** first.

**It describes Kona finished, in the present tense.** Whether a thing is built
is not a question about what it means, and the answer would be out of date
within a week. `DESIGN-LOG.md` keeps that.

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

### Palette

**Your highlighting pens.** The colours available when you highlight something
— four to begin with, and you can make your own with a picker and an opacity
slider. Kona never refuses a colour you chose.

A colour is named by its hue, so that Kona can refer to it in a list and to a
screen reader. It is never named by what it means to you. **What a colour means
is yours**; Kona does not define it, and lets you filter by it.

**Editing a palette changes nothing you have already marked.** Swapping a pen
in the case does not change the marks on the paper — a highlight keeps the
colour it was made with. So the colours in use across your library can
outnumber the ones in the palette, and filtering by colour works on what is in
use.

Free, and therefore per device, because Free does not sync.

### Page

One address, with tracking parameters ignored, so that arriving from a search
result and arriving from a link are the same page.

What counts as tracking is a named list, not a guess: `utm_*`, `fbclid`,
`gclid` and the rest. A plain word like `ref` is never stripped, because a site
may mean something by it.

### Library

**Everything you have kept, in one place.** It is what the extension's button
opens, and it holds two views of what you keep:

- **Highlights** — everything you kept, from everywhere, organised by *where
  you read*.
- **Spaces** — the same highlights, gathered by *what you want to find out*.

That is the distinction, and it is between the two views rather than between
the library and anything outside it. The library is the place; those are the
two ways in.

The Highlights view leaves out anything archived, and that is the only thing
archiving changes: an archived highlight is still searchable, still painted on
its page, and still in every space it was added to.

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

One space is active at a time, and none being active is normal — highlights
then go to the library only.

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

**Asking** is the one that does the work. It is the difference between "there
is discussion here" and "something is waiting for you".

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

**Putting something out of the way without losing it.** It changes exactly one
thing: whether that thing appears in the default view of the list it belongs
to. Nothing is deleted, and nothing stops being searchable.

**A highlight** can be archived on every tier: **ten at a time on Free**,
without limit on Pro. The ten are a working set and not a quota — un-archiving
hands the slot straight back, so the limit is how many can be put away at once
rather than how many ever can be. Reaching it never deletes or un-archives
anything on its own.

**A space** can be archived on Pro and Team, and not on Free. The five-space
cap is therefore a hard five: archiving would turn that cap into a formality,
and that is a reason for someone to pay rather than a hardship. Above Free
there is no cap left for it to defeat.

### Delete

**Getting rid of something.** Gone from the library, from search, from every
space it was in, and no longer painted on its page. Not recoverable, and there
is no trash — archive is the thing for *I might want this later*, so the pair
divides cleanly: archive if you might want it, delete if you are sure.

A single delete can be undone immediately afterwards. Deleting several at once
asks first. In a shared space you can delete what you contributed and not what
anybody else did.

Wherever both are offered, archive is at least as easy to reach as delete.

---

## Surfaces

### The rule that decides all of this

The question is not *app or extension*. It is: **can Kona's code run inside the
page you are reading?** Everything else follows from the answer.

| | Runs inside the page you are reading? |
| --- | --- |
| **Extension** | Yes — inside any page, in the browser you already use. |
| **A native app with a browser built into it** | Only inside pages you browse *in Kona*. |
| **A web app** | **Never.** |

The last one is not a gap to engineer around. A web page cannot reach into
another site's page: cross-origin frames are sealed by the browser, and most
sites refuse to be framed at all. No amount of work changes it.

**So the app cannot highlight, and the extension is the only thing that can.**

### Where Kona can highlight

| | |
| --- | --- |
| Chrome, Edge, desktop | Extension |
| Firefox, desktop | Extension |
| Safari, Mac | Extension |
| **Safari, iPhone and iPad** | Extension — shipped through the App Store, because Apple requires every Safari extension to live inside an app |
| **Firefox, Android** | Extension |
| Chrome, Android | **Not possible.** Chrome on Android has no extensions, for anyone |

On iPhone the distinction disappears: the extension *is* the app, because that
is the only way Apple allows one to be installed. "Kona has an iOS app" and
"Kona has a Safari extension" are the same sentence. The app that carries the
extension is also where the library is, so one install gives both.

### Extension

Kona inside a browser. **The tool you highlight with**, and the only part of
Kona that can be.

It reads a site only once you have allowed that site, one site at a time, and
there are no exceptions: nothing is allowed when Kona is installed, and the AI
chats are not special. A fresh install therefore has access to nothing, and
Kona asks for the first site while you are standing on a page you want to keep
something from.

### Panel

The strip Kona shows inside the page you are reading. It is about *this page*.
It is where a person spends most of their time and should be the best-made
thing in the product.

### App

Kona everywhere that is not the page you are reading. **It is where you look at
what you have gathered** — read, search, organise into spaces, and keep
everything in step. It never highlights.

It opens in a browser tab, and on a phone from its own icon. What separates it
from the panel is not the browser: the panel is about one page, and the app is
about everything.

It also captures, but only by being handed something: share a link or a passage
to Kona from anywhere, and it is kept. That is capture without being inside
the page, and it is as far as an app can go.

The app is the only Kona available where no extension can run, which today is
Chrome on Android.

### Device

One browser profile, or one installation of the app. What "one device" and
"all your devices" are counted in.

## Money

### Free

The extension, on one device, with no account. Unlimited highlights, notes and
tags. Search by word. **Five spaces, a hard five.** Ten highlights archived at
a time. No sync.

### Pro

Everything in Free, on every device, kept in step. Unlimited spaces. Archiving
without limit, of highlights and of spaces. Hybrid search. One person.

### Team

Everything in Pro, plus shared spaces: discussion, who gathered what, and
deciding together. Its selling point is other people, not a larger allowance.

### Sync

Your library on more than one device, kept in step without you wiring anything
up. **Paid.**

**What syncs cannot be read by the server.** Highlights are encrypted on the
device before they leave it, with a key the server never holds. What the server
knows is that an account exists, its email address, when it last synced and
roughly how much it holds — never what any of it says. The key lives on your
devices and in one recovery phrase; if every device and the phrase are lost,
the data cannot be recovered by anyone, Kona included.

Syncing through a folder you own, or a file you carry between machines, is a
different thing and is not this.

### Hybrid search

Searching by meaning as well as by word.

Search by word is BM25 plus a thesaurus Kona learns from your own library, and
every tier has it. Hybrid search adds real embeddings on top: a different
capability, not the same one with a gate in front of it.

The embeddings are computed on the device, like everything else the server is
not allowed to read. This is affordable because you only ever search your own
library, which is small.

### Account

**Open.** The one word in here without a meaning: see decision 5 in
`DESIGN-LOG.md`. Everything paid rests on it, the free cap included, because
you cannot cap what you cannot identify.
