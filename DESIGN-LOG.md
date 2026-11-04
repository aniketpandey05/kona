# Design log

How this works: **one decision at a time, written down before any code.**

Kona has been built by trying something, looking at it, and changing it. That
got a lot made, and it is also why the same screen exists four times and why
the pricing was written in four places that disagreed. The cure is not more
care while coding. It is deciding first, in writing, so that a thing is built
once and nobody has to guess later why it is the way it is.

A decision is finished when it has an answer here, in a sentence anyone could
act on. Until then it is open and nothing gets built on top of it.

**How duplication is weighed.** Not by the work. Building a thing twice is a
price, and prices are payable — nothing here is decided by what is cheapest to
write, and nothing is rushed to avoid writing it. Duplication counts when two
implementations can *disagree*: when the same highlight could sort differently,
belong to a different space, or resolve on one surface and fail on another.
Duplicated effort is a cost. Duplicated meaning is a defect, and only the
second one decides anything in this document.

**What is already built is not a constraint.** The current app was made on a
whiff, which is why it is being rebuilt from directions rather than patched.
Nothing here is chosen to keep existing code, and nothing is ruled out for
contradicting it — the finished UI is expected to look very different from what
is on GitHub today. Where this document mentions existing files, it is to say
where the distance is, never to argue from it.

Three documents, one job each: `DIRECTION.md` is why, `DEFINITIONS.md` is what
every word means, and this is what is still undecided.

---

## Settled

| Decision | Answer |
| --- | --- |
| What Kona is | You highlight a passage anywhere you read, and can find it again and land on the exact words |
| Tiers | Each rung is a different kind of thing: Free is alone on one device, Pro is alone everywhere in step, Team is with other people |
| Limits | Only on Free, so the rung is felt: 5 spaces, 15 archived at a time. Pro is unlimited. Highlights are unlimited on every tier |
| Why the free cap | A free tier that does everything leaves no reason to upgrade. Drawn now, with no users, rather than clawed back later |
| Where the paid line sits | Free is one surface. Pro is every surface, kept in step |
| Payments | Stripe on the web. Not Apple's in-app purchase: their rate is 30% in year one |
| Privacy | The server stores what it cannot read. Encryption and embeddings both happen on the device, because you only ever search your own library |
| What Kona is written in | TypeScript, every screen. Swift only for the iOS container, the share extension and the native bridge |
| iOS | The Safari extension and the library in one Capacitor container, so one App Store install gives both |
| Open source | Use it where the problem is solved (matching, article extraction, embeddings). Never for what a space is or how the panel feels. Apache-2.0 and MIT only, nothing AGPL |
| What a space is | A workspace for researching one topic across many links. Alone: gather and conclude. With a team: discuss and decide. The collaborative parts appear only once it is shared |
| Extension or app | Neither replaces the other. The extension is the only thing that can highlight, because only it runs inside the page you are reading. The app is where you look at what you gathered |
| The popup | One line: this site, and whether Kona may read it. Nothing built in, and no list of allowed sites — the browser owns that |
| Desktop app | The web app installs as one — own window, own icon, no browser chrome. The Electron app stays frozen: its only job was the folder-picker gap, which hosted sync closes |
| Team | Frozen. Good demo, no users, needs the same server Pro needs |
| Android | Both: highlights in Firefox, and in Chrome by the share sheet. The return trip needs no extension — text fragments are native |
| At the cap | You delete a space or you pay. Kona itself never removes or hides anything, and the cap limits making rather than keeping |

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

**A hard five on Free. Free cannot archive a space.**

Against my recommendation, and the reasoning is the author's: archiving would
turn the cap into a formality, and a free tier that gives way at every limit
leaves nobody a reason to pay. Running out of spaces is supposed to be felt.

*Amended by 11a.* This said "archiving is a Team feature", which went further
than the reasoning above supports — the reasoning is about Free, and Pro has no
cap for archiving to defeat. Pro can archive a space. Nothing else here
changes.

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

*Read 3a and 3b as rules for building, not as repairs.* They were written to
undo duplication in the current code, and the preamble now says that code is a
sketch rather than a constraint — the UI is expected to end up very different.
The measurements below are still the reason the rules exist: they are what
happens without them, found once already. 3c to 3f stand on their own.

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
tried here, and it is real work — it is the price of the split, and what it
buys is one library instead of two that can come to disagree.

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

**3f. What is the thing the extension opens, and what is it called? — settled**

**It says Library**, and the library holds your highlights and your spaces
both.

That requires one change, and making it is the whole point of writing this
down. `DEFINITIONS.md` had the library as *every highlight you have* and drew
its distinction from a space as a rivalry — siblings, one organised by where
you read and one by what you want to find out. If the button says Library and
opens both, that definition makes the word mean two things at once, which is
the drift this document exists to stop.

So **the library widens**: it is everything you have kept, and it holds two
views of it.

| | |
| --- | --- |
| **Highlights** | Everything you kept, organised by *where you read* |
| **Spaces** | The same highlights gathered by *what you want to find out* |

The distinction that 1c drew is intact and is where it belongs — it is between
the two **views**, not between the library and something outside it. "Library"
is the place; those are the two ways in.

**And what does it open to?** The rule from 2f still holds: the panel already
shows this page and the active space, so **the link leads where the panel
cannot** — the Highlights view, everything, newest first. One exception: arrive
by clicking a single highlight and it opens on that highlight.

**Decided:** the button says Library, in the popup and the panel, and the
library is the place that holds both views.

---

### 4. What does someone see the first time? — settled

**One place that changes role.** It opens **exactly once**, when you install —
the way a phone walks you through setup the first time you switch it on — and
after that it is the **About** section, which is where it lives permanently.

| | |
| --- | --- |
| **Welcome**, once | Greets you. What Kona can do, and what the tiers are. |
| **About**, forever after | Releases, what is coming, FAQ, and the tutorials — Teams and the rest. |

Not two pages, and not the same page twice. The welcome framing is spent after
it is used; the reference framing takes over and is the thing people come back
to.

**The part of this worth noticing.** Most products build onboarding, show it
once and throw it away, then build a help page separately and let the two
drift. Here the welcome *becomes* the help, so there is no moment where
somebody was taught one thing and the help page says another.

**When does it flip?** On reaching the end, not on being opened. The phone
analogy is the right one: setup that is abandoned halfway resumes, and only a
setup that finished stops coming back. Close the tab early and it returns; get
to the end and it never opens by itself again.

**No buy button on Welcome.** The tiers are there to be *seen*, not sold —
somebody who has had Kona for ninety seconds has no basis for the decision, and
Free needs no account (5), so stating the ladder early is reassurance rather
than a pitch. 11 makes it one sentence: one device, every device, other people.

**Still the round trip, inside it.** Kona's value is delayed — marking text
feels like nothing, and the payoff is coming back and landing on the words. So
the highlighting part of Welcome should *be* that loop rather than describe it:
highlight this sentence, leave, come back, tap it, land on it. Every tool can
colour text. A page that stops at "you highlighted something" has demonstrated
a yellow background.

It needs nothing granted to do that: a page served by the extension is the
extension's own page (3e), so the whole loop is teachable before a single
permission is asked for.

**AI chats get named here and nowhere else.** By 3e, with no site granted at
install and no `tabs` permission, Kona cannot tell that you have opened
ChatGPT, so there is no later moment for the panel to introduce itself on a
chat. Welcome says it, or nobody finds it.

#### Where the releases come from

A changelog has to come from somewhere, and the obvious answer would quietly
break a promise made in 6. **Free sends nothing anywhere** — no account, no
server. Fetching news would mean every Free install contacting us, which
reveals that somebody has Kona and when they opened it, for the sake of a list
of features.

*Recommendation: the changelog ships with the release.* An extension updates
anyway, so the notes arrive with the update they describe. No network, nothing
to log, and it is automatically right for the version actually running rather
than for the newest one. "Coming soon" is the only part that wants to be
fresher than that, and it can wait for the next update like everything else.

**The Teams tutorial waits for Team.** Team is frozen (1g), so that section is a
placeholder until it thaws — and About is the right place for it to appear when
it does, which is the point of having a place that people return to.

**Decided:** one place, Welcome once and About thereafter, flipping when it is
finished rather than when it is opened; no buy button; the round trip inside
it; and the releases shipped with the build rather than fetched.

---

### 5. What is an account? — settled

*Recommendation, in one line:* **an account is the thing that makes your
highlights the same on every device you read on, and it is nothing else.**

**A correction first, because it changes the answer.** What stood here said the
free cap needs an account too — that Kona must know who you are to know you may
not have a sixth space. That was written before 10a, which settled the
opposite: Free has no sync, so its counts are local and **per device**. The
five-space cap and the archive cap are both enforced on the machine they
happen on, by code that needs to know nothing at all about you.

So **Free does not need an account.** No sign-up, no email, nothing to get
past. You install the extension, you highlight something, and it is yours. One
is available if you want it — see the decision at the end of this section. That matters
more here than in most products, for the reason decision 4 turns on: Kona's
value is delayed, and the payoff is the return trip. A sign-up form in front of
a product whose first minute feels like nothing is the fastest way never to be
used again.

The account then appears at the exact moment it becomes necessary — when you
want what you kept to be on a second device.

**It is not where your highlights live.** The device is. The account is what
lets them travel. Sign out and everything stays where it was: the library, the
spaces, the marks on the pages. Same stance as 6, where the server holds things
it cannot read. The account is a relay, not an owner.

**How you sign in:**

- **(a) Email and a magic link.** Nothing to store, leak, reset or type twice.
- **(b) Email and password.**
- **(c) Sign in with Google or Apple.**
- **(d) No account, a licence key** typed into the extension.

