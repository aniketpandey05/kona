# Y Combinator — Winter 2027 application

> **Deadline: Monday 2 November 2026, 8:00pm PT.** Decision by 11 December. Batch runs
> January–March 2027, in person in San Francisco. Apply at <https://apply.ycombinator.com>.
>
> Everything below is a draft to paste in and edit. Anything marked **[FILL]** is a fact
> only you can supply — do not submit with a placeholder left in, and do not let me guess
> one for you. The business model this leans on is spec'd in
> [`docs/enterprise.md`](docs/enterprise.md).
>
> Question wording is reconstructed from public sources and may differ slightly from the
> live form. Check each one as you go.

---

## Founders

**1. Who writes code, or does other technical work on your product? Was any of it done by a non-founder?**

> **[FILL — names.]** All of it was written by the founders; no contractors, no agency, no
> non-founder contributions. Draft continues:

All of the code is ours. **[FILL: name]** writes it. There are no outside contributors and
no non-founder work in the repository — the full history is public at
<https://github.com/aniketpandey05/kona>, 60 commits over five weeks.

We build with Claude Code (Claude Opus) and review every change by hand. The test suite
exists because of it rather than in spite of it: the core logic is deliberately free of the
DOM so it can be tested without a browser, and there are 14 test files covering
re-anchoring, ordering, search, links and backups.

**2. Are you looking for a cofounder?**

> **[FILL — Yes / No.]** If you are applying solo, answer honestly and say what you are
> looking for. YC funds solo founders every batch; a solo founder who pretends the question
> is irrelevant reads worse than one who addresses it. If you are applying solo, add one
> line: what you are *not* good at, and who you want next.

---

## Company

**3. Company name**

Kona

**4. Describe what your company does in 50 characters or less.**

Pick one — all four fit, with the count:

| Option | Chars |
|---|---|
| Shared memory for what your team keeps from AI | 46 |
| Team knowledge base built from AI highlights | 44 |
| Highlight AI chats and keep what your team learns | 49 |
| One searchable library for your team's AI work | 46 |
| Where your team settles a question, with sources | 48 |
| Shared memory for everything your team reads | 44 |
| Highlight anything; keep what your team learns | 46 |

Recommended: **Shared memory for everything your team reads** — it names the buyer (team)
and the job (memory) without tying the company to one source of reading.

**5. Company URL, if any**

<https://aniketpandey05.github.io/kona/>

It goes live on the next push to `main`. Check it has deployed before you submit.

**6. Please provide a link to the product.**

- Extension source and install instructions: <https://github.com/aniketpandey05/kona>
- Phone app, live: <https://aniketpandey05.github.io/kona/app/>
- The paid tier, as a working demo: <https://aniketpandey05.github.io/kona/team/> — opens
  on the free plan, upgrades through checkout, and the workspace fills with the team's
  highlights. No server and no real payment behind it, and it says so on screen.
- Chrome Web Store: **[FILL — submit this week; listing copy is already written in
  `CHROMEWEBSTORE.md`]**

**7. What is your company going to make?**

Kona turns the passages people highlight into a team's shared memory.

Today Kona is a browser extension. You select text on any page you read — a paper,
documentation, Stack Overflow, or a ChatGPT, Claude or Gemini conversation — pick a
colour, add a note and a tag, and it joins one searchable library. Every highlight keeps a link that lands on the exact sentence it came
from, and because that link is an ordinary URL text fragment it works for someone who has
never installed Kona. Highlights survive the page being re-rendered, a reply being
regenerated or a message being edited, because we find a passage again by its words and the
words around it rather than by a DOM id.

What we are building next is the shared layer, and the unit is a **space**: one question a
team is trying to settle, the evidence gathered under it, what is still unknown, and the
decision that came out. Each finding names the highlights it rests on, so a space writes
itself up as a memo in which every claim cites the exact sentence it came from — and those
citations work for a reader who has never installed Kona.

