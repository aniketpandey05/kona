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

Three documents, one job each: `DIRECTION.md` is why, `DEFINITIONS.md` is what
every word means, and this is what is still undecided.

---

## Settled

| Decision | Answer |
| --- | --- |
| What Kona is | You highlight a passage anywhere you read, and can find it again and land on the exact words |
| Tiers | Free: extension, unlimited highlights, word search, 5 spaces, 10 archived at a time, no sync. Pro: sync across devices + hybrid search. Team: shared spaces |
| Why the free cap | A free tier that does everything leaves no reason to upgrade. Drawn now, with no users, rather than clawed back later |
| Where the paid line sits | Free is one surface. Pro is every surface, kept in step |
| Payments | Stripe on the web. Not Apple's in-app purchase: their rate is 30% in year one |
| What Kona is written in | TypeScript, every screen. Swift only for the iOS container, the share extension and the native bridge |
| iOS | The Safari extension and the library in one Capacitor container, so one App Store install gives both |
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

*Recommendation, in one line:* **an account is the thing that makes your
highlights the same on every device you read on, and it is nothing else.**

**A correction first, because it changes the answer.** What stood here said the
free cap needs an account too — that Kona must know who you are to know you may
not have a sixth space. That was written before 10a, which settled the
opposite: Free has no sync, so its counts are local and **per device**. The
five-space cap and the ten-archive cap are both enforced on the machine they
happen on, by code that needs to know nothing at all about you.

So **Free has no account.** No sign-up, no email, nothing to get past. You
install the extension, you highlight something, and it is yours. That matters
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

### 10. Archiving a highlight

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
| Deleted, ever | **No.** |

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

**Decided:** _______

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

**Decided: ten on Free, unlimited on Pro.** The author's call, against the
recommendation above, and consistent with how every other limit here was drawn:
a free tier that gives way at each wall leaves nobody a reason to pay, and the
walls are supposed to be felt.

One correction to my own argument above, since it cuts the other way: at twenty
the cap would only have reached heavy users, which was the strongest thing
going for it. Ten reaches ordinary ones. That makes the shape below matter more
than the number.

**Three rules keep the cap from rewarding deletion**, which was the real
objection and is the thing left to design around.

**The ten are a working set, not a lifetime quota.** Only what is *currently*
archived counts. Un-archiving is free and instant and gives the slot straight
back. So the limit reads "ten put away at a time", not "ten ever" — a thing you
manage rather than a thing you spend. Almost everything the objection above
feared comes from the quota reading, and this is not that.

**Nothing is lost at the wall.** Same as 1b: reaching the limit means an
eleventh cannot be archived, and never that something already archived comes
back on its own, or is deleted, or is hidden.

**The wall never offers deleting.** When somebody tries for an eleventh, the two
ways forward are un-archive something, or go to Pro. A delete control does not
appear in that moment, anywhere. The product must not be the thing that
suggests it.

*One consequence of Free having no sync:* the count is per device, because on
Free the library is local and there is nothing to count it against. Two
browsers mean ten each. That is unavoidable rather than intended, and it is one
more thing Pro quietly fixes.

---

**10b. Deleting a highlight — settled**

Delete is available on any highlight, in the default library view and in the
archived view alike. It is your text; there has to be a way to be rid of it,
and hiding that control in only one of the two lists would be arbitrary.

This does not reopen the last rule in 10a. That rule is about one moment — the
instant somebody is told they cannot archive an eleventh thing — and says the
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

**One honest interaction with 10a, recorded rather than argued:** "archive if
unsure, delete if sure" holds until the tenth archive. A Free user who is
unsure, with ten already put away, has only delete in front of them. That is
the pressure the cap creates, and the three rules in 10a are what keep it from
becoming a suggestion.

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
| **Archived highlight** | Nothing. Neither the state nor the filter exists. |
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