*Recommendation:* **(a).** No stored password is a real reduction in what can go
wrong, and it suits a product whose whole pitch is that it holds your reading
carefully. It also sidesteps Apple's login rule: an iOS app offering a
third-party sign-in must offer Sign in with Apple beside it, and email is not a
third-party service, so a magic link alone never raises the question. (Worth
confirming against current review practice before building — not now.)

(c) can be added later if the friction turns out to be real; it is a second code
path and there is no evidence yet that one is wanted. (d) cannot do sync, so it
solves nothing that is left. (b) is strictly more to go wrong than (a).

**Signing in happens in the web app, and nowhere else.** The extension never
shows a sign-in form. It is handed a token by the web app over the bridge from
3c, and on iPhone over the native route from 9. One implementation of sign-in,
living in the one place suited to it, which is a full browser tab.

**Signing up brings your library with you.** The part that is always got wrong,
so it is written down: somebody who has highlighted for six months on Free and
then subscribes must find all of it there afterwards. Their local library goes
up. It is never replaced by an empty one, and the first sync is never a
download onto a full device.

**Team adds one field, not a second concept:** which team you are in. Who pays
for a team, and how seats work, is 8.

**Decided: an account is available on Free, and not required.**

The author's call, and the reason given was that somebody upgrading to Pro
should get sync immediately rather than having to be migrated into it. That
risk is real and it is the thing most often got wrong. Two things follow from
looking at it closely, and they point different ways.

**An early account does not make the upgrade safer, because it holds nothing.**
Free does not sync (11), so an account on Free stores no highlights — it is a
name and nothing else. When somebody subscribes, the first sync is a full
upload of a local library either way. What actually protects that moment is the
rule already written below: **the local library goes up, and is never replaced
by an empty one.** That rule is the guarantee being asked for, and it does not
depend on when the account was made.

**But available costs nothing, so it should be available.** Somebody who wants
to be known early can be, and then subscribing is only switching sync on. There
is no reason to refuse that.

**Required would cost a great deal**, which is why it is *available* rather
than *required*:

- It puts a sign-up form in front of a product whose first minute feels like
  nothing. 4 turns on exactly that — the value is delayed, and the payoff is
  the return trip.
- It would break the promise in 6 that an install with no account sends
  nothing anywhere, which is what the changelog decision in 4 is built on. A
  required account means every Free install contacts us.

**What a Free account does: nothing yet.** It is a name claimed and something
to attach a subscription to. A Free account is a Free account — the same five
spaces and fifteen archives, and still no sync.

*And the caps stay per device even so*, which is worth stating because the
opposite is tempting. Now that a Free account exists, the counts could be kept
against it and the two-browsers loophole closed. Do not: it would make signing
up strictly worse than not signing up, which destroys the only reason anybody
would do it early — and that reason, a subscription that just switches sync on,
is why accounts are available on Free at all. It explicitly does **not** get backup — a library
stored on a server for one device is sync with one device, and that is Pro's
rung of the ladder (11). Pretending otherwise would give away the thing being
sold while calling it something else.

**Decided, in full:** an account means sync and nothing else; it is available
on every tier and required on none; Free with no account sends nothing
anywhere; sign-in is a magic link, in the web app only; and a library made
before an account existed goes up intact when one does.

---

### 6. What syncs, where does it live, and what does privacy mean then? — settled

**What syncs — settled.** Every device you are signed in on, kept in step:
highlight on the PC, and it is on the laptop and the phone. Highlights, notes,
tags, spaces and which space is active. Not the marks' paint state or anything
else a device works out for itself.

**What privacy means — recommendation, since this was handed to me.**

**The server stores what it cannot read.** Highlights are encrypted on the
device before they leave it, with a key the server never has.

The reason is specific rather than fashionable. **A highlight library is a
reading history** — what you looked up about an illness, a lawsuit, a debt, an
election. There is hardly a more sensitive category of personal data, and every
other tool in this space holds it in the clear. And note what Free already is:
no account, nothing leaving the device at all. It would be strange for paying
to be the thing that makes you less private.

**The objection, which is real: hybrid search needs to read the text.** Pro's
other selling point is hybrid search, and embeddings are normally computed on
a server that can read what it is embedding. Encrypted storage appears to rule
that out.

It does not, and the reason is particular to Kona: **your library is small.** A
highlight is a passage, a URL, a note and some ids — about a kilobyte (11). Even
fifty thousand of them is fifty megabytes of short texts. Embedding that on the
device is slow once and then incremental, and searching your own library has
never needed a datacentre. So **embeddings are computed on the device and
stored encrypted like everything else**, and the server stays a dumb store with
no index, no embedding job and no GPU bill. The thing that makes E2E
unaffordable for most products — that they must search everybody's data — is
not true here, because you only ever search your own.

**The cost, stated plainly rather than buried.** 5 chose a magic link, so there
is no password to derive a key from. The key therefore lives on your devices,
wrapped, plus **one recovery phrase shown once at sign-up**. Lose every device
and the phrase, and the data is genuinely gone — nobody can recover it, us
included. That is the honest price of the promise, and it must be said in those
words at sign-up rather than in a help page afterwards.

**What the server still knows**, because claiming otherwise would be a lie:
that an account exists, its email address, when it last synced, roughly how
much data it holds and across how many devices. Metadata, not content.

**Deferred, not solved:** a shared space needs its key shared with the people
in it, which is real cryptographic work. Team is frozen (1g), so this is noted
and left. Nothing above depends on it.

#### What touches the network at all

Added after the obvious question: **sync is network requests, so what exactly
is the promise?**

The promise is about **an install with no account**, not about Kona. An account
is available on Free but never required (5), and without one there is no sync
and nothing to send — which is why the changelog ships with the build (4)
rather than being fetched: that promise has to hold for somebody who never
signed up. Pro talks to a server by definition, and what protects Pro is not
silence but that the server cannot read what it holds.

So, exhaustively, the things that leave a device:

| | When | Who it is for |
| --- | --- | --- |
| **Sync** | On change, batched | Pro |
| **Signing in** | Only when you sign in | Anyone who chooses an account |
| **Payment** | Only when subscribing, through Stripe on the web | Pro |
| **The embedding model** | Once, after signing in | Pro |
| Nothing else | — | — |

**Batched, not one request per highlight.** A request each time you mark
something would stream your reading rhythm to the server live — when you read,
for how long, how hard you were concentrating — all of it visible without
decrypting a byte. Batching blunts that, and is cheaper and better for a
phone's battery anyway. Timing is the metadata that is easiest to leak by
accident and hardest to notice.

**The embedding model is a download, which 6 did not account for.** On-device
embeddings need a model, and a model is tens of megabytes — too much to bundle
into an extension that everybody installs, including the people who will never
pay for hybrid search. So it is fetched **once, after signing in**, which is
Pro-only and therefore reveals nothing the account did not already.

**Add IP address to what the server knows.** The list above said email, sync
times and rough volume. Every request also carries an address, and therefore a
rough location. Saying otherwise would make this promise dishonest, and the
honest version is: content is unreadable, the fact and shape of the traffic is
not.

**And one rule that is easy to break by accident: never fetch anything
per-page.** A favicon, a preview image, a title lookup — anything fetched
because of a page you kept tells whoever hosts it that you kept something from
their site, and does it for Free users too. The library shows the domain as
text (as the panel mockups do) and fetches nothing. This is the kind of leak
that arrives in a pull request called "nicer library rows".

**Decided: the server stores what it cannot read.** Encrypted on the device,
embeddings computed on the device, one recovery phrase whose loss is final and
is said so in those words at sign-up. The server holds blobs and metadata —
that an account exists, its email, when it synced, how much and across how many
devices — and never content, plus the IP address every request carries. Sync is
batched rather than one request per highlight, nothing is ever fetched because
of a page you kept, and the embedding model is downloaded once after signing
in. Team's key exchange is left for whenever Team thaws.

---

### 7. What happens at the edges of the cap? — settled

**You delete a space, or you pay.** The author's answer, and it is already
1b's: nothing is taken away, a sixth space simply cannot be made.

Worth separating two things that can sound contradictory. **Kona never deletes
or hides anything by itself** — not at the cap, not on downgrade, not ever.
What the *person* does at the wall is delete something or subscribe. The rule
is about who acts, not about whether deletion happens.

Which fixes downgrading, the case nobody asks about until it happens. Somebody
with forty spaces who stops paying keeps all forty. They are all readable, all
searchable, all still there. What they cannot do is make a forty-first, and
they cannot archive (1b, 11a). The cap governs **making**, never keeping.

Anything else would mean Kona destroying somebody's research because a card
expired, and no reason is good enough for that.

**Decided:** delete or pay, Kona itself never removes anything, and the cap
limits making rather than keeping.

---

### 8. The actual prices, and the monthly/annual toggle — Pro settled

Not blocked, held back. The numbers get set once the product is built or close
to it, because pricing something that does not exist yet is guessing, and the
floor is whatever running sync costs, which is 5 and 6.

The toggle is the ChatGPT-style switch on the pricing section. `plans.ts` is the
copy of record and `tests/pricing.test.ts` fails if the site drifts from it.

**Decided: Pro is $3 a month.** Team waits for the cost of running the setup,
which is the right thing to price it against.

*One consequence of a low number, worth having before the toggle is built.*
Card fees are a percentage **plus a fixed amount** — roughly 2.9% and 30c — and
the fixed part is what hurts at $3. Monthly, that is about **13% of the price
gone to fees**. Annually at $30 it is charged once instead of twelve times and
falls to about **4%**.

So the monthly/annual switch is not decoration at this price; it is most of the
margin. Which also means the annual price should be a real saving rather than a
token one, because every person who takes it is worth meaningfully more.

What makes $3 viable at all is 6: the server holds blobs it cannot read, so
there is no index to maintain, no embedding job and no GPU. A library is about
a kilobyte a highlight (11). The cost per person is storage and bandwidth and
very little else.

---

### 9a. What language is Kona written in, and where does Swift start? — settled

9 cannot be answered before this one.