It is not an AI tool with a web feature bolted on. The same highlighting works on a paper,
documentation, Stack Overflow or any site you switch on, and one space can hold all of
them, because a question does not care where its answer came from. That widens who buys
it: a research group writing a literature review has the same problem as an engineering
team, and hardly any of their sources are AI output.

Enterprise AI plans give admins control over AI use. None of them lets a team answer "has
anyone here already worked this out?" The free, local, accountless version stays free
forever. The shared one is what we charge for.

**8. Where do you live now, and where would the company be based after YC?**

**[FILL — current city.]** After YC: San Francisco.

**9. Explain your decision regarding location.**

> Draft, assuming you are willing to relocate. If you are not, say so plainly — YC W27 is
> in person in SF and this answer decides whether the rest gets read.

We will move to San Francisco for the batch and stay. Our buyers are the people rolling out
AI seats inside 50–500 person companies, and the highest concentration of them in the world
is within a few miles of each other there. **[FILL: add one line on any visa or relocation
constraint, if there is one — YC would rather know now.]**

---

## Progress

**10. How far along are you?**

The individual product works and is in daily use by its authors.

- Version 1.1.0. Builds for Chrome, Edge and Brave (MV3), for Firefox, and for Safari on
  iPhone, iPad and Mac from the same source.
- An installable Android web app, live, because Chrome on Android has no extensions.
- ~5,600 lines of TypeScript in the extension and phone app, another ~3,600 in the Team
  demo, 126 tests across 15 files, 71 commits since 17 September 2026.
- Highlighting, notes, tags, one cross-site library, full-text search from inside any page,
  Markdown export, backup and restore, deep links to the exact sentence, light/dark.
- Spaces: a question, its evidence, findings, open questions, a decision, and a cited
  write-up — all on your own highlights, stored on your own computer.

**Spaces ship in the extension, on your real highlights.** A space is one question, the
highlights that bear on it, the findings you draw out of them, what is still unknown, and
the decision. Press "Write it up" and it produces a memo: the question as the title, each
claim carrying numbered citations, and a source list where every citation is a link that
lands on the exact sentence — checkable in one click by somebody who has never installed
Kona. Take a highlight back out and any claim resting on it is marked as short a source
rather than quietly standing on less.

This matters for how we are building the business. Spaces are the core of what we intend
to charge for, and the single-player version of them is finished and useful on its own —
a literature review, a migration, a decision somebody will ask you to justify. What the
paid tier adds is *other people* in the same space, and that is the part that honestly
needs a server.

That multiplayer version runs as a demo at `/team/`: the free view, checkout, a shared
workspace, spaces with comments and hybrid search, seats that move the billed quantity,
and an audit log. No server behind it and no real payment, which it says on screen. What
is real in it is the shape of the decisions — seats billed on accepted invitations only,
and an entitlement token the client caches so neither Stripe nor our own API going down
can lock a paying customer out of their own highlights. Roughly six weeks to a private
beta; `docs/enterprise.md` has the architecture and the order.

Not yet in the Chrome Web Store. **[FILL — update this if you submit before Monday; the
listing copy and permission justifications are already written.]**

**11. How long have each of you been working on this? How much of that has been full-time?**

**[FILL.]** The first commit is 17 September 2026, so the code is five weeks old as of this
application. Be exact and do not inflate: say how many hours a week, and say if it has been
alongside a job or studies. YC reads "two weeks full-time" as a fact, and "six months,
on and off" as a different fact — neither is disqualifying, and a wrong number that comes
out in the interview is.

**12. What tech stack are you using? Include AI models and AI coding tools you use.**

TypeScript throughout. Preact for the UI, rendered inside a shadow root so we never touch
the host page's styles. WXT for the MV3 extension build, Vite for the phone app, Vitest with
happy-dom for tests.

