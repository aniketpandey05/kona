# Kona: what to cut, what to build, and what to charge for

Written 3 November 2026, after you asked for a rethink rather than more features.

**First, the deadline.** YC Winter 2027 closes 8:00pm PT on 2 November, which is
9:30am IST on 3 November. That is now, or it has just gone. Nothing in this
document can reach that application. Submit `YC-ANSWERS.md` with what is built
and do not touch the product for it. Everything below is about the months after.

---

## 1. Where the effort went, and where the value is

I counted the lines in `src/core`, which is the part that is actually Kona
rather than a screen on top of it.

| What it does | Files | Lines | Share of core |
| --- | --- | --- | --- |
| Collaboration: spaces, sharing, signing, memos, people | `spaceShare` `spaces` `spaceSign` `memo` `identity` `people` | **1,655** | **39%** |
| Search | `retrieve` `tokens` `search` | 762 | 18% |
| Sync | `sync` `folder` | 511 | 12% |
| **The core loop: highlight, store, go back to the words** | `locate` `quote` `painter` `link` `textIndex` | **473** | **11%** |

Add the screens and it gets starker. `Spaces.tsx` is 1,487 lines, the largest
source file in the repository. The collaboration layer is about **3,100 lines**
in total.

So: the thing you described to me as the whole point of Kona, "highlight, store
it, and when you click that highlight it leads to the same location on that
page", is **11% of the core**. The feature nobody has asked for yet, which your
own tier plan puts behind the most expensive and hardest-to-sell plan, is
**39%** and the biggest file you have written.

That is what "we are undermining the potential" looks like when you count it.
You did not build the wrong things badly. You built the far thing well and left
the near thing thin.

## 2. The core loop has two real bugs

Both are in the 11%, and both break the exact promise you named.

**A highlight dies if one character of the page changes.** `resolveQuote` in
`src/core/quote.ts` finds your passage with `text.indexOf(quote.exact)` — an
exact match. It retries with whitespace collapsed, and that is the whole of its
tolerance. Fix a typo, update a figure, change "colour" to "color", and the
highlight is gone. Every serious annotation tool solves this with approximate
matching; yours does not have any.

**Tracking parameters split your library.** `getConversationId` in
`src/adapters/web.ts` builds the page identity as
`origin + pathname + search`. So these are three different pages to Kona:

```
example.com/article
example.com/article?utm_source=twitter
example.com/article?fbclid=abc123
```

Highlight something after clicking a link from Twitter, come back from a Google
result, and your highlights are not there. On the open web most inbound links
carry a parameter, so this fires constantly. The query string genuinely matters
on some pages (`?page=2`, `?q=`), so the fix is a known-tracking-parameter strip
rather than dropping `search` altogether.

These two are days of work, not weeks, and until they are fixed nothing else
about Kona matters, because the one thing it promises will keep quietly failing.

## 3. The open-source question, answered

You are right that tools exist. You are wrong about which part they replace.

