# Kona for Teams — product, pricing and billing

> Draft 2026-10-28. This is a **design document, not shipped code**. Nothing described
> here runs against a server, and no payment in it is real.
>
> There is a working demo of the Team tier in [`team/`](../team) — `npm run dev:team` —
> which walks the whole thing: the free view, checkout, the shared workspace, research
> spaces with cited write-ups, seats and the audit log.
>
> One caveat worth keeping straight. The demo's search is genuinely hybrid — it fuses two
> rankings — but only the lexical half is the real thing. That half is the extension's own
> `searchMarks`, unchanged. The meaning half stands in for embeddings by widening each
> word to the words that mean the same thing in that dataset, and it says on screen which
> ones it used. The fusion is the same either way; see §7 for what ships. It is built on the same `src/core` as the extension, so the highlights in
> it behave the way real ones do. [Build order](#9-build-order) says what gets built after.

## 1. The gap we are selling into

Individual AI use is solved. Team AI **memory** is not.

Every employee with a ChatGPT, Claude or Gemini seat produces a dozen genuinely useful
outputs a week: the prompt that finally worked, the analysis that settled an argument, the
migration plan, the clause that mattered. All of it lands in a private, per-person chat
history. It is not searchable by anyone else, not linkable, and gone when the chat is
deleted or the person leaves.

Enterprise AI plans solve a different problem. ChatGPT Enterprise, Claude for Work and
Gemini for Workspace give admins **control** — SSO, retention windows, a promise not to
train on your data. None of them answers the question a team actually asks:

> *Has anyone here already worked this out?*

The existing answer is "write it up in Confluence." That costs a context switch, so it
does not happen.

## 2. The wedge: a highlight is a curation signal

When someone highlights a passage they are saying *this part was worth keeping* — at the
moment of reading, for free, with no form to fill in. In a world of unlimited generated
text, human judgement about which part mattered is the scarce input.

Three properties make it a business rather than a feature:

1. **Capture costs one click**, inside the tool where the work happened. No new habit.
2. **Every highlight is a verifiable pointer.** Kona stores each one as a URL text
   fragment, so the link lands on the exact sentence and works for someone who has never
   installed Kona. Shared links are both the proof and the distribution.
3. **We capture less, not more.** We never need to ingest whole conversations — only the
   spans a human chose to keep.

Point 3 is the enterprise unlock. "Log every AI conversation your staff has" is a
compliance project with a security review attached. "Keep the passages your staff
deliberately saved" is a far smaller data surface, far easier to get approved, and more
useful per byte stored.

### What a team shares is not a folder

A shared folder of highlights is still the wrong unit. Folders are write-only: things go
in, nobody goes back. Teams do not have a filing problem — they have a *question* problem,
and the same question gets worked out three times by three people who never find out.

So the thing a team shares is a **space**: one question, the evidence gathered under it,
what is still unknown, and the decision that came out. Each piece of evidence is an
ordinary Kona highlight, which means two things fall out for free:

- **A claim can be checked.** Every finding in a space knows which highlights it rests on,
  and every highlight lands on the exact sentence it came from. Writing the space up
  produces a cited memo, and the citations work for a reader who has never installed Kona.
- **A space can be unfinished.** Two open questions is a reason to come back next week.
  That is the difference between something a team uses and something a team filled in once.

A space with no question is simply a shelf — a prompt library, the onboarding set. Same
object, so there is only one thing to explain.

## 3. Who buys

| | Who | Why they care | Buyer |
|---|---|---|---|
| **ICP 1** | 50–500 person tech companies that have rolled out AI seats | No visibility into what those seats produce; the same problem gets solved five times | CTO / Head of Engineering / Head of Ops |
| **ICP 2** | Consultancies and research shops — law, strategy, equity research — and academics writing a thesis or literature review | Citation to an exact source span *is* the work product, and most of the sources are not AI output at all | Practice lead / principal investigator |
| **ICP 3** | Regulated organisations with an AI policy | Need an evidence trail of which AI output was actually relied on for a decision | Compliance / AI governance lead |

ICP 1 is the self-serve wedge. ICP 2 pays the most per seat. ICP 3 is what makes the
audit-log work worth building.

## 4. Use cases, in the order customers reach for them

1. **A prompt and pattern library that curates itself.** The prompts and outputs people
   kept, tagged, searchable, with the chat they came from.
2. **Onboarding.** A new hire reads the team's actual reasoning instead of the wiki page
   nobody updated.
3. **Research with citations.** A space is written up as a memo where every claim carries
   the highlights it rests on, each landing on the exact sentence. For a consultancy that
   *is* the deliverable; for everyone else it is the difference between a conclusion and
   an assertion.
4. **AI governance.** An append-only record of which AI outputs were relied on, by whom,
   when — the thing an internal AI policy asks for and nobody can currently produce.
5. **Market and competitive intel.** A standing space per competitor or segment, filled
   by whoever happened to be reading, with the disagreements marked rather than averaged
   away.

## 5. Tiers

One rule governs this table: **nothing moves out of Free into a paid tier.** Paid adds the
*shared* layer. The free, local, accountless version stays complete forever — it is the
distribution engine and the reason anyone trusts us with the paid one.

| | Free | Pro | Team | Enterprise |
|---|---|---|---|---|
| **Price** | $0 forever | $7 / mo | $14 / user / mo | from $25 / user / mo, annual, 50-seat min |
| Unlimited highlights, notes, tags | yes | yes | yes | yes |
| All exports (Markdown, backup) | yes | yes | yes | yes |
| Local-only, no account | yes | — | — | — |
| Sync across your own devices | | yes | yes | yes |
| Hybrid search over your own highlights | | yes | yes | yes |
| Hybrid search across the whole workspace | | | yes | yes |
| Shared spaces: question, evidence, decision | | | yes | yes |
| Write-ups with every claim cited | | | yes | yes |
| Comments and permissions | | | yes | yes |
| Slack / Notion / Obsidian sync | | | yes | yes |
| Admin console, seat management | | | yes | yes |
| SSO (SAML / OIDC), SCIM provisioning | | | | yes |
| Audit log + export, retention, legal hold | | | | yes |
| Dedicated search index, inside the residency region | | | | yes |
| Data residency (US / EU), DPA, SLA | | | | yes |
| Self-host / VPC deployment | | | | yes |

Annual billing at two months free. Non-profits and students free on Team.

## 6. Billing architecture

Self-serve (Pro and Team) runs entirely on **Stripe**, so we build as little of this as
possible.

**Checkout and management**

- **Stripe Checkout**, hosted. Card details never touch our servers, which keeps us in
  PCI **SAQ-A** scope — the lightest there is, and the answer to the first question on
  every security questionnaire.
- **Stripe Billing** per-seat subscriptions; subscription `quantity` tracks active seats
  and Stripe handles proration on seat changes.
- **Stripe Customer Portal** for cards, invoices, plan changes and cancellation. No
  billing UI to build or maintain.
- **Stripe Tax** for VAT, GST and US sales tax.

**Entitlements — the part worth getting right**

The extension never talks to Stripe. It fetches a short-lived signed **entitlement token**
and caches it:

```
Stripe --webhook--> billing service --writes--> entitlements table
                                                (tenant, plan, seats,
                                                 status, period_end)
                                                        |
extension --GET /entitlement--> API --signs--> JWT (24h, asymmetric key)
          <---------------------------------------------+
```

- Webhooks consumed: `checkout.session.completed`,
  `customer.subscription.created|updated|deleted`, `invoice.paid`,
  `invoice.payment_failed`.
- Signature verified on every call; handling is **idempotent on event id**, because Stripe
  retries. A nightly reconciliation treats Stripe as the source of truth.
- The 24-hour token means a Stripe or API outage never locks a paying user out of their
  own highlights.
- Failed payment: 14-day grace, then the shared layer goes read-only. **We never delete
  anyone's data for non-payment** — the local copy is theirs regardless.

**Seats**

- Self-serve: an admin adds or removes members; we update subscription `quantity`.
- Enterprise: **SCIM** provisioning is the source of truth for seat count, reconciled to
  the contract annually rather than metered monthly.

**Enterprise invoicing**

- Annual contract, **Stripe Invoicing** with ACH or wire, PO number on the invoice,
  net-30/60. No credit card.
- Procurement will ask for: W-9, DPA, sub-processor list, security questionnaire, SOC 2
  report, certificate of insurance. Have all of them on one page before the first call.

**One geography note.** YC standardises on a Delaware C-corp, which means billing in USD
through Stripe US — the simple path. If domestic INR billing is ever needed, that is
Razorpay or Stripe India under the RBI e-mandate rules, and it should stay off the
critical path until a customer actually requires it.

## 7. Security posture

What a 200-person company's security review will ask, and the answer we want to have:

- **In transit and at rest.** TLS 1.2+ everywhere; AES-256 at rest with per-tenant key
  separation.
- **Client-side encryption for private highlights.** Highlights a user has not shared are
  encrypted with a key the server never holds, so we cannot read them. This is a real
  differentiator and the only version consistent with what the free tier promises. The
  honest trade-off: it breaks server-side search over private highlights, so that search
  runs on the client or against an encrypted index. Shared spaces are
  server-readable by necessity.
- **Search is hybrid, not keyword.** Lexical retrieval over the words actually written,
  vector retrieval over an embedding of each highlight, and the two rankings fused with
  reciprocal rank fusion. Keyword alone misses the passage that says the thing in other
  words; vectors alone drift off what was typed. Fusing them keeps an exact match at the
  top and still surfaces the one that shares no vocabulary with the query — which is the
  difference between a team's search and Ctrl-F, and the reason this is worth charging
  for. Each tenant gets its own index inside its residency region, and private highlights
  are indexed on the client, for the reason in the bullet above.
- **Least privilege at the browser.** Unchanged from today: Kona can only see the three
  chat sites plus whatever sites the user switches on, and any of them can be switched
  off again.
- **Audit log.** Append-only, exportable, covering highlight creation, sharing,
  membership and admin actions.
- **Compliance path.** SOC 2 Type II (start the observation window early — it is the long
  pole), GDPR with a signed DPA and published sub-processors, EU data residency, an annual
  third-party penetration test, a published vulnerability disclosure policy. ISO 27001
  only when a deal requires it.

## 8. Licensing — decided 2026-10-28

Everything in this repository is **Business Source License 1.1**. Any use is permitted,
commercial use included, with one carve-out: you may not offer Kona to third parties as a
hosted or managed service. It converts to AGPL-3.0-or-later on 2030-10-28, and each
version converts on its own fourth birthday whichever comes first.

The reasoning, and what still has to be watched:

1. **The carve-out is the whole point.** The client is a browser extension that stores
   everything locally and makes no network requests; there is little in it worth
   defending. The thing worth defending is the hosted workspace, and BSL reserves exactly
   that and nothing else. An engineer installing Kona at work — our actual user — is
   fully in the clear, which a non-commercial licence would not have allowed.
2. **The server is covered by the same carve-out**, so it no longer has to be separately
   proprietary. If that changes, the rule stands: never ship the server under a licence
   that lets a customer self-host it for free.
3. **BSL is not open source**, and nothing we publish should say it is. It is
   source-available. The landing page, the store listing and the application have all
   been reworded already.
4. **A CLA is now more necessary, not less.** Selling commercial exceptions and setting
   Change Dates both require owning the copyright outright. Today one person holds all
   60 commits. The first outside contribution without a CLA ends that permanently.
5. **Releases up to 1.1.0 remain AGPL-3.0-or-later.** A licence already granted cannot be
   withdrawn — not by deleting a file, and not because nobody has forked yet. Anyone who
   took a copy under those terms keeps them. The repository had 0 forks when this changed,
   so the practical exposure is nil, but the principle is worth not misremembering.

## 9. Build order

Phase 0 is done and is all the YC application needs. Nothing from phase 1 on exists.

| Phase | What | Rough effort |
|---|---|---|
| **0 — done** | This document, and the working demo in `team/`: free view, pricing, checkout, shared workspace, spaces with findings and cited write-ups, seats, admin and audit log. No server, no billing code, no real payment. | done |
| **1 — private beta** | Accounts, tenants, shared spaces. Stripe Checkout + Portal, webhooks, entitlement tokens. Postgres and an API, TLS, encryption at rest. | 4–6 weeks |
| **2 — Team GA** | Spaces with findings, open questions and generated write-ups. Permissions, comments, Slack/Notion sync, admin console, seat management, audit log v1. | 6–10 weeks |
| **3 — Enterprise** | SAML/OIDC SSO, SCIM, audit log export, retention and legal hold, EU residency, SOC 2 observation window open, pen test, VDP, DPA. | 3–6 months |
| **4 — on demand** | Self-host / VPC deployment, for the minority who require it. | as sold |

## 10. How big this gets

Bottom-up, from the only public anchor worth citing: OpenAI reported roughly **5 million
paying business users** across ChatGPT Business and Enterprise in August 2025, up from
3 million two months earlier. Microsoft 365 Copilot, Gemini for Workspace and Claude for
Work sit alongside it, and every one of those seats has the same problem.

Taking a deliberately conservative **20M paid enterprise AI-assistant seats by 2027**, at
Team pricing of $14/seat/month — $168/seat/year:

| Share of seats | Seats | ARR |
|---|---|---|
| 0.1% | 20,000 | $3.4M |
| 1% | 200,000 | $33.6M |
| 5% | 1,000,000 | $168M |

Enterprise seats at $25+ and the ICP 2 consultancies, who will pay more per seat than
anyone, sit on top of that. These are estimates built from one dated public figure, not
forecasts — the number that matters in the next three months is the first ten paying
teams, not this table.