Two choices worth calling out. We paint highlights with the **CSS Custom Highlight API**,
which draws them without inserting any nodes into the page — the reason we can highlight a
live-streaming AI reply without breaking the site. And every highlight is persisted as a
quote plus its surrounding context, so re-anchoring is text-based and survives the DOM
changing underneath it. Storage is `chrome.storage.local`; links are standard URL text
fragments.

The product contains no AI model today. Planned: embeddings for search over a user's own
highlights, which is why client-side encryption is a design constraint for us and not an
afterthought — see `docs/enterprise.md` §7.

For building it: Claude Code with Claude Opus, reviewed by hand. For the team layer:
Postgres, a small API, Stripe Billing for self-serve, SAML/OIDC and SCIM for enterprise.

**13. Are people using your product?**

> **This is the weakest answer in the application and the one worth fixing before Monday.**
> Write the truth. Two honest versions depending on what you do in the next five days:

*If you ship and talk to people first (do this):*

**[FILL: N]** people have it installed, from **[FILL: where they came from]**. We have
talked to **[FILL: N]** of them; the thing we hear most is **[FILL: the actual quote]**.

*If you do not:*

Not yet beyond us. It is not in the Chrome Web Store, so installing means building from
source, and we have not pushed it to anyone. Worth knowing: Kona makes no network requests
and has no analytics by design, so we have no telemetry to quote and never will for the free
tier — the only usage signal we can honestly report is people we have spoken to.

> Note the second version is an acceptable answer *once*. It is not an acceptable answer
> for a product that is five weeks old and already builds on four platforms. Twenty real
> installs and three quotes from strangers would do more for this application than any
> rewrite of any other answer here.

**14. Do you have revenue?**

No.

**15. If you are applying with the same idea as a previous batch, did anything change?**

**[FILL — N/A if this is your first application.]**

**16. If you have already participated or committed to participate in an incubator…**

**[FILL — N/A if none.]**

---

## Idea

**17. Why did you pick this idea to work on? Do you have domain expertise? How do you know people need it?**

> The honest origin story belongs here and I cannot write it for you. The structure that
> works is three short paragraphs: *what happened to you*, *why you specifically*, *what
> you saw in other people*. A draft skeleton:

**What happened:** **[FILL — the real version. Something close to: I kept losing work
inside my own chat histories. The answer I needed existed in a conversation from three
weeks ago and I could not find it, so I rebuilt it from scratch. That happened enough times
that I wrote the tool.]**