**They replace one function.** [`dom-anchor-text-quote`](https://npmjs.com/package/dom-anchor-text-quote)
is MIT and does approximate quote matching with `diff-match-patch`. Hypothesis,
who wrote it, [moved toward `approx-string-match`](https://github.com/hypothesis/client/issues/189)
because it is much faster when there is no good match — which is the common case,
since most pages you load hold none of your highlights.
[Apache Annotator](https://annotator.apache.org/docs) is Apache 2.0 and implements
the same W3C Text Quote Selector.

Any of these drops straight into `resolveQuote` and fixes bug A. That is a
strict upgrade and you should take it. MIT and Apache-2.0 both bundle fine into
a closed, paid product as long as you keep the attribution file you already have.
**Avoid anything AGPL** — you have gone all-rights-reserved and intend to charge,
and AGPL would force you to publish your source.

**They do not replace Kona.** Hypothesis and Annotator are server-plus-sidebar
products for annotating public documents in public. None of them touches AI chat
transcripts, which is your actual wedge, and none is local-only.

**You do not need their storage.** You think open source can help you "store with
metadata". It cannot help, because you already have that and it is better than
what they offer: IndexedDB, a working sync engine, and — I checked — **zero
network calls anywhere in the product**, with `preact` as your only runtime
dependency. Adding a storage library would be a downgrade. The one thing worth
borrowing is the W3C Web Annotation **data model as a format**, so highlights are
portable and you can import somebody's Hypothesis library. That is a schema
decision, not a dependency.

Also worth knowing: `src/core/link.ts` already uses native
[text fragments](https://developer.mozilla.org/en-US/docs/Web/URI/Fragment/Text_fragments)
(`#:~:text=`), handles whole-word
trimming and addresses long passages by first and last words. That is the modern
answer and it is already right. Do not let anyone talk you into a library for it.

## 4. The tier plan, and the one thing that breaks it

Here is what you asked for:

- **Free** — extension, highlights, BM25, max 5 spaces, no sync
- **Pro** — sync across all your devices, hybrid search
- **Team** — spaces, a way to communicate, hybrid search

Your instinct is right: free is too generous. Your lever is wrong.

**The problem: there is no server, so none of it is enforceable, and Pro does not
exist.** Kona is entirely local. No accounts, no API, no network calls at all.
That means:

- A 5-space cap is a client-side `if` in code that ships to the user's machine.
- "No sync" cannot be enforced either: free users sync today through a folder
  *they* own, which costs you nothing to allow and nothing to block.
- **"Sync across all devices" — the whole of Pro — is not built.** What exists is
  a shared folder and a hand-passed file. Selling real sync means building a
  server, accounts, storage and a privacy policy that is no longer "nothing leaves
  your computer". That is the single biggest decision in your message and it is
  weeks of work, not a toggle.
- Hybrid search is **already built, already free, and costs you nothing to run**.
  Gating it means deleting working code out of the free tier.

And there is a promise in the way. `SHIPPED_AHEAD` in `src/core/plans.ts` is
printed in the extension and on the landing page today:

> Sync and shared spaces are built and working today, ahead of any billing. They
> are where the line will fall when Pro and Team exist, not something switched
> off now, and nothing you have already made stops working.

Capping free to 5 spaces breaks that sentence. With zero users that is cheap to
change — but change it deliberately, now, not quietly later.

### What I would charge for instead

Gate on **what costs you money to run**, not on what you can switch off. Same
three tiers, same spirit, but each line is defensible and enforceable:

| | Free | Pro | Team |
| --- | --- | --- | --- |
| Extension, phone app, unlimited highlights | ✓ | ✓ | ✓ |
| Unlimited local spaces | ✓ | ✓ | ✓ |
| Search: BM25 + the thesaurus learned from your library | ✓ | ✓ | ✓ |
| Sync through a folder you own | ✓ | ✓ | ✓ |
| **Hosted sync, no folder to wire up** | — | ✓ | ✓ |
| **Real semantic search (embeddings)** | — | ✓ | ✓ |
| iOS app | — | ✓ | ✓ |
| Shared spaces, threads, permissions, audit log | — | — | ✓ |

Two things to notice. **Hosted sync is the product.** It is what people will pay
for, it is what costs you money, and the server holds the data so it enforces
itself. And **"hybrid search" splits honestly**: what you have now is BM25 plus a
co-occurrence thesaurus, which is clever and local and free; *real* embeddings
need a model download or a server, so they are genuinely Pro. You get the
boundary you wanted without taking anything back.

This keeps the free tier as your best marketing — it is genuinely excellent and
costs you nothing — while the paid line falls exactly where your costs start.

**I think the cap-and-gate version is a mistake, but it is your business, not
mine. If you still want it, say so and I will build it that way.**

### The subscription toggle

Yes, do the ChatGPT-style monthly/annual toggle on the pricing section. It is
half a day. But do it *after* the tiers are settled, or we will write the
fourth copy of the wrong prices. Right now there are already three copies in
sync (`plans.ts`, `site/index.html`, `team/src/billing.ts`) and
`tests/pricing.test.ts` fails if they drift — keep that.

## 5. Payments

Stripe, on the web, and **do not** put subscriptions inside the iOS app.

Apple's standard in-app subscription rate is 30% in year one and 15% after.
Linking out to your own checkout is much cheaper, and the rules just moved:

- **US** — external purchase links currently carry **no** Apple commission, after
  the 2025 Epic injunction. On 13 August 2026 Apple
  [filed a proposal](https://www.macrumors.com/2026/08/13/app-store-fees-apple-link-outs/)
  for 15% standard / 10% subscription renewals / 5% Small Business. It is pending
  court approval.
- **EU** — under terms effective 1 October 2026, web link-outs are
  [15%, or 10% for reduced-rate developers](https://blog.funnelfox.com/apple-app-store-fees-2026-eu-dma/).

These figures come from vendor blogs and secondary reporting, and they disagree
with each other. **Check Apple's own developer terms before you set a price.**

The practical shape: people subscribe on kona's website with Stripe. The
extension, desktop app and iOS app all read the same entitlement. Your Team demo
already models this correctly — a short-lived signed entitlement that the client
trusts until it expires, so Stripe being down cannot lock a paying user out.
Build the real one the same way.

## 6. iOS

**Build a Safari Web Extension, not a separate native app.** You are already
most of the way there: `npm run build:safari` exists, `wxt.config.ts` sets
`strict_min_version: 17.2`, and `apple/package.sh` is written. Safari on iOS has
supported web extensions since iOS 15, so the same content script that
highlights on desktop highlights on your iPhone. A native app would be a second
codebase doing the same job worse.

The phone app (PWA) stays as it is: it is the library in your pocket, and the
install bug you hit is fixed as of this commit.

**One warning about your friend's account.** Publishing Kona under someone
else's Apple Developer account means the App Store listing, the subscription
revenue and the legal relationship with Apple are all theirs, not yours. If Kona
becomes a company, untangling that is painful, and Apple does not transfer apps
between accounts freely. Use it to *test* on your iPhone and iPad by all means.
Before you ship a paid app, get your own account — an Organization account if
there is a company, which needs a D-U-N-S number and takes a few weeks. Start
that early.

## 7. What I would cut

**Stop building Team.** Not delete — it is a good demo and a good YC slide, and
`#/tour` sells it well. But it is 3,100 lines serving zero users, it needs the
same server Pro needs, and selling to teams means a sales motion you do not have.
Freeze it where it is.

**Cut from the free tier's marketing, not its features.** The free tier
currently lists eight bullets including spaces and semantic search, which makes
Pro look like nothing. Keep the features, lead with two lines: *highlight
anything, find it again, never leaves your machine.* Let Pro be the one with the
long list.

## 8. Build order

1. **Fix the two core-loop bugs.** Fuzzy matching via `dom-anchor-text-quote` or
   `approx-string-match`; strip tracking parameters from the page identity. Days.
2. **Settle the tiers** using section 4, update all three copies, then add the
   monthly/annual toggle. Days.
3. **Ship the Safari extension** to your own devices and beat on it. You have an
   iPhone and an iPad; use them before the App Store sees it. Weeks.
4. **Build the server**: accounts, hosted sync, Stripe, signed entitlements. This
   is the real work and the only thing that makes Pro exist. Weeks to months.
5. **Then** reconsider Team, with users to ask.

## 9. What I need you to decide

1. **Tiers** — my version in section 4 (gate on server cost), or yours (cap free
   at 5 spaces, no sync)?
2. **The promise** — `SHIPPED_AHEAD` says nothing gets switched off. Do we change
   that sentence now, while nobody is relying on it?
3. **Hosted sync** — are you committing to running a server? Everything in Pro
   depends on it, and it ends "nothing leaves your computer" as a blanket claim.
4. **Apple account** — your own, or your friend's for now with a plan to move?

Answer 1 and 3 and I can start on the build order tomorrow.