**The extension has no choice.** A browser extension is JavaScript — there is
no second option, in any browser. So the extension is TypeScript, and the only
live question is the app.

Which leaves the app — and the honest way to decide it is **not** by how much
work each option is. Repeated work is a price, and prices are payable. What is
not payable is two implementations of the same thing quietly **disagreeing**,
and that is a different objection worth separating out before going further.

Two libraries would not merely cost twice. They would **drift** — not the
chrome, which is allowed to differ, but the meaning: what sorting does, what a
space contains, what a tag selects, and most dangerously what counts as a match
when a page has been edited since you highlighted it. A highlight that resolves
on the desktop and fails on the phone is not a cosmetic difference. It is Kona
failing at the only thing it promises.

That is the test every option below has to pass, and it is a narrower test than
"how much work is it". Some duplication is harmless. Duplicated *meaning* is
not.

- **(a) One codebase.** TypeScript everywhere. On iOS the App Store container
  carries the Safari extension and little else, and the library is the web app,
  added to the home screen.
- **(b) One codebase, and the container shows it.** As (a), but the container
  opens the web app, so the thing installed from the App Store *is* the
  library. **Capacitor** is this, productised: the same web build wrapped as a
  real iOS and Android app, with native storage, the share sheet and push
  available as plugins, and not one screen rewritten.
- **(c) A native library on iOS.** SwiftUI, and the best feel available on the
  platform. It implies a Swift core as well, or the TypeScript core run inside
  a JS engine in the app — and the first of those is where a highlight that
  resolves on the desktop and fails on the phone gets built in.
- **(d) React Native.** A real app on both phones, and — unlike Swift — able to
  share the core, because it runs JavaScript.

*Recommendation:* **(b).** It is (a) plus a reason for the container to exist.
Apple requires a Safari extension to ship inside an app, so the container is
not optional — and a container that only tells you to go and switch it on in
Settings is a thinner thing to hand to review than a container that opens your
library.

**Where React Native actually lands.** Judged on drift rather than on effort it
does better than Swift, and that is worth stating plainly: **React Native runs
JavaScript, so it shares the core** — the store, the search, the quote matching
— and the dangerous half of the drift problem does not arise. Only the screens
diverge, and screens are the half that is allowed to.

What still rules it out is narrower, and none of it is about work:

**It never gets to one way of building UI.** The panel has to be DOM; it is
injected into somebody else's page and paints with the browser's own highlight
API, so the extension can never be React Native. RN therefore adds a second UI
paradigm rather than replacing one, and the place a person spends most of their
time stays on the other side of that line.

**Kona's loop ends in a browser.** This is the decisive one. The payoff is
clicking a highlight and landing on the words — in Safari. A native library
exits to the browser on every success it has, which on iOS means an app switch,
a lost position, and the app switcher as the only way back. A library that
already lives in Safari lands you one tab away instead. The more successful the
retrieval, the more a native shell is a thing you pass through.

**A bug in the library would wait in review.** Days, against a minute for the
web half. That is a quality argument rather than a cost one: it decides how
quickly a wrong thing stops being wrong.

**What native would genuinely be better at**, recorded so the choice is made
with open eyes: the feel of long lists, swipe actions and context menus,
haptics, and Dynamic Type honoured throughout — which matters more here than
for most products, because the entire content is passages of text somebody
chose to keep. VoiceOver is better too.

Several of the things usually claimed for native are *not* exclusive to it:
Spotlight indexing of your highlights, widgets, Shortcuts and push all reach a
Capacitor app through native plugins or a shared App Group. So the exclusive
loss is narrower than it first appears — it is feel and typography, not
capability.

**The honest case for RN is Android**, where Chrome has no extensions at all
and the app is the only Kona there can be. That argument belongs to 1h.

**When to reopen this:** if the app stops being a viewer and becomes where
people capture and read; if Android turns into a real share of use; or if the
feel of a web view in a container turns out to be the thing people dislike
about Kona on a phone. The last one is a judgement nobody can make from here —
it needs the Capacitor build in a hand, and it is cheap to find out because
Capacitor ships the web build that already exists.

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

**Decided:** **one TypeScript codebase, every screen.** The app is the web app,
and on a phone Capacitor wraps it, so the thing installed from the App Store
*is* the library. Swift exists in three places and nowhere else: the container,
the share extension, and the native route in 9. Never in a screen.

---

### 9. What is different on iPhone and iPad? — settled

Answered on top of 9a: one TypeScript codebase, and the container opens it.

**The container is not optional.** Apple only allows a Safari extension to be
installed inside an app, so the question is never *whether* to ship a native
app — only what that app does. Making it a Capacitor app rather than a page of
instructions costs little and buys four things:

- **Storage Apple never evicts.** This is the risk named in 9a, and iOS is
  where it bites. Inside the container it stops applying at all.
- **The share sheet.** *Share a link to Kona from anywhere* is in the
  definition of the app, and on iOS it cannot be done from a web page. It needs
  a share extension, which needs a container.
- **One listing, one icon, one install.** The extension and the library arrive
  together instead of separately.
- **No Add-to-Home-Screen ritual.** Worth saying plainly, because this project
  has already been bitten by it: "Add to Home Screen" is not an install. It
  keeps whatever URL is open and never reads the manifest, which is exactly how
  the landing page came to open instead of the app. An App Store install
  removes that whole class of problem rather than working around it.

**The thing that is genuinely harder on iOS, and was nearly missed.**

3c put the library in the web app, and the web app reads the extension's
highlights through a content script running on the page. **That bridge does not
exist inside the container.** The Safari extension runs in Safari; the
container's library runs in its own web view, where no extension is injected.
So the desktop answer does not carry over, and with no second route a free user
would highlight on their phone and have no way to look at what they kept.

- **(i) Open the library in Safari instead.** The bridge works unchanged, and
  the container goes back to being a page of instructions — thin, and thin is
  what review dislikes.
- **(ii) A native route.** A Safari Web Extension can message its container
  app, and the two can share one App Group container. The library in the
  container reads that.
- **(iii) The library on iOS shows only synced highlights**, making it
  Pro-only. Clean to build, and wrong: free would mean an extension whose
  highlights you cannot look at.

*Recommendation:* **(ii)**, and it is affordable for a reason worth naming. The
web app already needs more than one way to read highlights — the content-script
bridge on desktop, the server once somebody is on Pro. That is already an
interface with implementations behind it. iOS adds a third implementation, not
a third library. Draw that interface properly and this is small and contained;
draw it badly and iOS is where it hurts.

**The surface differences, which are smaller than the above.** No right-click,
so everything the panel offers has to survive touch alone — already true of 2g,
which chose a tap over a modifier key for exactly this reason. A much smaller
panel. And a share sheet the desktop has no equivalent of, which is capture
without the extension, and the one thing the phone does better than the
computer.

**Decided:** **one Capacitor container carrying both** the Safari extension and
the library, so one App Store install gives both and there is no
Add-to-Home-Screen ritual. The library reads what the extension kept by the
native route, (ii), so a free user on a phone can look at their own highlights
without sync. Reopen only on the judgement nobody can make from here: whether
the web view's feel is the thing people dislike about Kona on a phone.

---

### 10. Archiving a highlight — settled

The library is everything you ever kept, so it fills with things kept once for
a reason that has passed. Wanting them out of the way is not wanting them gone,
and deleting is the only tool there is today — which is the worst possible
answer from a product whose whole job is keeping things.

**The shape that makes this safe: archived is a filter on one list, not a
place.**

That is the whole decision; everything else follows from it. A *place* has to
be known about by everything — search has to decide whether to look there,
counts whether to count it, spaces whether to show it, sync whether to carry
it, export whether to include it. Each of those is a chance for two surfaces to
disagree about where something is, which is the defect this document exists to
prevent. A *filter* is known about by one list.

So, exhaustively:

| | |
| --- | --- |
| In the library's default view | **No.** The only thing archiving changes. |
| Found by search | **Yes**, always, marked as archived. |
| Still painted on the page | **Yes.** The mark is the thing you made. |
| In the panel for that page | **Yes.** The panel is about this page. |
| Still in the spaces it was added to | **Yes.** A space is deliberate; the library is the firehose. |
| Visible to others in a shared space | **Yes.** Archiving is personal, always. |
| Deleted by archiving | **No** — and you can still delete it yourself. |

**Search must never lose it.** Kona promises one thing: that you can find it
again. An archive that hides things from search is a bin with extra steps, and
it turns archiving into a decision rather than tidying — which is how people
end up deleting instead, because at least deleting is honest about itself.

**Personal in a shared space, always.** Otherwise archiving becomes a quiet way
to take somebody else's contribution out of a space, which is a thing Team must
not have.

**Bulk, or it is not a feature.** Archiving two hundred highlights one at a
time is a punishment. Select several and archive them together.

**Where it lives:** a filter inside the library, not a third thing standing
beside Library and Spaces (3f). Archived is a state a highlight is in, not a
region of the product.

**No automatic archiving.** Not after a year, not on anything. A tool that
hides what somebody chose to keep because time has passed has decided what
matters on their behalf, and the entire product is an argument against that.

*Note on 1b:* making this available on Free looks like it contradicts 1b, which
made archiving a *space* a Team feature, and it does not. The rule underneath
1b is *archiving must not defeat a cap* — the five-space cap has to be felt, or
nobody has a reason to pay. Highlights are uncapped on every tier, so there is
no cap here for archiving to defeat.

**Decided: archive works the way Gmail's does.** The author's analogy, and it
is a better frame than the one I reached for, because it says in two words what
"a filter on one list" takes a paragraph to say: **archiving means "not in my
inbox", and search is how you get it back.**

Everything in the table above is Gmail's behaviour. Out of the default view but
still in everything; found by search, which is the main way anybody ever
retrieves archived mail; labels — here tags and spaces — stay attached;
reversible at any time; and archiving itself never deletes.

