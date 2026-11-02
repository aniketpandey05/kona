# Kona — YC Winter 2027, answers to paste

Deadline **Monday 2 November 2026, 8:00pm PT**. Apply at <https://apply.ycombinator.com>.

This file is the answers themselves, nothing else. The reasoning and the alternatives are
in [`YCOMBINATOR.md`](YCOMBINATOR.md); this is what goes in the boxes.

Figures below were counted from the repository on 2 November 2026: **115 commits since
17 September**, **336 tests across 24 files**, version **1.2.0**.

## The nine you have to write yourself

Everything else below is ready. These are facts I do not have, in the order you will hit
them. Most are one line.

| # | What it needs |
|---|---|
| 1 | Your name |
| 2 | Looking for a cofounder: yes or no |
| 6 | Whether you submitted to the Chrome Web Store |
| 8, 9 | Your current city, and any visa or relocation constraint |
| 11 | Hours a week, and whether alongside a job or study |
| 13 | How many people use it, and what they said |
| 17 | The origin story, your background, who you have asked |
| 21–23 | Entity, investment, fundraising |
| 24, 25 | Why you are applying, and how you heard |

---

## 1. Who writes code, or does other technical work on your product? Was any of it done by a non-founder?

All of the code is ours. **[YOU: name]** writes it. There are no outside contributors and
no non-founder work in the repository; the full history is public at
<https://github.com/aniketpandey05/kona> — 115 commits over six and a half weeks.

We build with Claude Code (Claude Opus) and review every change by hand. The test suite
exists because of that rather than in spite of it: the core logic is deliberately free of
the DOM so it can be tested without a browser, and there are 336 tests across 24 files
covering re-anchoring, ordering, search, signing, sync, backups and the price list.

## 2. Are you looking for a cofounder?

**[YOU: yes or no.]** If solo, say so plainly and add one line: what you are not good at,
and who you want next. YC funds solo founders every batch; pretending the question does
not apply reads worse than answering it.

## 3. Company name

Kona

## 4. Describe what your company does in 50 characters or less.

Shared memory for everything your team reads

