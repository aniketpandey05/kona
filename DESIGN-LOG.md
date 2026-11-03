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

### 2. What is the in-page panel? — settled

`src/ui/App.tsx`, 766 lines, is the smallest and least considered of the four
screens that list highlights — and it is the one a person is actually looking
at while they use Kona. It is the face of the product.

**All of 2a to 2g are settled**, each as recommended below. They were drawn as
a mockup of five states and looked at before being agreed; 2g was the one
raised against it and is answered.

**2a. What does it show?** This page's highlights, or a way into the library?

*Recommendation:* this page only. The library is a different job and has its
own screen. One exception, and it is new: **the active space belongs here**,
because it changes what happens when you highlight, and the panel is the only
place you are looking when you do.

**2b. How is it opened?** Always there, a toggle, or appearing when needed?

*Recommendation:* three states, not two. Out of the way by default; a small
mark showing this page has highlights on it; open when asked. Most of the time
somebody is reading, not managing a library, and a panel that is always open
is a panel that gets turned off for good.

**2c. Does it float over the page or push it aside?**

*Recommendation:* float. Pushing re-flows somebody else's layout and can break
it, and Kona is a guest on every page it appears on.

**2d. What does it look like on a page with no highlights?**

*Recommendation:* almost nothing — the small mark and no more. An empty panel
on every page in the world is the fastest way to be uninstalled.

**2e. How does it stop an active space misfiling things?**

The risk that comes with active spaces: you set one on Monday, forget, and
spend Thursday quietly filing amoeba research into it. The cost is paid later,
when the space is full of things that do not belong and have to be found and
moved by hand.

*Recommendation:* the panel always says where highlights are going, in words,
whenever a space is active — and the new highlight it confirms says it too.
This is what the panel is *for* as much as the list is. A quiet mode that
silently changes where your work goes is a bad trade for a saved click.

**2f. Does the panel show the space as well as the page?**

There is a real need. Researching one topic across six articles means that on
the sixth you want to know what you already have — whether this point is
already gathered, what the space is missing. Leaving the page to check breaks
the reading, which is the thing Kona is supposed to protect.

There is also a real danger, and it is the one this whole document exists to
avoid: the panel becomes a fifth screen listing highlights, and then there are
five of them to keep looking alike instead of four.

- **(a) The passages in the active space, and nothing else.** A second view in
  the panel — *This page* and *Amoebas (12)* — appearing only when a space is
  active. Each row is a passage, clickable through to where it came from. No
  findings, no write-up, no threads, no editing the space.
- **(b) The whole space**, as the full screen shows it.
- **(c) Nothing.** The panel is this page, full stop; the space has a screen.

*Recommendation:* (a), with the line drawn hard: **the panel shows passages
and never a space's machinery.** Findings, the write-up and discussion are
work you sit down to do, and they belong on the screen you sit down at. What
belongs in the panel is what you need without stopping reading, which is the
list of what you have already got.

Two things keep it from growing. It is the same row component as everywhere
else (decision 3), so it is a mount and not a new screen. And it does not
exist at all unless a space is active — with none set, the panel is this page
and nothing more, which is also what 2b and 2d ask for.

Picking which space is active is a small control in the panel, not a list of
spaces. A picker, not a fifth screen.

**2g. How do you highlight something that does not belong in the active space?**

The hole in 2a. You are researching amoebas, and you pass a sentence worth
keeping that has nothing to do with amoebas. As drawn, the active space takes
it anyway.

- **(a) A second gesture** — a modifier key, or a separate button, that keeps
  a highlight out of the space.
- **(b) It goes in, and you take it out later** from the space.
- **(c) The confirmation is the way out.** Highlighting shows where it went,
  and that same thing has one control on it to keep it in the library only.

*Recommendation:* (c), and (a) is ruled out rather than merely beaten.
**Kona runs on Safari on an iPhone, where there is no right-click and no
modifier key.** Any design resting on a second gesture is a design that works
on a laptop and not on a phone, and the phone is where half the reading is.

(b) is the thing active spaces were invented to avoid: it moves the filing to
later and makes it cleanup rather than a choice.

(c) costs nothing in the normal case and one tap in the exception, taken
immediately, while you are still looking at the sentence and still know
whether it belongs. It also earns the confirmation its place: **the thing that
tells you where a highlight went is the same thing that changes where it
went.** One element doing the safety job from 2e and the escape hatch at once,
rather than two.

### 3. Why the screens do not look like one product

Not a matter of taste, and now measured. Eight stylesheets, 5,990 lines, and
**220 custom properties declared independently** — every screen writes its own
`--bg`, `--fg`, `--accent` from scratch. They disagree:

| Token | Values in use |
| --- | --- |
| `--accent` | `#c2410c`, `#ea580c`, `#fb923c` |
| `--bg` (dark) | `#17181a`, `#191a1c` |
| `--card` (dark) | `#222427`, `#26272b` |
| `--muted` (dark) | `#a3a6af`, `#a8a8b3` |
| `--border` (dark) | `rgba(255,255,255,0.11)`, `rgba(255,255,255,0.12)` |

**Kona's own colour is three different oranges depending on which screen you
are looking at.** Nobody decided that; it is what happens when eight files
each answer the same question alone.

**3a. One set of tokens, imported everywhere.** One file holding the colours,
spacing, radii and type scale; every screen imports it and declares none of
its own.

*Recommendation:* do this first, and on its own. It is a few hours, it touches
no component, and it fixes most of what makes the screens look unrelated. It
also has to come first for a reason beyond cost: a shared component is
pointless while the colours under it still differ per screen.

**3b. One piece of shared markup for a passage.**

The five places a passage is drawn: the panel on this page, the panel showing
a space, the library, the spaces screen, the phone app. They differ in density
and in which extras they carry — a source line, tags, who gathered it.

- **(a) One row component** with a density prop and flags for the extras.
- **(b) A small core** — the colour mark, the passage, the note — with each
  screen composing its own surroundings.
- **(c) Tokens only**, markup stays separate.

*Recommendation:* (b). (a) ends as a component with ten props, which is harder
to follow than the five copies it replaced. The part that must never differ is
the passage itself, because that is what a person recognises from screen to
screen; the frame around it genuinely is different work in each place, and
pretending otherwise is how the ten props arrive.

**3c. The extension and the app have built the same library twice.**

This is the extension-versus-app question in the concrete, and it is further
along than the rule in `DEFINITIONS.md` suggests. The extension does not only
capture: it has a **full library page** (1,025 lines) and a **full spaces
page** (1,487) that open as browser tabs. The app has a library and spaces too
(1,171). Two builds of one screen, for one person.

And they already agree on how to store things, by accident:

| Job | Extension `src/core/store.ts` | App `app/src/storage.ts` |
| --- | --- | --- |
| Every highlight | `loadAllMarks()` | `loadAll()` |
| Save one | `upsertMark(m)` | `save(m)` |
| Delete one | `removeMark(site, page, id)` | `remove(id)` |
| Import | `importMarks(xs)` | `importMarks(xs)` |
| Spaces | `loadSpaces` `saveSpace` `removeSpace` | the same three names |
| Watch | `watchAllMarks(fn)` | `watch(fn)` |
| Sync | `syncStore` | `syncStore` |
| Who you are | `loadMe` `saveMe` `ensureSigningKey` … | the same names again |

**The same interface was written twice because nobody gave it a name.** That
exact mistake has already been found and fixed once here: the phone and the
desktop app run one component because `FolderSource` named the seam between
them and the difference became an argument. Nothing stops the same move again.

Three things to settle.

**Where does the library live on a desktop?** The extension page or the app.
*Recommendation:* the extension page. The desktop app is frozen, and opening a
separate program to read what you marked in a browser is worse than opening a
tab, which costs nothing and is already built.

**One library screen or two?** *Recommendation:* one, mounted in the extension
page and as the app, with a named interface between it and storage, the way
`FolderSource` works. It is the largest piece of duplication in the repository
and the reason the two never look alike.

**What is the app for, then?** *Recommendation:* Android, where Chrome has no
extensions; and any browser where an extension cannot be installed, such as a
locked-down work machine. Not a second way to do what the extension already
does on a computer.

One thing to say out loud, because people will hit it: **on one computer the
extension's library and the app's library are two separate stores** —
`chrome.storage` and IndexedDB — that only meet through sync. Highlight
something in the browser and it is not in the app until a sync runs. That is
defensible, but it has to be said rather than discovered.

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

### 1h. Is Android a place you highlight, or only a place you read?

The technical part is answered and is not the question. Chrome on Android has
no extensions and never has. **Firefox on Android does** — over six thousand
as of April 2026 — and Kona already builds for Firefox with a gecko id set, so
an Android build is close to free.

The question is what we say Android *is*, which is a product decision:

- **(a) Android reads.** The app is the Android answer. Firefox is not
  mentioned.
- **(b) Android highlights, in Firefox.** Say so plainly, and accept that the
  answer to "can I highlight on my phone" is "change your browser".
- **(c) It works, and it is listed, and nothing is built around it.** Android
  leads with the app; people already in Firefox find that Kona works there.

*Recommendation:* (c). Telling people to change browser is the same large ask
as telling them to change where they read, and Firefox is a small share of
Android. But it costs nothing to let it work, and the people it does reach are
exactly the people who care about this kind of tool.

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