It also sets the **frequency**, which the table did not. In Gmail archiving is
not a rare, considered act — it is the ordinary gesture you apply to almost
everything, in bulk, to keep the inbox down to what you are actually looking
at. That is what "there are so many highlights, I want to archive the ones I am
not looking at" describes, and it is why **bulk** above is not a nicety.

**And deleting an archived highlight works normally.** Asked explicitly, and
10b already had it: delete is offered on the default view and the archived view
alike. The table row saying *deleted, ever: no* means **archiving** never
deletes something — not that an archived highlight is protected from you. It is
yours; you can always be rid of it.

**One correction to the wording above:** "a filter inside the library" predates
3f, which made the library the place that holds two views. It is a filter on
the **Highlights** view. Substance unchanged.

---

**10a. Is archiving capped on Free? — settled**

Proposed: twenty archived highlights on Free, more on Pro. It follows the same
rule that set the five-space cap, and the segmentation is sound — twenty is
above what a casual user ever reaches, so it would only bite heavy users, who
are the ones most likely to pay.

*Recommendation: do not cap this one,* and the reason is not generosity.

**People pay to do more, not to clean up.** Sync is *do more*. A sixth space is
*do more*. Both caps work because the thing behind the wall is capability you
can picture wanting. Archiving is housekeeping, and nobody has ever bought
housekeeping. Hitting a limit on it does not produce the feeling that preceded
a purchase; it produces the feeling that the product is getting worse the more
you use it.

**And the failure mode is deletion.** This is the part that matters. A free user
with fifty highlights to put away and twenty archives does not upgrade. They
delete the other thirty — because deleting is free, unlimited, and right there.
Every other decision in this document is built to make keeping things safe. A
cap on archiving is the one cap that makes destroying them the rational move,
and it destroys the thing we are selling in order to advertise it.

**The free tier already has four walls** that are felt and that nobody can
delete their way around: no sync, no hybrid search, five spaces, no shared
spaces. A fifth wall that makes the product messier is not more pressure to
pay. It is friction on using it at all.

**If a wall is wanted here**, gate the convenience and not the number: Free
archives one at a time, Pro archives in bulk. It bites the same heavy user, for
the same reason, and the worst case is tedium rather than lost work. This
contradicts "bulk, or it is not a feature" above, and that is the honest trade
— a tedious tidy is survivable, a cap that rewards deleting is not.

**Decided: fifteen on Free, unlimited on Pro.** The author's call, against the
recommendation above, and consistent with how every other limit here was drawn:
a free tier that gives way at each wall leaves nobody a reason to pay, and the
walls are supposed to be felt.

One correction to my own argument above, since it cuts the other way: at twenty
the cap would only have reached heavy users, which was the strongest thing
going for it. Fifteen reaches ordinary ones too. That makes the shape below
matter more
than the number.

**Three rules keep the cap from rewarding deletion**, which was the real
objection and is the thing left to design around.

**The fifteen are a working set, not a lifetime quota.** Only what is
*currently*
archived counts. Un-archiving is free and instant and gives the slot straight
back. So the limit reads "fifteen put away at a time", not "fifteen ever" — a
thing you
manage rather than a thing you spend. Almost everything the objection above
feared comes from the quota reading, and this is not that.

**Nothing is lost at the wall.** Same as 1b: reaching the limit means an
sixteenth cannot be archived, and never that something already archived comes
back on its own, or is deleted, or is hidden.

**The wall never offers deleting.** When somebody tries for a sixteenth, the two
ways forward are un-archive something, or go to Pro. A delete control does not
appear in that moment, anywhere. The product must not be the thing that
suggests it.

*One consequence of Free having no sync:* the count is per device, because on
Free the library is local and there is nothing to count it against. Two
browsers mean fifteen each. That is unavoidable rather than intended, and it is
one
more thing Pro quietly fixes.

---

**10b. Deleting a highlight — settled**

Delete is available on any highlight, in the default library view and in the
archived view alike. It is your text; there has to be a way to be rid of it,
and hiding that control in only one of the two lists would be arbitrary.

This does not reopen the last rule in 10a. That rule is about one moment — the
instant somebody is told they cannot archive a sixteenth thing — and says the
product must not offer deleting *as the way out of its own limit*. Delete being
an ordinary action on an ordinary row is a different thing entirely.

**Delete is the opposite of archive, and the pair only makes sense stated
together:**

| | Archived | Deleted |
| --- | --- | --- |
| In the library's default view | No | No |
| Found by search | Yes | No |
| Painted on its page | Yes | No |
| In the spaces it was added to | Yes | No |
| Recoverable | It was never gone | No |

So the division is: **archive if you might want it, delete if you are sure.**

**No trash.** Archive already occupies the "keep it but take it out of my way"
slot, and a recoverable-deleted state would be a third place every surface has
to ask about — the exact defect 10 was shaped to avoid. Delete means gone.

**Undo instead of confirmation**, for a single delete: a brief *deleted · undo*
after the fact. The real failure is a misclick, and undo answers a misclick
while a dialog only trains people to dismiss dialogs.

**Confirmation for bulk**, with the count in it. Archiving is bulk, so deleting
will be too, and fifty at once deserves a deliberate yes rather than a toast
that may be missed.

**Your own highlights only.** In a shared space you can delete what you
contributed. Taking out somebody else's contribution is a different operation
with its own rules, and it belongs to Team.

**Delete is never the easier of the two.** Wherever both appear, archive is at
least as reachable as delete — same menu, never a primary button where archive
is buried. A keeping tool may not make destroying things the quickest gesture
available.

*Scope, after 10c:* they only both appear in the library, which is the one
place archiving is done. On the page, Delete stands alone, and what makes that
acceptable is the undo toast rather than a sibling button.

**One honest interaction with 10a, recorded rather than argued:** "archive if
unsure, delete if sure" holds until the fifteenth archive. A Free user who is
unsure, with fifteen already put away, has only delete in front of them. That is
the pressure the cap creates, and the three rules in 10a are what keep it from
becoming a suggestion.

---

**10c. Editing and deleting a highlight on the page — settled**

The ask, precisely: you are scrolling a page, you pass a highlight you made,
you decide it was not that important, and **it goes, right there.** Not in the
panel, not in the library, not anywhere you have to travel to.

**So: tap the highlight, and the bar appears at the highlight.** The same bar
that appears when you make one — colours, Note, and where it is going (2g) —
with **Delete** on it.

**Archive is not on it, and decision 10's own table says why.** Archiving
changes exactly one thing: whether a highlight is in the library's default
view. It is still painted on its page. So archiving from the page would be an
action with **no visible effect where you performed it** — you tap Archive,
and the highlight you are looking at stays exactly as it was. That is a bad
affordance regardless of how useful the action is.

**Archive belongs where the list it affects is: the library.** Not the panel
either, which is about this page (2a) rather than the library's default view,
so it has the same problem. On the page you are reading, not tidying, and the
two things you want are to change a highlight or to be rid of it.

**One component, two moments.** The bar you get for making a highlight and the
bar you get for reconsidering one are the same bar. That is worth having as a
rule rather than as a coincidence: it means there is one thing to design well,
one place to look for anything you can do to a highlight, and nothing new to
learn the second time.

Delete follows 10b unchanged — gone from the library, from search, from its
spaces, no longer painted — with the undo toast afterwards, so a mis-tap on a
phone is survivable. That toast is what makes Delete acceptable as the only
destructive thing on the bar.

**The mechanism, because it is not what anybody would assume.** `painter.ts`
draws with the CSS Custom Highlight API: `new Highlight()` and `::highlight()`.
A highlight is **a paint layer with nothing in the page's DOM** — which is
exactly why Kona never disturbs anybody's markup, and also means **there is no
element to attach a tap to.** So tapping has to be hit-tested: take the click
point, find the text position under it, and ask whether that position falls
inside a range Kona is holding. This is the difference between "add a click
handler" and "write a hit test", and it is better known now than discovered
later.

**And one case it creates: a highlight over a link.** Since nothing of Kona is
in the DOM, the page's own click still happens — tap highlighted link text and
you navigate, before any bar could appear. Kona must **not** intercept that:
breaking somebody's links to offer a delete menu is the wrong way round. For
those, the panel's row for this page is the way in. It is one tap, and the
panel is about this page anyway (2a).

**Undo immediately after making one** stays as a separate and cheaper thing:
the bar is already open at that moment, so it carries undo too, and a
misselection costs one tap with no dialog in front of it.

**Decided:** tap a highlight on the page and get the same bar you got when you
made it, carrying colour, note and delete. Archiving is done in the library.
Highlights over links fall back to the panel, and nothing of the page's own
behaviour is intercepted.

---

**10d. Does the Gmail model survive a cap of fifteen? — settled**

**Decided: fifteen on Free. Past that, un-archive something, delete something,
or take Pro.**

This is option (c) below, chosen rather than discovered, which is the only
thing this entry was ever asking for. Recorded without re-argument: the number
was raised from ten, the author has answered this three times, and the
reasoning throughout has been consistent — a free tier that gives way at each
wall leaves nobody a reason to pay.

The arithmetic is unchanged and belongs on the record so nobody is surprised by
it later. **Gmail's archive is a high-volume gesture** — the use case given for
Kona is the same one, *so many highlights, I want to archive the ones I am not
looking at* — and a cap bounds it:

| Library | Put away on Free | Left in the default view |
| --- | --- | --- |
| 50 highlights | 15 | 35 |
| 300 highlights | 15 | 285 |

So on a large library, archiving on Free is **a taste of the gesture rather
than the gesture**, and Pro is where it becomes the thing Gmail's is. That is
now a decision.

*One wording note, because the author's phrasing and 10a's rule can look like
they disagree and do not.* "They either have to delete or choose Pro" describes
what somebody **can** do, and they can: delete is available on every highlight
everywhere (10b, 10c). 10a's rule is narrower and about one moment — the wall
itself does not put a delete control in front of you, because the product
should not be what suggests destroying things. Un-archiving is offered there,
and it hands the slot straight back. Both hold.

