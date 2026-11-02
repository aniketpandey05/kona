# Design log

How this works: **one decision at a time, written down before any code.**

Kona has been built by trying something, looking at it, and changing it. That
got a lot made, and it is also why the same screen exists four times and why
the pricing was written in four places that disagreed. The cure is not more
care while coding. It is deciding first, in writing, so that a thing is built
once and nobody has to guess later why it is the way it is.

A decision is finished when it has an answer here, in a sentence anyone could
act on. Until then it is open and nothing gets built on top of it.

Three documents, one job each: `DIRECTION.md` is why, `DEFINITIONS.md` is what
every word means, and this is what is still undecided.

---

## Settled

| Decision | Answer |
| --- | --- |
| What Kona is | You highlight a passage anywhere you read, and can find it again and land on the exact words |
| Tiers | Free: extension, unlimited highlights, word search, 5 spaces, no sync. Pro: sync across devices + hybrid search. Team: shared spaces |
| Why the free cap | A free tier that does everything leaves no reason to upgrade. Drawn now, with no users, rather than clawed back later |
| Where the paid line sits | Free is one surface. Pro is every surface, kept in step |
| Payments | Stripe on the web. Not Apple's in-app purchase: their rate is 30% in year one |
| iOS | A Safari Web Extension, not a separate native app |
| Open source | Use it where the problem is solved (matching, article extraction, embeddings). Never for what a space is or how the panel feels. Apache-2.0 and MIT only, nothing AGPL |
| What a space is | A workspace for researching one topic across many links. Alone: gather and conclude. With a team: discuss and decide. The collaborative parts appear only once it is shared |
| Extension or app | Neither replaces the other. The extension is the only thing that can highlight, because only it runs inside the page you are reading. The app is where you look at what you gathered |
| Desktop app | Frozen. Its only job was the folder-picker gap, which hosted sync closes |
| Team | Frozen. Good demo, no users, needs the same server Pro needs |

## Open, in order

The order is deliberate: **what the product is, before the machinery that
carries it.** Sync is weeks of work, and you cannot sensibly build the thing
that syncs spaces until you have decided what a space is. The first four are
cheap, need no server, and make what already exists better.

---

### 1. What a space is — settled

**A workspace for researching one topic across many links.** Alone it is for
gathering and concluding; with a team it is for discussing and deciding. The
team parts — people, who gathered which highlight, comment threads, settling a
thread — appear only once the space has actually been shared. Nothing is
deleted to achieve that.

This is the second idea in the product and it earns its place: **the library is
organised by where you read, a space by what you are trying to find out.**
That is why a space is not a folder and not a tag.

It also makes the free cap mean something. Five spaces is five topics at a
time, which is a real limit rather than an arbitrary one, and running out of
topics is a sensible moment to be asked for money.

Four things follow that are not decided yet.

---

### 1a. Can a space be the thing you highlight *into*? — settled

**Yes. One space can be active, and highlights go into it until it is not.**

Researching a topic means marking twenty passages across five pages, and
filing each one by hand is twenty interruptions in the middle of reading.
Setting the topic once is one.

One active space at a time; none active is normal and behaves as today. The
work is a stored id, a control in the panel, and one line where a highlight is
saved.

---

### 1e. Spaces are reordered by hand, and carry their own details

Settled along with the definition, and recorded here because it is work rather
than a question: a space has a position in your list that you set yourself,
the way highlights already do (`order.ts`), and it carries a created date, its
own note, its own labels, and whether it is active.

Nothing in `src/core/spaces.ts` holds a position, a note, labels or an active
flag yet. `createdAt` is already there.

---

### 1b. What happens to a space when the research is finished? — settled

**A hard five on Free. Archiving is a Team feature.**

Against my recommendation, and the reasoning is the author's: archiving would
turn the cap into a formality, and a free tier that gives way at every limit
leaves nobody a reason to pay. Running out of spaces is supposed to be felt.

Nothing is deleted or hidden when the cap is reached; a sixth space simply
cannot be made. Delete one, or pay.

---

### 1c. Tags and spaces — settled, and the question was wrong

**They are independent features and do not compete.** The premise that one of
them was redundant was mine and it was wrong.

A tag is a property of a highlight, like its colour. A space points at
highlights gathered from many pages, and those highlights carry whatever tags
they carry. A space can hold highlights with a dozen different tags; a tag can
appear in a dozen spaces and in none. Neither implies the other.

So no line has to be drawn between them, and the earlier formula — *a space is
a tag that produces a document* — is struck out. It made a space sound like a
heavier tag, which is not what it is.

---

### 1d. What does an unfinished space look like? — settled

**Nothing in a space is required, and nothing empty is drawn.**

This follows from what a solo space is for: searching different things, putting
them in, and worrying about it later. A space holding a question and twelve
highlights, with no findings and no decision, is finished. A *Findings*,
*Open questions* or *Decision* section appears the first time it holds
something and not before.

---

### 1f. Polling — settled

**Kept.** The author's reason is the one that answers my objection: a poll is
the quick way to ask *does everyone agree* without ten replies saying yes. It
is a question, not a mechanism for removing things.

So it stays, with one rule that keeps it from growing into what I was worried
about: **a poll records agreement and never acts on its own.** No quorum, no
tie-break, no rule about who may vote, no expiry — none of which is needed once
nothing happens automatically. The tally is information; a person still
decides.

It can go on a finding, a decision, or a highlight somebody has questioned.

---

### 1g. Note: everything in 1f and the thread states is Team tier

Team is frozen, so this is designed now and built later. It is written down
while the thinking is fresh, not queued for building.

---

### 2. What does the in-page panel look like?

