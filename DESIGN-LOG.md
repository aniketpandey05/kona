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
| The popup | One line: this site, and whether Kona may read it. Nothing built in, and no list of allowed sites — the browser owns that |
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

**3c. The extension is a highlighting tool, and nothing else. — settled**

The duplication, measured. The extension does not only capture: it has a
**library page** (1,025 lines) and a **spaces page** (1,487) that open as
browser tabs. The app has a library and spaces too (1,171). Two builds of one
screen for one person — and the two stores already agree on an interface
without anyone naming it:

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

My first answer was to name that interface and mount one screen in both
places. **The better answer is not to have the screen in the extension at
all.** The extension is the tool you highlight with. Everything you do
*afterwards* — reading back, searching, spaces, write-ups — is the web app.

What makes it free rather than a trade: **the extension's library page is
already just a browser tab**, at a `chrome-extension://` address. The web app
is a browser tab at an ordinary address. To the person using it there is no
difference at all — same gesture, same place, same feel — so moving it costs
nothing anybody can perceive and removes an entire second implementation.

| | |
| --- | --- |
| Leaves the extension | the library page, the spaces page, the plans page, and their stylesheets — **4,647 lines** |
| Stays | the panel, the content script, the popup — **2,694 lines** |

**The one thing this needs building.** A free user has no sync, so the web app
must be able to read the extension's storage on the same machine. The portable
way is a content script the extension injects into Kona's own domain, bridging
the page to extension storage by `postMessage`. (`externally_connectable` is
the tidier Chrome mechanism, but Firefox has never implemented it, and Kona
ships on Firefox and Safari.) This is a known technique rather than something
tried here, and it is real work — it is the price of the split, and it is
cheaper than a second library.

So: **the extension highlights. The web app is where your highlights live.**
The bridge is agreed as worth building.

---

**3d. How does a team work? — settled**

**A shared space has to be openable by someone who has installed nothing.**
That is the whole constraint. If showing research to five colleagues means
five extension installs, the sharing does not happen — and sharing is the
entire value of Team. A manager who reads the write-up and votes needs a
link, not an install.

So: **shared spaces live on the web.** Not in the extension.

This is not a new direction. `team/` is already a web app with routes for
spaces, members and admin — it was built that way without the reason being
written down. The shape is already right; it just was not recognised, which
is why it was built in isolation:

| | |
| --- | --- |
| `team/src` | **3,798 lines sharing nothing with `src/` or `app/`** |
| Its own `memo.ts` | 134 lines, beside `src/core/memo.ts` at 164 |
| Its own `types.ts` | 122 lines, beside `src/core/types.ts` at 42 |
| Its own `store.ts` | 291 lines, beside `src/core/store.ts` at 324 |

Counting every file that draws a list of highlights — the panel, the
extension's library, the extension's spaces, the phone app, and the Team
app's two — comes to **5,105 lines doing one job six times.**

**Where each thing happens:**

| | Extension | Web app |
| --- | --- | --- |
| Highlighting | ✓ only here | — |
| Your library | ✓ | ✓ |
| Your own spaces | ✓ | ✓ |
| Filing into a shared space | ✓ | ✓ |
| Seeing what a shared space holds | ✓ passages, while reading | ✓ |
| Discussion, pings, polls, the attention list | — | ✓ |
| The write-up, members, billing | — | ✓ |

**And the simplification that falls out: there is one web app, not two.**
`app/` and `team/` are the same thing at different subscriptions. Signed out
it is your library, installable on a phone — which is what `app/` is. On Team
it also holds the shared spaces — which is what `team/` is. Keeping them
apart is what produced a third `memo.ts`.

So Kona is **two surfaces**: the extension, and one web app. The desktop app
is frozen, and the Team demo folds into the web app rather than standing
beside it.

Settled with 3c: once the library is a web app, two web apps is plainly one
too many.

---

**3e. What is the popup for, once the library has gone? — settled**

Most of what the popup offered was a way into pages that no longer exist in
the extension. But it cannot be deleted, because it holds something that
cannot move: **`browser.permissions.request` must be called from an extension
page, on a user gesture.** A content script cannot ask, and on a site Kona is
not yet allowed on there is no content script at all — so the toolbar button
has to open *something*.

So it stays, and it shrinks to one line: **this site, and whether Kona may
read it.** Two rulings decide the rest.

**Nothing is built in. Kona asks on every site.**

Four origins are written into the manifest today and granted at install —
`chatgpt.com`, `chat.openai.com`, `claude.ai`, `gemini.google.com` — and three
of them are drawn in the popup as a permanent "Built in" section. That goes.

AI chats are the thing nothing else does, so the instinct to preload them is
understandable. It is still wrong:

- It is a treadmill. Every new chat product is a release of Kona, and until
  that release ships Kona is simply wrong about where you read.