- **(a) Raise it further.**
- **(b) Drop the cap.**
- **(c) A bounded version on Free.** ← chosen, at fifteen.

---

### 11. What each tier is, and where limits stop — settled

**Each rung is a different kind of thing, not a bigger number of the same
thing.**

| | |
| --- | --- |
| **Free** | Alone, on one device. |
| **Pro** | Alone, everywhere, in step. |
| **Team** | With other people. |

That is the whole ladder, and it decides where limits may appear: **only on
Free**, where they exist to make the rung bounded so there is a reason to leave
it. Above Free, a limit would be a second wall charged for once — and the next
rung is not more of the same, it is other people. So:

**Unlimited spaces on Pro.** Already the case in `DEFINITIONS.md`; it had simply
never been written here or in the summary table, which is how it came to be
asked. A space is metadata and syncing one costs nothing worth counting.
"Unlimited" is also a cleaner thing to sell than a larger number, and a larger
number would be a wall invented for no reason.

**Unlimited highlights on every tier, Free included.** Highlights are the core
action; capping them would be capping the product. Worth checking rather than
asserting, now that sync means storing them: a highlight is a passage, a URL, a
note and some ids — on the order of a kilobyte. Fifty thousand of them is about
fifty megabytes, which is nothing. The unlimited claim is affordable, not
brave.

**The caps that remain are both Free's, and both deliberate:** five spaces (1b)
and fifteen highlights archived at a time (10a). Each was drawn so the free tier
would be felt rather than endless.

**Decided:** the ladder above, and unlimited spaces and highlights on Pro.

---

**11a. Then should archiving a space still be Team-only? — settled**

An inconsistency falls out of the line above, and it has been sitting in the
documents unnoticed.

1b made archiving a space a **Team** feature, and gave one reason for it:
archiving would turn the five-space cap into a formality. That reason is
entirely about Free. **Pro has no space cap for archiving to defeat** — so on
Pro the stated reason simply does not apply, and `DEFINITIONS.md` currently
says Team has archiving while Pro does not, for a reason that is not true of
Pro.

Worse, unlimited spaces makes archiving them *more* useful, not less. Somebody
with forty spaces wants the finished ones out of the way; that is exactly the
need decision 10 was written for.

*Recommendation:* **one rule, stated once, which answers every case.** Archive
is available wherever there is no cap for it to defeat.

| | Highlights | Spaces |
| --- | --- | --- |
| **Free** | Fifteen at a time — the cap is the point | **No** — the hard five must be felt |
| **Pro** | Unlimited | **Yes** — no cap to defeat |
| **Team** | Unlimited | **Yes** |

This amends 1b, which was decided against my recommendation and on reasoning I
accepted. The reasoning is untouched here: the Free cap stays a hard five and
Free still cannot archive a space. Only the claim that Pro cannot changes, and
it changes because Pro stopped having a cap.

**Decided: Pro can archive a space.** 1b is amended in place to match, and the
author's reason for it is the better one: **Team's selling point is other
people.** Archiving was never what anybody would buy Team for, so holding it
back was defending a differentiator that was doing no work — while making Pro
worse for exactly the people most likely to need it. Team sells discussion, who
gathered what, and deciding together. It does not need a lure.

---

### 1h. Is Android a place you highlight, or only a place you read? — settled

**Both.** Confirmed by hand: the extension works in Firefox for Android.

**The reframe that makes the rest of Android tractable.** Kona does not need to
run inside the page to make a highlight. It needs two things — **the page's
URL and the exact quote** — and the extension is simply the most convenient way
to get them. Android can get them another way.

So Android is not one question but three, and they have very different answers:

| | Chrome on Android | Firefox on Android |
| --- | --- | --- |
| **Making a highlight** | Share sheet → Kona. Two or three taps. | The extension. Identical to desktop. |
| **Coming back to it** | **Native, and perfect.** | The extension paints it. |
| **Seeing old marks on a page you simply opened** | **Impossible.** | Works. |

The middle row is the one nobody expects. Kona's links are **URL text
fragments** (`#:~:text=`), which `src/core/link.ts` already produces. Every
current browser resolves them itself: tapping a highlight in Kona opens Chrome
at exactly those words, scrolled to and highlighted *by Chrome*. **The return
trip — the actual payoff, per decision 4 — needs no extension at all.**

So the only genuine loss on Chrome for Android is the third row: ambient
re-display, seeing your marks on a page you arrived at by yourself. That is
real, and it is one row rather than the whole product.

**Nobody is told to change browser.** That was the objection to the old
recommendation (b). The honest line is the other way round: Chrome gets capture
and the return trip, and **Firefox additionally shows your marks as you
browse.** One extra thing for people already there, rather than a demand of
everybody else.

#### How capture gets as close to the extension as Android allows

**The share sheet, into the app Capacitor already gives us.** 9a chose
Capacitor for iOS, and Capacitor builds Android from the same source, so the
Play Store app costs nothing extra. It registers as a share target natively,
which also avoids Android's rule that a *web* app must be installed before its
share target appears at all.

**Chrome already does the hard part.** Chrome on Android has a built-in *share
link to highlighted text*, built on text fragments — so a share can arrive
carrying the page and the exact passage together, in Kona's own format.

**And Kona does not depend on that.** If a share arrives as plain text plus a
URL instead, Kona builds the quote selector itself with the matcher in
`src/core/quote.ts` that it already uses everywhere else. Chrome's feature
makes the capture more precise; it is not load-bearing, so a change to it
cannot break Android.

**Rejected: `ACTION_PROCESS_TEXT`.** This is the one-tap route — an app can put
itself directly in Android's text-selection toolbar, no share sheet. It is
tempting and it is wrong here, for two independent reasons:

- **It carries no URL.** The system passes the selected text and nothing else.
  A highlight without its page cannot do the one thing a highlight is for, so
  this would manufacture broken highlights.
- **It cannot be filtered by context.** The action appears on *every* text
  selection in *every* app on the phone. "Kona" next to a phone number in
  Settings is clutter we would be inflicting system-wide to save one tap.

**What makes it feel smooth is not the tap count.** Three things:

- **It must not be an app switch you have to come back from.** The share
  target takes the highlight and gets out of the way — a brief confirmation,
  the same gesture-sized thing as 2g's bar, not a screen to dismiss.
- **The active space applies**, exactly as it does everywhere else (2e). A
  share is a capture, and captures go where captures go.
- **Colour is not chosen at capture.** There is no selection bar to put swatches
  in, so a share takes the default colour and it can be changed afterwards.
  Speed over control, at the one moment speed matters.

**Decided:** Android highlights, on both browsers, by the routes above. Firefox
gets ambient marks; Chrome does not, and is not asked to.

---

### 12. Colours and palettes — settled

**The governing image, and it settles most of this on its own: a palette is a
set of highlighting pens.** Not a theme, not a colour scheme. The four are the
pens you start with, and a palette is where you make your own.

**1. One palette, which you add to.** Four pens to begin with. Not four
palettes — that reading is dropped.

**2. A colour's meaning is yours.** Kona never defines what a colour means and
never will, and you can filter by colour. That is the usefulness without a
taxonomy, and without colour becoming a rival to tags (1c).

**3. Named by hue.** "Amber", derived from the value. Not named by you — which
fits the pens: a highlighter has a colour, not a label. The name exists so Kona
can refer to the colour in a list and to a screen reader, and it must be
derived deterministically, or two devices name one colour differently and 6 has
to sync a disagreement.

**4. A highlight keeps the colour it was made with. Editing a palette changes
nothing already marked.** The author's call, against my recommendation, and the
pen image is why I was wrong: **swapping a pen in the case does not change the
marks already on the paper.** I had argued a highlight should point at a palette
slot so that editing a palette would repaint the library — which is
database tidiness reasoning about a product where it would be alarming. Nobody
wants last year's reading to change colour because they picked a new pen today.

Two consequences, worth stating because they follow and are easy to get wrong:

- **The colours in use across your library can outnumber the palette.** A pen
  you removed still exists in everything you marked with it.
- **So filtering by colour works on the colours in use, not on the palette.**
  The filter is built from what your library contains.

**5. An opacity slider.** The author's call, and better than my automatic
tinting: explicit beats clever, and Kona never refuses a colour you chose.

*And no ceiling — settled.* I had wanted the slider to stop short of full
opacity, because a solid colour hides the text under it. The author's answer is
that this is the person's own pen and their own call, and on reflection my
concern was weaker than I made it sound: 12's own rule is that **editing the
list never repaints what you already marked**, so a bad pick affects nothing
but the next highlight, and the preview shows it before it is made. The blast
radius is one colour, visible before it is chosen, undoable after. A guardrail
against that is a guardrail against nothing.

**6. Colour is never the only signal.** The name is reachable in the row and to
a screen reader, so two highlights are distinguishable by somebody who cannot
tell the colours apart. 9 already committed to that mattering.

**7. Free.** Making your own pens is not something to charge for. It is
therefore **per device**, since Free does not sync (11) — a palette edited on
the laptop is not the palette on the phone, the same way the caps are per
device (10a).

**Decided:** all seven above.

---

### 13. What happens when a highlight cannot be found again? — settled

**Nothing in either document covered the failure of the one thing Kona
promises.** The matcher tries three ways — exact, then ignoring whitespace,
then approximately within a 12% error budget. Pages get rewritten, paywalled
and deleted, so sooner or later all three fail.

**Decided: say so in place, and mark it in the library.**

**In place**, when you open the page: *this page has changed.* The passage you
kept is shown, and the link is still offered, because a page that has been
edited near your highlight is usually still the page you wanted.

**In the library**, as a state on the highlight, so you can see which of your
highlights have rotted instead of discovering it one at a time.