*(44 characters. Alternatives that also fit: "Shared memory for what your team keeps from
AI" (46), "One searchable library for your team's AI work" (46), "Where your team settles a
question, with sources" (48).)*

## 5. Company URL, if any

<https://aniketpandey05.github.io/kona/>

## 6. Please provide a link to the product.

- Source, and how to get it: <https://github.com/aniketpandey05/kona>
- Phone app, live and installable: <https://aniketpandey05.github.io/kona/app/>
- The paid tier as a working demo: <https://aniketpandey05.github.io/kona/team/#/tour> —
  opens on a page explaining each capability, and one click puts you in a full team
  workspace. No server and no real payment behind it, which it says on screen.
- Chrome Web Store: **[YOU: submitted, or not yet. The listing copy and permission
  justifications are already written in `CHROMEWEBSTORE.md`.]**

## 7. What is your company going to make?

Kona turns the passages people highlight into a team's shared memory.

Today Kona is a browser extension. You select text on any page you read — a paper,
documentation, Stack Overflow, or a ChatGPT, Claude or Gemini conversation — pick a colour,
add a note and a tag, and it joins one searchable library. Every highlight keeps a link
that lands on the exact sentence it came from, and because that link is an ordinary URL
text fragment it works for someone who has never installed Kona. Highlights survive the
page being re-rendered, a reply being regenerated or a message being edited, because we
find a passage again by its words and the words around it rather than by a DOM id.

What we are building next is the shared layer, and the unit is a **space**: one question a
team is trying to settle, the evidence gathered under it, what is still unknown, and the
decision that came out. Each finding names the highlights it rests on, so a space writes
itself up as a memo in which every claim cites the exact sentence it came from, and those
citations work for a reader who has never installed Kona.

It is not an AI tool with a web feature bolted on. The same highlighting works on a paper,
documentation, Stack Overflow or any site you switch on, and one space can hold all of
them, because a question does not care where its answer came from. That widens who buys
it: a research group writing a literature review has the same problem as an engineering
team, and hardly any of their sources are AI output.

Enterprise AI plans give admins control over AI use. None of them lets a team answer "has
anyone here already worked this out?" That is what we are building.

## 8. Where do you live now, and where would the company be based after YC?

**[YOU: current city.]** After YC: San Francisco.

## 9. Explain your decision regarding location.

We will move to San Francisco for the batch and stay. Our buyers are the people rolling
out AI seats inside 50–500 person companies, and the highest concentration of them in the
world is within a few miles of each other there. **[YOU: one line on any visa or
relocation constraint, if there is one. YC would rather know now.]**

## 10. How far along are you?

The individual product works and is in daily use by its authors.

- Version 1.2.0. Builds for Chrome, Edge and Brave (MV3), for Firefox, and for Safari on
  iPhone, iPad and Mac from the same source.
- An installable Android web app, live, because Chrome on Android has no extensions.
- A desktop app for Windows, macOS and Linux, because an extension cannot sync while the
  browser is shut and we did not want that to be the product's limit.
- ~12,600 lines of TypeScript across the extension, the phone app and the desktop app,
  another ~3,800 in the Team demo, and ~3,600 of tests — 336 of them across 24 files.
  115 commits since 17 September 2026.
- Highlighting, notes, tags, one cross-site library, search from inside any page, Markdown
  export, backup and restore, deep links to the exact sentence, light and dark.
- Search that ranks by meaning as well as by word, with the meanings learned from the
  user's own library rather than from a model: BM25F over five weighted fields, fused with
  a thesaurus built from which words they keep together. 1.3ms a query over 2,000
  highlights, and no model to ship, host or send anything to.
- Sync with no server of ours. Kona writes one file into a folder the machine already
  keeps in step — Drive, Dropbox, iCloud, OneDrive, Syncthing — so the sync is something
  the user already trusts and pays for, and we make no network request at all. A folder of
  your own keeps your own machines in step; a folder you share keeps a space in step with
  a colleague, and carries **only** the spaces you tick and the passages those spaces cite.
- Everything written in a shared space is signed with a key made on the device and checked
  on the way back in, so nobody can write a reply in your name, and words that moved after
  signing are flagged rather than hidden.
- Spaces: a question, its evidence, findings, open questions, a decision, and a cited
  write-up — all on your own highlights, on your own computer.

**Spaces ship in the extension, on real highlights.** Press "Write it up" and a space
produces a memo: the question as the title, each claim carrying numbered citations, and a
source list where every citation lands on the exact sentence, checkable in one click by
somebody who has never installed Kona. Take a highlight back out and any claim resting on
it is marked as short a source rather than quietly standing on less.

This matters for how we are building the business. Spaces are the core of what we intend
to charge for, and the single-player version is finished and useful on its own — a
literature review, a migration, a decision somebody will ask you to justify. What the paid
tier adds is *other people* in the same space, and that is the part that honestly needs a
server.

That multiplayer version runs as a demo at `/team/`: a shared workspace, spaces with
comments and hybrid search, seats that move the billed quantity, and an audit log. No
server behind it and no real payment, which it says on screen. What is real in it is the
shape of the decisions — seats billed on accepted invitations only, and an entitlement
token the client caches so neither Stripe nor our own API going down can lock a paying
customer out of their own highlights. Roughly six weeks to a private beta;
`docs/enterprise.md` has the architecture and the order.

Not yet in the Chrome Web Store. **[YOU: update if you submitted.]**

## 11. How long have each of you been working on this? How much of that has been full-time?

**[YOU.]** The first commit is 17 September 2026, so the code is six and a half weeks old
as of this application. Be exact and do not inflate: how many hours a week, and whether it
has been alongside a job or studies. A wrong number that surfaces in the interview costs
more than a modest true one.

## 12. What tech stack are you using? Include AI models and AI coding tools you use.

TypeScript throughout. Preact for the UI, rendered inside a shadow root so we never touch
the host page's styles. WXT for the MV3 extension build, Vite for the phone app, Electron
for the desktop app, Vitest with happy-dom for tests. One `src/core` with no DOM in it is
shared by all of them, which is why a fifth platform cost a day rather than a quarter.

Two choices worth calling out. We paint highlights with the **CSS Custom Highlight API**,
which draws them without inserting any nodes into the page — the reason we can highlight a
live-streaming AI reply without breaking the site. And every highlight is persisted as a
quote plus its surrounding context, so re-anchoring is text-based and survives the DOM
changing underneath it. Storage is `chrome.storage.local` in the extension and IndexedDB
in the apps; links are standard URL text fragments. Signing is WebCrypto ECDSA P-256 with
trust-on-first-use, the same model as `known_hosts`: a key you already hold is never
replaced, so a name arriving a second time either checks out or is flagged.

The product contains no AI model today. Planned: embeddings for search over a user's own
highlights, which is why client-side encryption is a design constraint for us and not an
afterthought — see `docs/enterprise.md` §7.

For building it: Claude Code with Claude Opus, reviewed by hand. For the team layer:
Postgres, a small API, Stripe Billing for self-serve, SAML/OIDC and SCIM for enterprise.

## 13. Are people using your product?

**[YOU. This is the weakest answer in the application. Write the true version.]**

*If you have shipped and talked to people:* **[N]** people have it installed, from
**[where they came from]**. We have talked to **[N]** of them; the thing we hear most is
**[the actual quote]**.

*If you have not:* Not yet beyond us. It is not in the Chrome Web Store, so installing
means downloading a build, and we have not pushed it to anyone. Worth knowing: Kona makes
no network requests and has no analytics by design, so we have no telemetry to quote and
never will for the free tier — the only usage signal we can honestly report is people we
have spoken to.

## 14. Do you have revenue?

No.

## 15. If you are applying with the same idea as a previous batch, did anything change?

**[YOU: N/A if this is your first application.]**

## 16. If you have already participated or committed to participate in an incubator…

**[YOU: N/A if none.]**

## 17. Why did you pick this idea to work on? Do you have domain expertise? How do you know people need it?

**[YOU. Three short paragraphs. I cannot write these and you should not let me.]**

**What happened:** the real instance. Name the thing you lost inside a chat history and
had to rebuild.

**Why us:** your actual background. If it is "I shipped this on five platforms in six
weeks, on Windows, including a Safari extension I cannot test locally," that is a real
answer about execution speed and the repository evidences it.

**How we know others need it:** this must be people, not reasoning. Who you asked and what
they said. If the answer is nobody yet, that is also the answer to Q13, and fixing it is
worth more than rewriting anything else here.

## 18. Who are your competitors? What do you understand about your business that they don't?

Web highlighters — Glasp, Weava, Hypothes.is — and read-later tools like Readwise Reader
and MyMind. The general-purpose answer, Notion or Confluence, where someone is supposed to
stop and write it up. And the chat vendors' own saved-chat and project features.

Five things we think we understand better:

1. **AI chats are the hard case, and the valuable one.** Every generic highlighter anchors
   to the DOM and breaks the moment a reply re-renders, a message is edited or an id
   changes. We re-anchor from the text and its surroundings, which is the only reason we
   work inside chats at all. Nobody building "highlight the web" has a reason to do that
   work, and it is where all the new reading actually happens.
2. **A folder is the wrong unit.** Everyone shipping a team version of this ships shared
   folders, and folders are write-only — things go in and nobody returns. Teams do not have
   a filing problem, they have a question problem: the same thing gets worked out three
   times by three people who never find out. We share a question with its evidence, which
   can be unfinished, which is what makes it worth opening again on Monday.
3. **Capture less, not more.** The emerging enterprise pitch is to log every AI
   conversation. That is a compliance project with a security review attached. We keep only
   the spans a human deliberately saved: a far smaller data surface, far easier to get
   approved, and more useful per byte.
4. **A shared highlight works without our product.** Every one is a plain URL text
   fragment, so sending it to a colleague who has never heard of us lands them on the exact
   sentence. Sharing is distribution rather than a dead end behind a login, and it is why
   our write-ups can be checked by someone outside the company.
5. **No chat vendor will build this.** A real team uses ChatGPT *and* Claude *and* Gemini.
   None of those three will ever build the shared layer that spans the other two. The
   cross-vendor position is only available to someone who is not one of them.

## 19. How do or will you make money? How much could you make?

The line is how far a copy of Kona reaches. **Free is one device** — everything Kona does,
on the one you read on, forever, with no account. That is our distribution and the reason
anyone trusts us with the paid one. **Pro is your devices.** **Team is other people in
them.**

Two parts of that — sync, and sharing a space — are built and running today, ahead of any
billing, which we say on the pricing page rather than leave to be discovered.

| | Price | What it adds |
|---|---|---|
| Free | $0 forever | Everything Kona does on one device, local only, no account: highlights, the library, search, spaces and their write-ups, exports |
| Pro | $7 / mo | The same library on every device: sync through a folder you already have, the desktop app that keeps it in step, or nothing to arrange at all; and meaning from a model |
| Team | $14 / user / mo | Other people in your spaces: handing one over and taking it back, the discussion that comes with it, signed attribution, then live updates, permissions you can take back, vouched names, search across everyone's highlights, admin and seats |
| Enterprise | from $25 / user / mo, annual, 50-seat minimum | SSO and SCIM, audit log and export, retention and legal hold, EU data residency, DPA, SLA, self-host option |

Self-serve runs on Stripe Checkout and Billing, so cards never touch our servers and we
stay in PCI SAQ-A scope. Enterprise is an annual invoice with ACH and a PO. Entitlements
are short-lived signed tokens the client caches, so a billing outage never locks a paying
customer out of their own highlights. Full architecture in `docs/enterprise.md` §6.

**How much:** OpenAI reported roughly 5 million paying business users across ChatGPT
Business and Enterprise in August 2025, up from 3 million two months earlier, and Copilot,
Gemini for Workspace and Claude for Work sit alongside it. Taking a conservative 20M paid
enterprise AI seats by 2027 at Team pricing of $168/seat/year: 1% of those seats is $34M
ARR, 5% is $168M. Enterprise seats and the research and consulting firms — who will pay
more per seat than anyone — sit on top. And because Kona works on any page rather than
only on chats, the research segment (consultancies, equity research, academics writing a
thesis or a literature review) does not depend on AI seat growth at all. The number that
matters in the next three months is the first ten paying teams, not that table.

## 20. If you had any other ideas you considered applying with, please list them.

**[YOU, or leave blank. If Kona is the only thing you want to work on, saying exactly that
is a fine answer and a better signal than a list.]**

## 21. Have you formed ANY legal entity yet?

**[YOU.]** If no, that is normal: YC standardises everyone onto a Delaware C-corp after
acceptance, and incorporating early can create work to undo. Do not incorporate today just
to answer this.

## 22. Have you taken any investment yet?

**[YOU, presumably No.]**

## 23. Are you currently fundraising?

**[YOU, presumably No.]**

## 24. What convinced you to apply to Y Combinator?

**[YOU, two or three sentences. Specifics beat enthusiasm: a particular YC company whose
path resembles yours, a specific thing you want from the batch. "I want to be forced to
talk to users every week" is a good answer. Mention any YC event you actually attended,
and nothing you did not.]**

## 25. How did you hear about Y Combinator?

**[YOU.]**

## 26. What batch do you want to apply for?

Winter 2027.

---

## If they ask in the interview

Three things worth having an answer ready for, because they are the obvious questions and
being caught by them is avoidable.

**"Nobody is using it."** True, and it is Q13. The answer is not a defence, it is what you
did about it this week. Do not pad it.

**"Why won't OpenAI build this?"** The cross-vendor argument in Q18.5. A team uses all
three models; none of the three will build the layer that spans the other two.

**"What licence is this under?"** There is none — Kona is all rights reserved, and the
repository is public to be read. The follow-up is the sharp one: *if nobody may build it,
how does anyone try it?* The honest answer is distributed builds with terms attached, and
that is not done yet. Releases up to 1.1.0 went out under AGPL and cannot be called back.