`src/ui/App.tsx`, 766 lines, is the smallest and least considered of the four
list screens — and it is where a user actually spends their time. It is the
face of the product and currently the thinnest part of it.

Worth settling: does the panel show *this page's* highlights only, or is it a
way into the whole library? How is it opened and closed? Does it push the page
over or float above it? What does it look like with nothing in it yet?

*Recommendation:* this page only, floating, with one line out to the library.
The panel's job is the current page; the library is a different job and already
has a screen.

**Decided:** _______

---

### 3. One list of highlights, used in four places

Four screens draw a list of highlights — the panel, the library, Spaces, and
the phone app — in 4,449 lines with essentially no shared code. That is why
they do not look like one product.

The pattern already works: `app/src/App.tsx` serves both the phone and the
desktop from one component, with the difference passed in as a prop. The
decision is what the shared piece is: just the row? the row plus search and
filters? the whole screen with slots?

*Recommendation:* the row and the filter bar, not the whole screen. Each place
keeps its own frame and header; everything inside it is shared.

**Decided:** _______

---

### 4. What does someone see the first time?

There is a welcome page, but no decision about the first five minutes. Someone
installs the extension and then what — do they get told to highlight something,
or shown a library that is empty?

*Recommendation:* one page that makes them highlight something immediately, on
a page we supply, so the first highlight happens before any explaining.

**Decided:** _______

---

### 5. What is an account?

Nothing beyond here can be built without this. Even the free cap needs it: to
know somebody may not have a sixth space, Kona has to know who they are.

- **(a) Email and a magic link.** No passwords to store or leak.
- **(b) Email and password.**
- **(c) Sign in with Google/Apple.**
- **(d) No account: a licence key** typed into the extension.

*Recommendation:* (a), with (c) added later if people ask. No password to
store is a real reduction in what can go wrong, and it fits a product whose
pitch is that it holds your data carefully. (d) avoids a server for the cap but
cannot do sync, so it only defers the problem.

**Decided:** _______

---

### 6. What syncs, where does it live, and what does privacy mean then?

The substance of Pro, and the biggest build.

Open inside it: does the server hold the highlight text, or only encrypted
blobs it cannot read? What happens when the same highlight is edited on two
devices? What is kept when someone stops paying?

*Recommendation:* the server stores blobs it cannot read, encrypted with a key
derived on the device. It costs more work and it is the only version that lets
the sentence stay close to what it is now. Decide this before writing any
server code — it cannot be retrofitted.

The claim has to change either way, from *nothing leaves your computer* to
something like *nothing leaves your computer unless you turn sync on, and what
does, we cannot read.* Write that sentence as part of this decision.

**Decided:** _______

---

### 7. What happens at the edges of the cap?

Small, but it will be discovered at the worst moment if nobody decides it.
Someone has seven spaces and their subscription lapses. Someone on free tries
to make a sixth.

*Recommendation:* never delete and never hide. Over the cap, everything stays
readable and no new ones can be made until they are under it again. Anything
else means a person losing work because a card expired.

**Decided:** _______

---

### 8. The actual prices, and the monthly/annual toggle

Needs 5 and 6 settled, because the cost of running sync sets the floor. The
toggle is the ChatGPT-style switch on the pricing section. `plans.ts` is the
copy of record and `tests/pricing.test.ts` fails if the site drifts from it.

**Decided:** _______

---

### 9. What is different on iPhone and iPad?

The Safari extension is the same code, but the surface is not: no right-click,
a much smaller panel, and a share sheet that the desktop does not have.

**Decided:** _______

---

### 1h. Firefox on Android is an open door

Chrome on Android has no extensions and never has, which is why the phone app
exists. **Firefox on Android does** — over six thousand of them as of April
2026 — and Kona already builds for Firefox, with a gecko id and a minimum
version set in `wxt.config.ts`.

So there may be a way to highlight on an Android phone after all, for anyone
willing to read in Firefox. Whether that is worth the testing, and whether
Android users will change browser for it, is not obvious and is not decided.

*Recommendation:* try the existing Firefox build on an Android phone before
deciding anything. It may already work, in which case the question is only
whether to say so out loud.

**Decided:** _______

---

## Where the code is behind the definitions

`DEFINITIONS.md` describes Kona finished. This is the distance between that and
what is written, kept here so the definitions do not have to carry it.

| Defined | What exists |
| --- | --- |
| **Active space** | Nothing. No active id, no control, no hook in the save path. |
| **Thread states** | Settled and not-settled. *Asking* does not exist, and it is the one that does the work. |
| **Raising a question (ping)** | Nothing. Comments exist, but none can be marked a question. |
| **Poll** | Nothing. |
| **Seen / unseen** | Nothing, and when it is built it must stay off the shared space. |
| **Telling everyone** | A space travels by shared folder or handed-over file, so a ping lands when the other copy next syncs. Real push needs the server. |
| **Space has a note, labels, a position** | Only `createdAt`. Reordering by hand exists for highlights (`order.ts`) and not for spaces. |
| **Attention list** | Nothing. `openQuestions` exists as a plain list and is not joined to anything. |
| **Page** | Correct as of today: tracking parameters are stripped and old highlights migrate. |
| **Highlight survives an edited page** | Correct as of today. |

**Naming:** the code calls a page a `conversationId`, on ordinary web pages as
well as AI chats, because the chat sites came first. The word is wrong for most
of what Kona now covers, and renaming is cheapest before more is built on it.

## Loose ends

**`SHIPPED_AHEAD` in `src/core/plans.ts`** promises, in the extension's Plans
page and on the landing page, that sync and spaces will not be switched off
later. The tier decision contradicts it. Nobody but the author uses Kona, so
nobody is relying on that promise and it is not urgent: fold it into decision 8
when the tier copy is rewritten, rather than treating it as its own job.