**Why us:** **[FILL — your actual relevant background. If it is "I shipped this on four
platforms in five weeks, on Windows, including a Safari extension I cannot even test
locally," that is a real answer about execution speed and it is evidenced by the repo.]**

**How we know others need it:** **[FILL — this must be people, not reasoning. Who have you
asked? What did they say? If the answer is nobody yet, spend two of the next five days
fixing that; it is also the answer to Q13.]**

**18. Who are your competitors? What do you understand about your business that they don't?**

Web highlighters — Glasp, Weava, Hypothes.is — and read-later tools like Readwise Reader
and MyMind. The general-purpose answer, Notion or Confluence, where someone is supposed to
stop and write it up. And the chat vendors' own saved-chat and project features.

Four things we think we understand better:

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
   the spans a human deliberately saved — a far smaller data surface, far easier to get
   approved, and more useful per byte.
4. **A shared highlight works without our product.** Every one is a plain URL text
   fragment, so sending it to a colleague who has never heard of us lands them on the exact
   sentence. Sharing is distribution rather than a dead end behind a login — and it is why
   our write-ups can be checked by someone outside the company.
5. **No chat vendor will build this.** A real team uses ChatGPT *and* Claude *and* Gemini.
   None of those three will ever build the shared layer that spans the other two. The
   cross-vendor position is only available to someone who is not one of them.

**19. How do or will you make money? How much could you make?**

Free for a single user, paid for teams. The local, accountless version is free
forever — it
is our distribution and the reason anyone trusts us with the paid one. Nothing is ever moved out of it into a paid tier;
paid adds the *shared* layer.

| | Price | What it adds |
|---|---|---|
| Free | $0 forever | Everything Kona does today, local only, no account |
| Pro | $7 / mo | Sync across your own devices, AI-assisted search over your own highlights |
| Team | $14 / user / mo | Shared spaces, hybrid search, comments, permissions, Slack and Notion sync, admin console |
| Enterprise | from $25 / user / mo, annual, 50-seat minimum | SSO and SCIM, audit log and export, retention and legal hold, EU data residency, DPA, SLA, self-host option |

Self-serve runs on Stripe Checkout and Billing, so cards never touch our servers and we stay
in PCI SAQ-A scope. Enterprise is an annual invoice with ACH and a PO. Entitlements are
short-lived signed tokens the client caches, so a billing outage never locks a paying
customer out of their own highlights. Full architecture in `docs/enterprise.md` §6.

**How much:** OpenAI reported roughly 5 million paying business users across ChatGPT
Business and Enterprise in August 2025, up from 3 million two months earlier, and Copilot,
Gemini for Workspace and Claude for Work sit alongside it. Taking a conservative 20M paid
enterprise AI seats by 2027 at Team pricing of $168/seat/year: 1% of those seats is $34M
ARR, 5% is $168M. Enterprise seats and the research and consulting firms, who will pay more
per seat than anyone, sit on top. And because Kona works on any page rather than only on
chats, the research segment — consultancies, equity research, academics writing a thesis
or a literature review — does not depend on AI seat growth at all. The number that matters
in the next three months is the first ten paying teams, not that table.

**20. If you had any other ideas you considered applying with, please list them.**

**[FILL — or leave blank. If Kona is the only thing you want to work on, saying exactly
that is a fine answer and a better signal than a list.]**

---

## Equity

**21. Have you formed ANY legal entity yet?**

**[FILL.]** If the answer is no, that is normal and not a problem — YC standardises
everyone onto a Delaware C-corp after acceptance, and incorporating early can create work to
undo. Do not incorporate this week just to answer this question.

**22. Have you taken any investment yet?**

**[FILL — presumably No.]**

**23. Are you currently fundraising?**

**[FILL — presumably No.]**

---

## Curious

**24. What convinced you to apply to Y Combinator?**

**[FILL — the real reason, in two or three sentences. Specifics beat enthusiasm: a
particular YC company whose path resembles yours, a specific thing you want from the batch.
"I want to be forced to talk to users every week" is a good answer. Mention any YC event
you have actually attended, and nothing you have not.]**

**25. How did you hear about Y Combinator?**

**[FILL.]**

---

## Batch Preference

**26. What batch do you want to apply for?**

Winter 2027.

---

## The 1-minute founder video

YC asks for a short video of the founders. It is not judged on production — it is judged on
whether you seem like someone to spend three months with. Phone camera, good light, one
take, no slides.

> **[FILL: name]**, **[FILL: role]**. **[FILL: one line of background.]**
>
> I built Kona because I kept losing my own work inside AI chat histories — **[FILL: the
> real, specific instance. Name the thing you lost.]**
>
> It is a browser extension that lets you highlight anything in a ChatGPT, Claude or Gemini
> conversation, or on any web page, and takes you back to the exact sentence later.
> Everything stays on your own computer. I shipped it on Chrome, Firefox, Safari and
> Android in five weeks.
>
> What I want to build is the team version: all the passages a company's people kept from
> AI, in one searchable place. Companies have given everyone an AI seat and have no idea
> what those seats produced. That is what we would spend the batch on.
>
> **[FILL: one sentence on who you are that isn't on a CV.]**

Timing: ~55 seconds read at a normal pace. Cut the background line before you cut anything
else.

## The demo video

Under three minutes, screen recording, your voice over it. No intro slide, no logo — start
inside a chat.

| Time | What is on screen | What you say |
|---|---|---|
| 0:00–0:15 | A long, real ChatGPT conversation. Scroll it. | "This is a conversation where I worked out something useful. Three weeks from now I will not be able to find it." |
| 0:15–0:45 | Select a passage, pick a colour, add a note, add a tag. | "I highlight the part that mattered, and I can put a note on it." |
| 0:45–1:10 | Open the side panel. Hover entries, click one to jump. Regenerate a reply, show the highlight survive. | "The panel lists everything on this page. And it holds when the chat changes under it — that is the hard part." |
| 1:10–1:40 | `Alt+Shift+F` from inside a different site, search, jump across chats. | "I can search everything I have ever highlighted without leaving the page I am on." |
| 1:40–2:10 | The library. Filter by site and tag. Copy a highlight link, paste it into a fresh browser with no extension. | "Every highlight has a link that lands on the exact sentence — and it works for someone who does not have Kona." |
| 2:10–2:25 | Markdown export, then the phone app. | "Export into Obsidian or Notion. And the same thing on a phone." |
| 2:25–2:40 | The Team demo on the free plan. Point at the banner. | "That is the free version, and it stays free forever. But ten highlights my colleagues kept are not in it, because they are sitting in their own browsers where nobody can search them." |
| 2:40–2:48 | Click Upgrade, set the seats, pay. | "So the shared layer is what we charge for." |
| 2:48–2:54 | Open the Postgres space: question, findings, the two sources agreeing. | "And what a team shares is a question — with the evidence under it, and what is still unknown." |
| 2:54–3:00 | Press "Write it up". Click a citation. | "Which writes itself up. Every claim links to the exact sentence it came from." |

Record the regeneration shot first; it is the one that proves the engineering and the one
most likely to need retakes.

---

## What to do before Monday 8pm PT

Ranked by effect on the application, not by effort.

1. **Get real users and talk to them.** Twenty installs and three verbatim quotes changes
   Q13, Q17 and the interview. Post it where people who live in AI chats already are —
   Hacker News Show HN, r/ChatGPT, r/ObsidianMD, the Claude and ChatGPT Discords, X. This
   is worth more than everything else on this list combined.
2. **Submit to the Chrome Web Store.** Review takes days, but "submitted, in review" is a
   materially better answer than "build it from source," and `CHROMEWEBSTORE.md` means the
   form is already filled in. Do it first, today, so the clock runs while you do the rest.
3. ~~**A landing page.**~~ Done — it is the root of the published site, with the pricing
   table on it. Push to `main` and confirm it deployed before you answer Q5.
4. **Fill every [FILL] above.** Several are two-minute answers. Q11 and Q17 are not — give
   them real thought.
5. **Record both videos.** One evening. Do not script them word for word; know the beats.
6. **Submit on Sunday, not Monday.** The form takes edits after submission, and the
   deadline-day queue is not where you want to discover a problem.

## Known weaknesses, stated plainly

So you are not surprised by them in an interview:

- **No users yet.** The biggest one. Fixable this week; see above.
- **The paid product is a demo, not a product.** No server, no real payment, no customer.
  Say so before you are asked — showing a demo and letting someone assume it ships is the
  one thing here that would genuinely damage you. What you can say instead: the shape is
  decided, it runs on the same core as the real extension, and it is about six weeks to a
  private beta, which `docs/enterprise.md` §9 lays out.
- **"Why won't OpenAI build this?"** You will be asked. The answer is the cross-vendor
  argument in Q18.5, and it is a good one. Rehearse it.
- **The licence is BSL, not open source.** Source-available, with one carve-out: nobody
  may run Kona as a hosted service. It converts to AGPL in 2030. Be ready to say why in
  one sentence — the client is a local-only extension with little worth defending, and
  the carve-out reserves the hosted workspace and nothing else, so an engineer installing
  it at work is entirely in the clear. The costs are real: some procurement teams flag
  non-OSI licences, and some developers will not contribute under one.
- **One person, five weeks.** If you are solo, Q2 is where you address it directly rather
  than hoping it goes unnoticed.