**The reasoning that makes this cheap rather than sad:** what is lost is the
**landing, not the quote.** The passage is still in your library, still
searchable, still in its spaces — Kona copied it when you kept it. So an
unfindable highlight is a highlight that has lost one of its abilities, not a
broken record. That is worth saying in the interface too, in those terms.

And link rot is permanent. Hiding it only means somebody finds out later, in a
worse moment, and trusts Kona less for having been quiet about it. A page that
has disappeared entirely is the same case with the same answer.

**How it breaks is part of the promise**, which is why this was never a detail.

---

### 14. Getting your highlights out — settled. Import is open.

**Decided: export is free, on every tier, always reachable, in two formats.**

**It matters more because of 6, not less.** If the server cannot read your
library, and you lose every device and the recovery phrase, then the data is
genuinely gone — we said so plainly. A file you keep is therefore **the only
backup that exists**. End-to-end encryption turns export from a courtesy into a
safety feature, and nothing that is a safety feature goes behind a tier.

**Two formats, because they answer two different fears:**

| | |
| --- | --- |
| **A machine format** | A backup. It can be read back in, so your library survives a lost phrase. |
| **A readable one** | "I want my work even if Kona dies." Useful without us. |

**14a. Does import ship at all? — settled**

**Decided: Kona's own export, and a rule for everything else.**

**The required one is reading our own export**, which is two things at once and
only one piece of work: the **restore** half of 14's backup promise, and the way
a library moves between accounts.

**And an export somebody else shares with you.** The author added this, and it
is worth naming for what it is: a **copy, not a shared space.** A file brings
the passages, their pages and their notes into your library and they are yours
from then on — no threads, no who-gathered-what, no later updates when the
sender adds something. Shared spaces are still 3d's answer and still Team's.
This is a snapshot handed over, which is a different and much smaller thing,
and saying so keeps it from quietly becoming a worse version of Team.

An imported highlight keeps its page, quote, note and colour, and is marked as
imported with a date. Kona does not invent authorship it cannot show.

#### Can they import from other tools?

Yes, and the useful answer is a rule rather than a list, because the formats
divide sharply and not in the way you would guess.

**The unit is a passage.** Kona imports things that carry a quote. A bookmark or
a saved article carries no passage, so it is not a highlight and does not come
in — importing bookmarks would fill a library with pages nobody had marked.

**Then it lands if the format carries a selector, and arrives orphaned if it
does not.**

| | What it carries | What it becomes |
| --- | --- | --- |
| **Hypothesis** | W3C Web Annotation, including a **TextQuoteSelector** | A full highlight that lands, because that is the model `quote.ts` already uses |
| **Readwise** | Text, title, sometimes a URL | A highlight that cannot be found again |
| **Kindle** | Text and a book title, no URL | The same, and arguably not Kona's business at all |
| **Bookmarks, read-later** | A page, no passage | Not imported |

**Hypothesis is the one high-fidelity import available**, and the reason is
free: it uses the same W3C quote-selector model Kona was built on, so its
annotations arrive able to resolve. If any third-party import ships, it is that
one.

**Everything else arrives in 13's state** — the quote kept, the landing lost —
which is the point. **Import needs no new concept.** It is the same state PDFs
arrive in (16) and the same state a rewritten page produces, so there is one
behaviour to build and it is already decided.

*Order:* our own export first, because it is the backup promise. Hypothesis
next, if anybody asks, because it is cheap and lands. A generic text-plus-URL
reader covers the rest whenever it is worth the afternoon. No parser is ever
written on spec.

---

### 15. Where search lives, and what it spans — settled

Hybrid search is Pro's other selling point (11) and had no interface decided
anywhere.

**Decided: one box, in the library, spanning both of its views.** Highlights
and spaces (3f) are two ways of organising the same things, so searching one
and not the other would make you guess which view your answer is filed under —
which is the question search exists to stop you asking.

**Filters are refinements on that box, not a screen of their own**: colour (12,
built from the colours in use rather than the palette), tag, space, domain,
date. A filter screen is a second place to be, and it would compete with the
box instead of sharpening it.

**No search in the panel.** The panel is about this page (2a), and a page's
highlights are already in front of you — a search box over four rows is
furniture. The panel's job is *here*; the library's job is *everything*, and
search belongs to the second.

**Archived highlights are always included**, marked as archived. 10 settled
that, and it is the reason archive is safe to use: nothing you put away ever
stops being findable.

---

### 16. PDFs — settled

**My leaning was wrong, and checking it was worth more than the leaning.** I
guessed that Firefox renders PDFs with pdf.js as an ordinary page, so a content
script could run there. It cannot. **MDN lists the PDF viewer among privileged
pages**, alongside `about:addons` and reader view, and Mozilla's own bug thread
says the viewer would have to lose its privileged status first — true since
Firefox 60. Chrome's viewer is protected the same way.

So this is not the Android case. There is no browser where Kona can run inside
a PDF being read in the browser's own viewer. **Flat no, both engines.**

**But the check turned up a route that is better than giving up**, and it fits
a decision made ten minutes ago.

**Decided: capture by context menu, and admit there is no landing.**

A context menu item **can** read the selection on a privileged page — that is
the documented exception, and `contextMenus` is already in the manifest. A
right-click gives Kona the selected text and the page's URL, which is
everything a highlight is made of. So on a PDF: select, right-click, keep. The
passage and the source are saved.

What it cannot do is paint the mark on the PDF or land you back on it, because
nothing of Kona can run in that viewer. **Which is exactly the state 13 just
defined** — a highlight that has the quote and has lost the landing, shown
honestly as such. PDFs do not need a new concept; they arrive already in a
state the product understands.

**Two limits, stated rather than discovered:**

- **Desktop only.** A context menu needs a right-click, and there is not one
  on a phone. The inverse of 2g, which chose a tap over a modifier key for the
  same reason.
- **No page number.** A text selection does not carry one, so the source is the
  PDF, not a place in it.

**And the full-fidelity option stays available for anyone who wants it:**
reading the PDF *inside* Kona, in a viewer Kona ships, where everything works
normally. That is the rule `DEFINITIONS.md` already states for a browser built
into an app — it works, but only where somebody chose to read inside Kona. Not
the default, and not nothing.

---

### 17. How you move around the library — settled

Prompted by the first mockup getting this wrong. It drew `Everything` and
`Archived` as two pills in the same row as `Colour`, `Tag`, `Site` and `When` —
and those are not the same kind of control at all.

**Three kinds of control, three places.** Conflating any two of them is what
made the first attempt feel cheap.

| | | |
| --- | --- | --- |
| **Where you are** | Exclusive — one at a time | The nav |
| **Across everything** | Spans every scope | The search box |
| **Refinements** | Additive — stack freely | The chips |

**A left nav, the way Gmail has one**, collapsing behind the three bars at
narrow widths and shown at desktop width:

- **Highlights** — the default, archived left out.
- **Archived** — just those. Two complementary sets, and no third "everything"
  item is needed, because **search is the everything** (15).
- **Spaces**, with the spaces themselves listed under it; the active one wears
  the orange dot, so 2e's rule is visible wherever you are rather than only on
  the spaces screen. The section heading opens the grid.
- **Tags**, which 1c settled are an independent axis.

**The nav is what makes unlimited spaces survivable.** 11 gives Pro as many
spaces as it likes, and a tab reading "Spaces 40" with a grid behind it is
worse the more you have. Gmail grew a nav for exactly this reason: labels
multiply. A list you can scan does not get worse at forty.

**Tag and Space leave the chip row** and become nav items, because picking one
*is* changing where you are. That removes a duplication the first mockup had,
where Space was both a chip and a tab. The chips are now only attributes of a
highlight — **Colour, Site, When** — which is a clean definition rather than a
leftover.

**No segmented switch here, and the reason is worth keeping:** a segmented
toggle says *two equal alternatives*, which is why it is right for the
monthly/annual switch in 8. `Highlights` and `Archived` are not symmetric — one
is the default and the other is what you put aside — so a switch would state
something false about them.

**Dark mode is coming, and it does not undo the rule below.** The library gains
a dark theme that follows the system. The panel does not have a light one: it
floats over somebody else's page and must stay legible over a white article
and a black one alike, which is a different job from matching your preference.
So dark mode is a setting on the library, and the panel stays as it is.

**And one rule the mockups were already following without saying so: the panel
is dark, the library is light.** The panel floats over somebody else's page and
has to stay legible over anything, so it is a dark slab. The library is your
own room: cream, serif passages, no chrome competing for attention. That
settles the look of every surface added later — in the page, dark; of our own,
light.

**Decided:** all of the above.

---

**17a. The account row at the foot of the sidebar — settled**

**It is an account row, and it is quiet.** My first two attempts at this were
both wrong in the same direction — borrowing a shape from a product that is
account-first, then over-correcting into a four-state status line.

Three of those four states were furniture. *On this device* never changes. *In
step, 3 devices* never changes. Mid-sync is a flicker nobody watches. **Only
the fourth earned its place:** 23 allows no notifications, so a sync that has
not run since Tuesday has exactly one route to the person, and this row is it.

So the row says the least it can:

| | |
| --- | --- |
| No account | **Sign in** — something you can act on, rather than naming a state you cannot change |
| Signed in | Your name. No plan badge, no sync time, nothing to say |
| Sync has failed | It changes, and goes amber |

**It is quiet the rest of the time precisely so it is believed when it is
not.** A row that reports its own health all day is one nobody reads, and then
the one message that mattered is the one that gets missed.

**Pens sits above it**, as its own row — the thing you reach for while reading
should not cost two clicks.

**Why the row exists at all**, since it was asked: signing in has to live
somewhere, and so do your account, your settings and saving a copy. Every one
of those is about you rather than about what you kept, and the nav above is
about what you kept. The amber state is a second job the row happens to be
well placed for, not the reason it is there.