- It is wrong by default for everybody who does not use those three.
- It claims access to four sites before you have highlighted anything.

The last one is the real cost, and it is paid at the worst possible moment.
Installing Kona today raises the browser's own warning: *read and change your
data on chatgpt.com, chat.openai.com, claude.ai and gemini.google.com.* That
is the first sentence Kona says about itself, and it is a demand. With
`host_permissions` empty there is no warning at all — Kona installs asking for
nothing, and asks for a site while you are standing on a page you want to keep
something from. A better install, and a far easier store review.

What is given up: ChatGPT no longer works the second Kona is installed. It
costs one grant, in the one place where granting makes sense.

**The allowed sites are not listed in the popup.**

"Sites you've added" is fine at three and unreadable at twenty, and twenty is
the success case. A list that gets worse the more you use the product is the
wrong list.

It does not need to move somewhere else either, because the browser already
draws it: Kona's entry on the browser's extensions screen lists every origin
granted and takes them back. That screen is *authoritative* in a way Kona's
copy can never be.

Which exposes a real bug in keeping a copy. `local:disabled-sites` is a second
list, and the two can already disagree — revoke a site from the browser's
screen and Kona's stored list never hears, so the popup goes on offering a
switch for a site it can no longer touch. With nothing built in, "allowed" and
"on" collapse into one fact, and the second list has no reason to exist. One
list, owned by the browser, that cannot go stale.

And the list somebody actually wants is a different list. "Which sites am I
highlighting on" is answered by the pages you have kept something from, which
is the library — on the web, by 3c. Permissions are plumbing. The library is
the product.

What is given up: the soft switch, turning Kona quiet on a site without
handing the permission back. A small loss. Kona at rest is already one faded
mark in a corner (2d), and allowing a site again is one click.

**Decided:** nothing built in, ask per site, no list of sites. The popup is
this site and a way to the library.

One consequence to carry into decision 4: with no site granted at install, the
first run cannot assume Kona may run anywhere. It does not need to — a welcome
page served by the extension is the extension's *own* page, so the entire
round trip can be taught there before a single permission is asked for. The
first grant then lands where it belongs, at the moment you leave for a real
page.

One thing to check when this gets built, not now: whether an extension may
deep-link to its own entry on the browser's extensions screen. Chrome has
restricted navigation to `chrome://` pages before. If it cannot, the popup says
where to go in words.

---

**3f. What is the thing the extension opens, and what is it called?**

The popup's button says "Open" today, under the hint *your highlights and your
spaces, in a tab*. The panel's says "Library". Two names for one place, and the
hint exists because neither name covers what is actually there.

The reason is in the definitions. **The library and spaces are siblings, not
nested** — a library is organised by where you read, a space by what you want
to find out. So "Library" cannot name a destination holding both, and "my
highlights" cannot either: it leaves out the half of the product that the free
cap and the whole Team tier sit on.

- **(a) Name the product.** The button reads **Open Kona**, in the popup and in
  the panel both. Inside are two sections, *Library* and *Spaces* — the two
  words the definitions already define precisely.
- **(b) Name the main thing.** The button reads **My highlights** and opens the
  library; spaces are one click away in the nav. This is how most products do
  it: the button names the primary thing rather than taking an inventory.
- **(c) Name the contrast.** The button reads **Everything**, against a panel
  that is only ever about here.

*Recommendation:* (a). It invents no new vocabulary, it cannot go wrong as the
product grows, and it answers the question people actually ask — *where are my
highlights?* *In Kona.* (b) is a close second and its flaw is real: it hides
spaces behind a word that excludes them, which is backwards for the thing we
charge for. (c) is accurate and too vague to be a place anyone can name out
loud.

**And what does it open to?** The rule falls out of 2f, which is settled: the
panel already shows this page and the active space, so **the link leads where
the panel cannot** — the library, everything, newest first. One exception: if
somebody arrived by clicking a single highlight, it opens on that highlight.

**Decided:** _______

---

### 4. What does someone see the first time?

Harder than it looks, because **Kona's value is a delayed one.** Highlighting
something feels like nothing. The payoff is the return trip — coming back
later and landing on the exact words — and a first run that only shows the
first half has shown the boring half.

It now spans two surfaces as well: install the extension, highlight, and end
up at a web app that is where everything lives.

- **(a) A page that explains** what Kona does, with a button to get started.
- **(b) A page you highlight on**, which then walks you through the return
  trip: mark a sentence, leave, come back, click it, land on it.
- **(c) No page.** The panel introduces itself the first time you are on a
  real page.

*Recommendation:* (b), and the round trip is the whole point of it. Every
highlighting tool can mark text; the thing worth showing in the first minute
is the part nobody else does, which is arriving back on the sentence. A tour
that stops at "you highlighted something" has demonstrated a yellow
background.

Two things to decide inside it:

**Does the first run mention AI chats?** It is the thing nothing else does,
and it is also a lot to ask in the first minute. *Recommendation:* name it on
the welcome page, do not make it a step.

3e makes the welcome page the **only** chance to name it. With no site granted
at install and no `tabs` permission, Kona cannot tell that you have opened
ChatGPT at all — a browser does not hand an extension a tab's URL without
permission for that tab, and asking for every tab's URL buys back the install
warning 3e just removed. There is no later moment when the panel can appear on
a chat and introduce itself. The welcome page says it, or nobody finds it.

**When does it hand over to the web app?** *Recommendation:* after the first
highlight, not before. "That is kept. It lives here" with the link, once there
is something to look at. Sending somebody to an empty library first is the
version where nobody comes back.

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

### 8. The actual prices, and the monthly/annual toggle — deferred on purpose

Not blocked, held back. The numbers get set once the product is built or close
to it, because pricing something that does not exist yet is guessing, and the
floor is whatever running sync costs, which is 5 and 6.

The toggle is the ChatGPT-style switch on the pricing section. `plans.ts` is the
copy of record and `tests/pricing.test.ts` fails if the site drifts from it.

**Decided:** the shape — three tiers, a monthly/annual switch. The numbers wait
until the product is finished or nearly.

---

### 9a. What language is Kona written in, and where does Swift start?

9 cannot be answered before this one.

**The extension has no choice.** A browser extension is JavaScript — there is
no second option, in any browser. So the extension is TypeScript, and the only
live question is the app.

Which makes the question sharper than it first looks. If the app is Swift then
Kona is two languages, and the library — a list, a search box, a detail view —
gets built twice, forever. That is already the most expensive mistake in this
repository: six files and 5,105 lines currently draw a list of highlights. A
Swift one would be the seventh.

- **(a) One codebase.** TypeScript everywhere. On iOS the App Store container
  carries the Safari extension and little else, and the library is the web app,
  added to the home screen.
- **(b) One codebase, and the container shows it.** As (a), but the container
  opens the web app, so the thing installed from the App Store *is* the
  library. **Capacitor** is this, productised: the same web build wrapped as a
  real iOS and Android app, with native storage, the share sheet and push
  available as plugins, and not one screen rewritten.
- **(c) A native library on iOS.** SwiftUI, feels right on the platform, and
  every feature after it is built twice.
- **(d) React Native.** One language, a real app on both phones, sharing the
  core with the web.

*Recommendation:* **(b).** It is (a) plus a reason for the container to exist.
Apple requires a Safari extension to ship inside an app, so the container is
not optional — and a container that only tells you to go and switch it on in
Settings is a thinner thing to hand to review than a container that opens your
library.

**Why not React Native.** It is the right instinct and the wrong shape, and the
reason is worth stating exactly, because *one language* sounds like it answers
the objection above when it does not.

**React Native shares a language, not screens.** Its primitives are not the
web's — a `View` is not a `div` — so every screen in the library gets written a
second time. That is the same cost as Swift, paid in a friendlier language. The
argument here was never *one language*. It was *do not build the library
twice*.

And it cannot reach the part that matters most in any case. **The panel has to
be DOM**, because it is injected into somebody else's page and paints with the
browser's own highlight API. The extension can never be React Native. So RN
does not leave us with one way of building UI; it leaves us with two, plus a
build chain per store, plus store review on every release of a product whose
web half deploys in a minute. It would also mean React beside Preact, or
React inside the content script, which is weight paid on every page a person
reads.

The honest case *for* it is Android. Chrome on Android has no extensions at
all, so there the app is the only Kona there can be, and RN would serve both
phones from one place. That is a real argument, and it belongs to 1h rather
than here. Today's answer to 1h is that Android is a place you read — and a web
app serves that well, because Chrome on Android is a much better host for one
than iOS Safari is.

**When to reopen this:** if the app stops being a viewer and becomes where
people capture and read; if Android turns into a real share of use; or if
Safari's eviction proves fatal before sync lands. Capacitor answers all three
more cheaply, and it is reversible — it ships the web build that already
exists, so nothing is written twice until something has to be.

**Where Swift is allowed:** the container, and the share extension that makes
*share a link to Kona* work, which is in the definition of the app and cannot
be done from a web page. Nowhere else. Every screen a person reads is
TypeScript.

**Two risks to carry rather than wave away:**

Safari drops script-written site data after about a week without interaction.
Home-screen web apps are treated better than ordinary tabs, but a library is a
thin thing to stand on that ledge. It stops mattering once sync exists, because
then the server holds the real copy and the local one is a cache — so this
leans on 6, and shipping iOS before sync would mean standing on the ledge on
purpose.

A web view of a remote site can attract Apple's minimum-functionality rule. The
extension shipping in the same container is the answer to that, and it is worth
checking against current review practice before building — not now.

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
