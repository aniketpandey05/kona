# Kona: the plan

Last changed 3 November 2026. Aiming at the next YC batch, so there is time to
build properly rather than demonstrate.

This replaces the first version of this document, which argued a tier split that
has since been decided the other way. Decisions that are made are written here
as decisions, not options.

---

## 1. What Kona is, in one line

You highlight a passage anywhere you read, and you can find it again and land on
the exact words. Everything else in the repository serves that or should be
questioned.

## 2. Where the effort went

Counted in `src/core`, which is the part that is actually Kona:

| What it does | Lines | Share |
| --- | --- | --- |
| Collaboration: spaces, sharing, signing, memos, people | **1,655** | **39%** |
| Search | 762 | 18% |
| Sync | 511 | 12% |
| **The core loop: highlight, store, return to the words** | **473** | **11%** |

With the screens added, collaboration is about 3,100 lines and `Spaces.tsx` at
1,487 is the largest source file in the repository. The thing the product is
*for* was 11% of the core and the thing nobody has asked for yet was 39%.

That is the imbalance to correct. Not by deleting the 39%, but by stopping work
on it and moving the attention to the 11%.

## 3. The core loop: fixed as of today

Both defects found in the first pass are repaired and tested.

**A highlight used to die when one character of the page changed.**
`resolveQuote` matched with `indexOf` and nothing else, so a corrected typo or a
changed figure lost the passage for good. There is now a third pass using
[`approx-string-match`](https://www.npmjs.com/package/approx-string-match)
(MIT, by the author of Hypothesis's own anchoring), allowing a passage to differ
by up to an eighth of its length. It is off by default and `locate.ts` asks every
candidate for the passage exactly before asking any of them for something close,
so an unchanged page never pays for it.

**Tracking parameters used to hide a page's highlights.** Page identity was
`origin + pathname + search`, so `/article`, `/article?utm_source=twitter` and
`/article?fbclid=abc` were three different pages. Arrive from a search result and
your highlights were not there. A named list of tracking parameters is now
stripped — never a plain word like `ref`, which is a branch on GitHub — and
what remains is sorted. Highlights already saved under the old rule are merged
onto the right page when the extension updates.

366 tests pass.

## 4. The tiers — decided

Decided by the author, against my first recommendation, and the reasoning holds:
a free tier that does everything leaves no reason to ever upgrade, and the line
is far cheaper to draw now, with no users, than to claw back later. **No code is
being deleted. The terms are being changed before anyone relies on them.**

| | Free | Pro | Team |
| --- | --- | --- | --- |
| The extension, unlimited highlights, notes, tags | ✓ | ✓ | ✓ |
| Search by word (BM25) | ✓ | ✓ | ✓ |
| Links that land on the exact sentence | ✓ | ✓ | ✓ |
| Spaces | up to 5 | unlimited | unlimited |
| **Sync across your devices** | — | ✓ | ✓ |
| **Hybrid search (word + meaning)** | — | ✓ | ✓ |
| Shared spaces, discussion, who-found-what | — | — | ✓ |

One consequence to plan around. **Even the free cap needs an account.** To know
that someone may have a sixth space you must know who they are and what they
have paid, so identity and entitlements are the first thing built, not the last.
The Team demo already models the right shape: a short-lived signed entitlement
the client caches and trusts until it expires, so neither Stripe nor our own API
being down can lock a paying user out of their own highlights. Build the real one
that way.

**`SHIPPED_AHEAD` in `src/core/plans.ts` now contradicts this.** It promises in
the extension and on the landing page that sync and spaces are not something
switched off later. That sentence has to be rewritten before the gates ship, not
after. It is the one piece of honest-copy debt this decision creates, and it is
cheap to pay today.

Also still owed: the monthly/annual toggle on the pricing section, in the style
ChatGPT uses. Do it after the tier copy is rewritten, or we will be writing the
fourth copy of the wrong prices. `tests/pricing.test.ts` fails if the site drifts
from `plans.ts`; keep it that way.

## 5. App versus extension

This is worth settling properly, because the answer decides what gets built next
and what stops being built at all.

**Only the extension can highlight.** Everything else is a way of reading the
library back. That is not a limitation to engineer around; it is the shape of the
platform.

| Surface | Can highlight | Reads the library | Why it exists |
| --- | --- | --- | --- |
| Chrome / Edge extension | ✓ | ✓ | **the product** |
| Firefox extension | ✓ | ✓ | same, without a folder picker |
| Safari extension, Mac | ✓ | ✓ | same |
| **Safari extension, iPhone and iPad** | ✓ | ✓ | **the iPhone answer — not built** |
| Phone app (PWA) | share only | ✓ | **the Android answer**: Chrome on Android has no extensions |
| Desktop app (Electron) | ✗ | ✓ | closes the folder-picker gap |

Two things fall out of this table.

**The iOS Safari extension is the biggest missing surface, and it is nearly
free.** `npm run build:safari` exists, `wxt.config.ts` already sets
`strict_min_version: 17.2`, and `apple/package.sh` is written. Safari on iOS has
supported web extensions since iOS 15, so the same content script that highlights
on a desktop highlights on an iPhone. You have an iPhone and an iPad to test on.
This is the highest-value thing on the list after accounts.

**The desktop app is on a path to redundancy, and the sync decision is what puts
it there.** Electron exists because Firefox and Safari cannot pick a sync folder,
so people on those browsers had no way to keep devices in step. Hosted sync
closes that same gap for everyone, on every browser, with nothing to download.
The moment Pro ships, the desktop app's reason for existing is gone. **Freeze it**
where it is, like Team: do not delete, do not invest.

And a nicer consequence: the surface map makes your tier split more coherent than
I first credited it. **Free is one surface. Pro is every surface, kept in step.**
That is a line a person can hold in their head, which is worth more than a line
that is merely fair.

## 6. UI

The honest diagnosis is not that the design is bad. It is that **the same screen
is drawn four times, independently.**

| File | Lines | Shared components |
| --- | --- | --- |
| `src/entrypoints/spaces/Spaces.tsx` | 1,487 | ~1 |
| `app/src/App.tsx` (phone and desktop) | 1,171 | ~2 |
| `src/entrypoints/library/Library.tsx` | 1,025 | ~2 |
| `src/ui/App.tsx` (the in-page panel) | 766 | 0 |

Four lists of highlights, 4,449 lines, essentially no shared code. That is why
they do not look like one product, and it is why Spaces felt unusable: it is the
biggest of the four and got the least attention.

Three decisions:

**One list, four mounts.** You have already proved the pattern works —
`app/src/App.tsx` serves both the phone and the desktop from one component, with
the difference passed in as a `folders` prop. Do that again for the extension's
library and the in-page panel. Every hour spent here pays four times.

**The in-page panel is the face of the product.** It is where a user actually
spends time, and it is the smallest and least considered of the four. It should
be the best thing you own, not the thinnest.

**Shrink Spaces rather than redesign it.** 1,487 lines for a feature that now
sits behind the top tier is the wrong investment. A space is a question, its
highlights, and the write-up. Build that and stop.

The principle to measure against: *capture in one gesture, retrieve in one
search*. A screen that is neither gets secondary effort, and Spaces is a screen
that is neither.

## 7. Open source: where it helps

You want to lean on it more, and you should — but on the parts that are solved
problems, never on the parts that are the product. Nobody else can tell you what
a space is or how the panel should feel. Plenty of people have already solved
approximate string matching.

**Already right, do not touch.** `painter.ts` uses the CSS Custom Highlight API,
so nothing is inserted into the page's DOM and a site's re-render cannot break a
highlight. `link.ts` uses native text fragments. Both are the modern answer
already.

**Taken today.** `approx-string-match`, MIT — fuzzy anchoring, section 3.

**Worth taking next:**

- **[`@mozilla/readability`](https://www.npmjs.com/package/@mozilla/readability)**,
  Apache-2.0, 0.6.0 — the article extractor behind Firefox Reader Mode. It would
  replace the selector guess in `src/adapters/web.ts`
  (`'main, article, [role="main"], #content, .post, body'`), which is crude and
  decides what counts as the page's text — and therefore how reliably a highlight
  anchors on a messy site.
- **[`@huggingface/transformers`](https://www.npmjs.com/package/@huggingface/transformers)**,
  Apache-2.0, 4.3.2, with `all-MiniLM-L6-v2` (also Apache-2.0) — **this is how
  paid hybrid search stays private.** Embeddings normally mean a server, which
  would end "nothing leaves your computer". This runs the model on the device, in
  WASM or WebGPU; a published benchmark put one embedding at about 507ms on WASM
  and 46ms on WebGPU. So Pro can have real semantic search *and* keep the privacy
  claim, which no competitor with a server can say.
- **[`dexie`](https://www.npmjs.com/package/dexie)**, Apache-2.0 — later. The
  comment at the top of `store.ts` already says IndexedDB is where this goes when
  the library gets slow. This is what makes that move small.

All three are Apache-2.0, which bundles into a closed paid product as long as the
attribution file you already generate keeps listing them. **Nothing AGPL** — it
would force you to publish your source.

## 8. Build order

1. ~~Fix the core loop~~ — done, section 3.
2. **Accounts and entitlements.** Everything else depends on it, including the
   free cap. Signed, short-lived, cached by the client.
3. **Rewrite the tier copy**, `SHIPPED_AHEAD` included, then the pricing toggle.
4. **Hosted sync.** This is Pro, and the real work.
5. **Stripe**, on the web. Not inside the iOS app: Apple's own rate is 30% in
   year one. Link out instead — currently no US commission after the 2025 Epic
   injunction, though Apple has
   [proposed 15/10/5%](https://www.macrumors.com/2026/08/13/app-store-fees-apple-link-outs/)
   pending court approval, and the EU charges
   [15% or 10%](https://blog.funnelfox.com/apple-app-store-fees-2026-eu-dma/) on
   link-outs as of 1 October 2026. These figures are from vendor blogs and
   disagree with each other — read Apple's own terms before setting a price.
6. **The iOS Safari extension**, tested hard on your own devices.
7. **Local embeddings** for Pro's hybrid search.
8. **One list component**, four mounts.
9. Reconsider Team, with users to ask.

Frozen, not deleted: the Electron desktop app, and Team.

## 9. Still open

- **Apple account.** Publishing under your friend's account means the listing,
  the revenue and the legal relationship with Apple are theirs. Fine for testing
  on your iPhone and iPad. Before a paid app ships, get your own — an
  Organization account needs a D-U-N-S number and takes weeks, so start early.
- **Sync host.** Where does hosted sync run, and what is the privacy claim once
  it does? "Nothing leaves your computer" becomes "nothing leaves your computer
  unless you turn sync on", and that sentence needs writing carefully because it
  is the thing people like most about Kona.