**Opened, the menu holds:** save a copy of everything, first, and saying what
it is for, since 14 made it the only backup that exists; devices; settings;
what's new (4); the email address, low down; and signing out. Signed out it
holds only settings and saving a copy — there is no upgrade to offer before
there is an account to attach it to, and nothing to log out of.

---

### 18. Can an image be highlighted? — settled

**Yes, and it is a highlight, not a new noun.** A chart can be the whole point
of a page, and screenshotting it into a folder is what people do instead.

But almost everything about it differs under the surface, so it is worth
writing down rather than assuming it falls out:

**It cannot be painted the usual way.** The CSS Custom Highlight API takes text
ranges; an image is not text. So an image is marked with an outline drawn in
Kona's own layer, over the image, never in the page's DOM — the same discipline
10c relies on.

**Its anchor is weaker, and that is the honest cost.** Text has a quote
selector that survives rewriting. An image has its source, its position among
the page's images, and the text nearest it. Those are good enough most of the
time and worse than a passage, so an image is likelier than a passage to end up
in 13's state — kept, searchable, no longer landable.

**It carries text anyway, or search loses it.** The caption, the alt text, or
the paragraph it sits in becomes the highlight's searchable content. An image
with no text near it is the one case that is genuinely hard to find again, and
Kona should say so rather than pretend.

**Kona keeps a copy, not a link — and this is the part that is easy to get
wrong.** Showing the image in the library by its original URL would fetch it
from the site it came from, which is exactly the per-page fetch 6 forbids: it
tells that host you kept something from their page, and it would do it for Free
users too. So the bytes are stored. On Free that is local, which `storage` and
`unlimitedStorage` in the manifest already allow; on Pro it syncs as an
encrypted blob like everything else.

Storing it has a second benefit worth naming: **the image survives the page.**
A copy is still there when the site is not.

**Two things to bound when it is built:** a ceiling on what gets stored, with
large images scaled down rather than kept whole — nobody needs a twenty-megabyte
hero image preserved — and the knowledge that this changes 11's arithmetic. A
passage is about a kilobyte; a kept chart is hundreds. Images are the one thing
in Kona that could make sync expensive.

---

### 19. How much can one highlight hold? — settled

**No limit, and no invented number.** Select a word or select the whole page;
Kona keeps it. A cap would be arbitrary and would exist only to make a number
tidy.

But length is not free, and the reason is in the matcher rather than in a rule.
`quote.ts` allows `min(24, floor(length × 0.12))` differences when re-finding a
passage on a changed page, which has two consequences nobody would guess:

| Length | Differences tolerated | In effect |
| --- | --- | --- |
| 9 characters | 1 | the shortest that can flex at all |
| 100 characters | 12 | 12% |
| 200 characters | 24 | the cap starts to bind here |
| 1,000 characters | 24 | 2.4% |
| 5,000 characters | 24 | 0.5% |

**So a very long highlight is matched more strictly, not less.** The absolute
cap stops a long passage being matched by almost anything, which is right — but
it means a page edit anywhere inside a long selection is likelier to lose it
than the same edit inside a short one. Worth knowing; not worth a warning in
the interface.

**And below nine characters nothing flexes at all**: the match must be exact.
Also right, because fuzzily matching a short phrase is how you land on the
wrong one.

**What the interface does about length: truncate, never refuse.** A long
passage shows its opening in the panel and in the library with a way to see the
whole of it. A highlight that is an entire page is really a bookmark, and Kona
does not need to forbid that — it just will not be very useful, which the
person can see for themselves.

---

### 20. What is a space from the inside? — settled

**The biggest undesigned surface in the product**, and the one the whole paid
ladder leans on: the five-space cap is on it, Team is built on it, and nobody
has decided what you actually *do* once you open one. The grid in the mockup
shows spaces from outside. Inside is blank.

`DEFINITIONS.md` already names what can be in one: the highlights gathered, a
note, findings, open questions, decisions, and a write-up. What is undecided is
**which of those is the spine.**

- **(a) A list.** The space is its highlights, in an order you set, with a note
  at the top. Everything else is a label on a highlight.
- **(b) A list that can grow a write-up beside it.** The gathering is the
  space; the write-up is something the space *produces*, sitting alongside and
  never replacing it.
- **(c) A document that cites highlights.** You write, and pull passages in.

*Leaning:* **(b).** (c) is tempting and wrong for the same reason 1c was wrong:
it makes a space a document, and 1d settled that nothing in a space is
required. A document-first space is empty and reproachful on day one, when all
you have done is gather four links — which is the moment a space has to feel
worth keeping. (a) is honest but leaves nowhere for a conclusion to live, and a
space whose research is finished with nothing written is 1b's problem again.

To settle inside it: whether the highlights in a space keep their own hand
order (1e says highlights already have one, in `order.ts`), and whether a
finding is a highlight promoted or a note of its own.

**Decided: a space is a place to put highlights together. That is the whole of
it** — option (a). `DEFINITIONS.md` already said exactly that, in exactly those
words, and the rest of this entry is about what had quietly grown on top of
it.

**Three things follow, and two of them are new.**

**Taking something out of a space is a third verb.** "Remove the links" is not
archiving and not deleting, and conflating it with either would be a real loss:

| | Where it goes |
| --- | --- |
| **Remove from this space** | Out of this space. Still in the library, still in any other space. |
| **Archive** (10) | Out of the library's default view. Still in every space. |
| **Delete** (10b) | Gone everywhere. |

Three verbs, three scopes, and each one leaves more standing than the next.
Removing from a space is the gentlest thing in the product and should be the
easiest to do and to undo.

**A space can hold a page you have not marked yet.** The author said *links*,
and a research workspace genuinely wants *I found this, I will read it* — which
is a page with no passage in it. That sits oddly beside 14a's rule that the
unit is a passage, and the two reconcile cleanly:

> **Bare links live in spaces, never in the library.** The library is passages.
> A space is a workspace, and a workspace may hold something you have not read
> yet. It shows as what it is — an invitation to read, not a passage you kept.

That is also why 14a refuses to import bookmarks: a bookmark put in the library
is clutter nobody chose, while a link put in a space is a deliberate act.

**And the write-up goes, which costs nothing because 3d already provides it.**
`DEFINITIONS.md` had claimed a space *produces* a document, Free, on the
grounds that *a space that cannot produce a write-up is a folder*. That
argument runs backwards: it defends a feature by insulting the alternative,
and the alternative is what a space actually is.

It was also a second way to make something that already exists. **3d put shared
spaces on the web**, openable by somebody who has installed nothing, every
highlight linking to the exact words. That is the document. A write-up object
would have been an editor and a citation system for producing the same page a
second time.

So a space keeps its own **question** and **note** (1e), which is where a
conclusion goes, and **Finding** and **Write-up** leave the definitions
entirely. A settled thread is a team's decision (1f), and a finding was only
ever a highlight with a note on it.

**Unchanged, and confirmed:** discussing, settling and pinging are Team, as 1f,
1g and the Shared space definition already say. A solo space has none of it,
and that is not a gate over a shared feature — none of it means anything with
one person in the room.

**Still open inside this:** whether a finding is a highlight promoted or a note
of its own, and whether the things in a space keep a hand order of their own
the way highlights do in `order.ts` (1e).

---

### 21. What happens when your laptop and your phone disagree? — settled

**The situation, concretely**, because the short version of this was
unreadable. You are on Pro, so Kona is on your laptop and your phone and keeps
them in step. But they are not always in touch — your phone is on a train with
no signal.

On the train you add a note to a highlight. At home, on the laptop, you change
that same highlight to blue. Each device now holds a different version of the
same thing. **When the phone reconnects, something has to happen**, and nobody
has decided what.

It is the same shape every time:

| On one device | On the other | And then? |
| --- | --- | --- |
| A note is written | The colour is changed | Do you get both? |
| The highlight is deleted | A note is added to it | Does it come back? |
| The note is edited | The note is edited differently | Which words survive? |
| A space is renamed | The same space is renamed | Which name? |

**Why this cannot be left to the server.** Normally the server would work it
out — it can see both versions and merge them. Ours cannot: 6 settled that it
stores **what it cannot read**. It holds sealed blobs. So the merging happens
on a device, in Kona's own code, and whatever rule we write is the rule there
is.

*Leaning: when in doubt, keep.* A tool whose whole job is keeping things should
resolve every one of these in favour of things continuing to exist.

- **Merge field by field, not record by record.** The note and the colour are
  different fields of the same highlight, so both changes survive. Taking the
  newest version of the whole record would throw away an edit nobody asked it
  to throw away.
- **A deletion never silently beats an edit.** Deleted on one device, edited on
  the other, and it comes back — with a line saying why. The opposite rule
  loses work quietly, which is the one failure this product cannot afford.
- **Two different edits to the same note keep both**, one after the other,
  rather than a silent winner. It is untidy for a moment and nothing is gone.

**And a correction to 6 while this is open.** 6 lists *which space is active*
among the things that sync. That is probably wrong: the active space says what
you are doing **on this machine right now** (1a), so a phone switching it
under your laptop is an annoyance rather than a convenience. *Leaning:* the
active space is per device and does not sync.

**Decided: the latest change wins.** The author's call, and simpler than the
rule I was proposing without losing much of what it was protecting.

It is worth spelling out *why* it loses little, because the two positions turn
out to be nearly the same one:

**Per field, so the example above still works.** The note and the colour are
different fields of the same highlight. Each has its own latest change, so both
survive. Latest-wins only ever discards something when two devices changed **the
same field** — which is rarer than it sounds.

**A deletion is just another change with a time on it.** Deleted at ten, edited
at five past, and the edit is later, so it comes back. Edited at five to and
deleted at ten, and it stays deleted, because deleting it was the last thing
you decided. That is consistent, predictable, and it happens to err towards
keeping in the case people actually hit.

