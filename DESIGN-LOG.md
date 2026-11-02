# Design log

How this works: **one decision at a time, written down before any code.**

Kona has been built by trying something, looking at it, and changing it. That
got a lot made, and it is also why the same screen exists four times and why
the pricing was written in four places that disagreed. The cure is not more
care while coding. It is deciding first, in writing, so that a thing is built
once and nobody has to guess later why it is the way it is.

A decision is finished when it has an answer here, in a sentence anyone could
act on. Until then it is open and nothing gets built on top of it.

Read `DIRECTION.md` first; it holds the reasoning behind what is already
settled. This file is the queue.

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
| Desktop app | Frozen. Its only job was the folder-picker gap, which hosted sync closes |
| Team | Frozen. Good demo, no users, needs the same server Pro needs |

## Open, in order

The order is deliberate: **what the product is, before the machinery that
carries it.** Sync is weeks of work, and you cannot sensibly build the thing
that syncs spaces until you have decided what a space is. The first four are
cheap, need no server, and make what already exists better.

---

### 1. What is a space, for one person?

A space holds a name, a question, its highlights, findings, open questions and
a decision — and then people, who gathered which highlight, comment threads,
and which threads are finished. **The last four mean nothing until somebody
else is in the space**, and the screen shows them to everybody regardless.

The weight is not in the fields. `spaces.ts` is 462 lines; the collaboration
around it — `spaceShare.ts` (604), `spaceSign.ts` (172), `people.ts` (113) —
is 889, and the screen is 1,487.

- **(a) Show the collaborative parts only once a space has actually been
  shared.** Alone, a space is: question, highlights, findings, write-up.
  People, credits and threads appear when there is somebody else in it.
  Nothing is deleted.
- **(b) Also cut findings, open questions and decisions**, leaving question,
  highlights and write-up.
- **(c) Keep as it is.**

*Recommendation:* (a). This file first said (b), written before reading the
type properly. That was wrong: findings are what the write-up is built from —
each claim carries the passages it rests on — so cutting them leaves the memo
as a list of quotes, which is the weakest version of the best feature. The
clutter is not the fields. It is showing one person the machinery of a team.

**Decided:** _______

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

## Loose ends

**`SHIPPED_AHEAD` in `src/core/plans.ts`** promises, in the extension's Plans
page and on the landing page, that sync and spaces will not be switched off
later. The tier decision contradicts it. Nobody but the author uses Kona, so
nobody is relying on that promise and it is not urgent: fold it into decision 8
when the tier copy is rewritten, rather than treating it as its own job.