**What it does cost, stated once:** two devices editing the *same note* to
different words. The later one wins and the earlier is gone. My alternative was
to keep both, appended — which produces a garbled note the person then has to
clean up. On balance the simple rule is better, and this case is rare enough to
accept rather than design around.

**The one thing this still needs at build time: what "latest" means.** Device
clocks disagree, and a phone running ten minutes fast would win every
conflict it ever had. The server can order the blobs it receives without
reading them, so ordering by arrival is available and reliable — but it is
wrong for a device that was offline for a week, whose genuinely older changes
would arrive stamped as newest. Worth choosing deliberately then; not now.

**And the correction to 6 stands:** the active space is per device and does not
sync, because it says what you are doing on this machine right now (1a).

---

### 22. The selection bar on a phone

Every mockup so far is a desktop one, and the phone has a problem the desktop
does not: **the operating system already puts a menu over selected text.** Copy,
Look Up, Share, Translate. Kona's bar wants the same few hundred pixels, and on
iOS a Safari Web Extension cannot replace or add to that menu.

- **(a) Place the bar clear of it** — below the selection when the OS menu is
  above, and the reverse. Workable, and it depends on where the OS puts its own
  menu, which is not under our control.
- **(b) No bar on a phone.** Capture goes through the share route 1h already
  designed for Android, and the panel confirms afterwards.
- **(c) A single small button** that expands into the bar once tapped, so the
  footprint while the OS menu is up is one dot.

*Drawn in boards 9 and 10, which is as far as a desk can take it.* Kona takes
one 44px dot, placed below the selection where Safari puts its menu above;
tapping it turns the dot into the full-width bar, with the same contents as the
desktop one and nothing under 38px. 2g's escape hatch is the same single tap,
which is exactly why it was never a modifier key.

#### What to check on the phone, which needs no build

All of it can be answered in Safari on any article, today. The dot's whole
design rests on these five answers.

1. **Where does Safari put its menu?** Select text near the top of the screen,
   then the middle, then the bottom. The dot assumes *menu above, so we go
   below* — if Safari flips below when the selection is near the top, the dot
   has to flip with it.
2. **How tall is the menu, in lines of text?** That is how much vertical room
   is actually being contested, and it decides how far clear the dot must sit.
3. **Does tapping a blank part of the page clear the selection?** If it does —
   and it probably does — then tapping Kona's dot must not count as tapping
   elsewhere. That is a real constraint on how the dot is built, not a detail,
   because a dot that clears the selection before Kona can read it is useless.
4. **Does the menu come back** if you tap the selected text again? That is the
   recovery path when somebody dismisses it by accident.
5. **Does any of this change in landscape, or with larger text turned on?**
   Both are common and both move the same few hundred pixels around.

*Leaning:* this is still the one decision in the log that **should not be
settled from a desk.** It turns on behaviour that differs by OS version, and there is an
iPhone, an iPad and an Android phone here to check it on. The shape worth
testing is (c) falling back to (b): a dot is cheap to place and hard to collide
with, and the share route exists either way.

Worth saying plainly, because it is easy to miss: **this is the core gesture on
the surface iOS was chosen for.** If it is awkward, 9 is worth less than it
looks.

**Decided:** _______

---

### 23. Does Kona ever notify you?

Nowhere in either document, and exactly the kind of thing that gets decided
later by whoever wants a number to go up.

*Leaning:* **never, unless a person did something.** No "you have not
highlighted in a while", no weekly digest of your own library, no streaks, no
re-engagement of any kind. The only notification Kona sends is a ping from
somebody in a shared space (1f), which is Team.

The reason is the product's own argument. Kona exists because what you read is
worth keeping; a tool that pesters you about your own reading has started
treating your attention as its inventory. It is also the rarest kind of
promise — one that costs nothing to keep and cannot be taken back once broken.

**Decided:** _______

---

### 24. Kona as an app on the desktop — settled

**Yes, and it needs nothing built.** The argument for it is right: if today's job
is watching what the team gathered rather than reading the web, going to
Chrome and finding a tab among forty is the wrong way in. A tab is not a
place. An app in the dock is one click and always in the same spot.

**The web app installs as a desktop app already.** Chrome and Edge offer
*Install*; Safari on macOS has *Add to Dock*. What you get is a real window
with its own icon, its own slot in the task switcher, and no browser chrome —
which is the whole of what was being asked for.

So this does not reopen the frozen Electron app, and should not be confused
with it. **That** app existed to sync through a folder you picked, which
hosted sync replaced, and it stays frozen. What is being installed here is the
same web build — the same thing 9a settled for the phone, where Capacitor
wraps it. One codebase, three windows around it.

**What follows for the interface:** the extension's **Library** button should
open the installed app when there is one, and a tab when there is not. Chrome
can hand a link to an installed app for its own origin, and that behaviour is
worth confirming before it is relied on; the fallback is a tab, which is what
happens today.

**Where the offer lives, and where it cannot.** The extension cannot install
anything: the browser fires its install prompt at the *page*, not at an
extension, so the extension could only link to the library — and its Library
button already does. Putting an offer in the popup would add a step without
adding a capability, and 3e kept that popup to two states for a reason.

**So the library offers it, in the account menu, beside the one that already
works this way.** The menu shows what you do not have: *Get the extension* when
there is no extension (the 3c bridge knows), and **Install Kona** when it is
running in a tab rather than its own window (`display-mode: standalone` knows).
Neither nags, both disappear once taken, and the menu is where somebody is
already looking at things about themselves rather than about what they kept.

**The why is one line, not a feature list:** *its own window and a dock icon,
instead of a tab you have to find.* That is the entire benefit, and selling a
window harder than that would be overselling it.

**And the first run should say so** (4). An installable app that nobody knows
is installable is not an app. One line in the welcome page, and one in About.

**What a signed, store-listed desktop app would add**, if it is ever wanted:
being findable in a store, and an installer for people who will never press
*Install* in a browser. It is a wrapper around the same build, the same shape
as iOS, so it can be decided late and cheaply. Nothing above depends on it.

---

### 25. How anybody finds out Pro and Team exist — settled

**The extension offers neither, and that is the answer rather than a gap.**
Nothing the extension does is capped: highlighting is unlimited on every tier
(11). So there is no moment while reading when a limit is felt, and an
*upgrade* button next to the colour swatches would be advertising at the one
moment somebody is concentrating.

**Every limit is in the library, so every offer is in the library** — and
always at the moment the limit is felt, never before. That is already the
pattern, three times over:

| The moment | What it says |
| --- | --- |
| The sixteenth archive (10a) | Bring one back, or Pro |
| The sixth space (1b) | Delete one, or Pro |
| A word search that found nothing by meaning | Pro also matches by meaning |

**Sync is discovered by its absence, which is the only honest way.** You
highlight on the laptop, pick up the phone, open the library, and your
morning is not in it. That is the moment, and it is in the library. No banner
can manufacture it earlier, and a banner that tries is selling a problem the
person has not had yet.

**Team is discovered by invitation, not by advertising.** Somebody shares a
space and sends the link; 3d means you open it on the web with nothing
installed and see what it is — other people's passages, who gathered what, the
discussion. That is a far better explanation than any feature list, and it
costs us no interface at all. Besides that, it is named in the welcome page
and About (4) and listed on the plans page, which is enough.

#### The one thing the extension must show, and it is not a pitch

**When the active space is shared, the panel has to say so.**

2e settled that the panel always says where a highlight is going, in words,
because what is going where must never be implied. If where it is going is a
*shared* space, then "going to Housing" is no longer the whole truth — the
whole truth is that three other people will see this passage, from the page
you are reading, with your name on it.

Somebody quietly publishing their reading to colleagues because the panel said
the same thing it always says is the worst failure available here, and it is a
privacy failure rather than a product one. So the panel distinguishes them:

- Solo space: **Going to Housing**
- Shared space: **Going to Housing &middot; 3 people**, and the strip carries
  the faces or the count rather than looking identical.

That is the only thing about Team the extension ever shows, and it is there
because of honesty, not because of sales.

#### Everything else about Team happens in the app

Sharing a space, inviting, threads, settling, pings and who gathered what are
all the app — the same app whether it was opened as a tab, as the installed
desktop window (24) or as the phone container (9, 9a).

Taking part is not all-or-nothing, which falls out of the decisions rather
than being designed:

| To do this in a shared space | What you need |
| --- | --- |
| **Read it** | Nothing. A link, no install, no account (3d) |
| **Discuss in it** | An account. Still just the app |
| **Add highlights to it** | The extension, because only the extension highlights (3c) |

So somebody whose job is to read and respond takes full part with nothing
installed. That is worth keeping on purpose: requiring a browser extension of
a person who will never highlight anything would cost a team its readers.

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
| **Archived highlight** | Nothing. Neither the state nor the filter exists. |
| **Page** | Correct as of today: tracking parameters are stripped and old highlights migrate. |
| **Highlight survives an edited page** | Correct as of today. |

**Naming:** the code calls a page a `conversationId`, on ordinary web pages as
well as AI chats, because the chat sites came first. The word is wrong for most
of what Kona now covers, and renaming is cheapest before more is built on it.

## Loose ends

**A stale comment in `src/core/quote.ts`.** The note above `MAX_ERROR_RATE`
says "nothing under 17 characters is allowed a single error". The arithmetic
says nine: the budget is `floor(length * 0.12)`, which first reaches 1 at nine
characters. Seventeen would be right for a rate of 0.06, so the rate was
presumably raised and the comment left behind. Harmless today and exactly the
kind of thing that misleads whoever reads it next.

**`SHIPPED_AHEAD` in `src/core/plans.ts`** promises, in the extension's Plans
page and on the landing page, that sync and spaces will not be switched off
later. The tier decision contradicts it. Nobody but the author uses Kona, so
nobody is relying on that promise and it is not urgent: fold it into decision 8
when the tier copy is rewritten, rather than treating it as its own job.
