# What is left, and what shipping takes

Written after the rebuild, as an honest account rather than a plan that flatters
anybody. `BUILD-LOG.md` says what was done; this says what is not, and what each
remaining thing actually costs.

**The short version.** Kona can ship as a Free product. Everything a Free user
touches is built, rebuilt from the decisions, and under 484 tests. What stands
between it and the Chrome Web Store is not code — it is a domain, a $5
registration, and new screenshots. The paid half does not exist at all, and is
the larger half of the work.

---

## 1. Ship Free. This is the near thing.

**Free is: the extension, on one device, no account, nothing leaving the
machine.** That is what is built.

| Needed | Cost | Blocked on |
| --- | --- | --- |
| **A domain** | an afternoon | nothing but choosing one |
| Chrome developer registration | $5, once | nothing |
| New screenshots | half a day | the domain, so the library has a real address |
| Listing copy re-read | an hour | nothing |

**The domain is the one real blocker, and it is small.** `kona.example` is a
placeholder. One constant — `KONA_ORIGINS` in `src/design/tokens.json` — feeds
the manifest's content script, the bridge, and the Library button, so it is one
edit and a rebuild. Until it is real:

- the Library button in the panel and the popup opens a page that does not exist
- the bridge matches an origin nobody can visit, so the web app cannot read the
  extension's storage on the same machine
- the privacy policy has no URL to give the store

**Screenshots are not optional and not quick.** Every one in `docs/screenshots`
shows the interface that was just replaced. The store listing shows them at
1280×800 and a reviewer compares them to what installs.

**What a reviewer will actually check**, and where it now stands: the manifest
asks for no host permissions at all, every permission in it has a justification
written for a reviewer, there is no remote code and no network request, and the
privacy policy matches what the code stores. That audit was done; the listing
was wrong in four places and is now not.

---

## 2. iOS. Needs a Mac, and nothing else is in the way.

The Safari extension **builds today** — `npm run build:safari` runs in CI on
every push, and the same source produces it. What needs a Mac is the wrap:
`apple/package.sh` drives Xcode's packager, which does not exist on Windows.

| Needed | Cost | Note |
| --- | --- | --- |
| A Mac with Xcode | — | borrowed is enough for the first run |
| First run of `apple/package.sh` | a day, allowing for it failing | **it has never been run**; expect to correct the generated target's `Resources` path, which the script checks for by name |
| Signing to your own device | an hour | free Apple ID; the signature **expires after seven days** |
| TestFlight or App Store | $99/year | Apple Developer Program |

**And one thing that needs a phone rather than a decision.** 22 settled the
selection bar as fixed to the bottom of the screen, and left one question open
that a desk cannot answer: *if tapping the bar clears the selection, every
in-page option dies and capture becomes the share route on both platforms.*
`SELECTION_SETTLE_MS` is the number to turn. This is the single largest
unknown in the product and it costs one afternoon with an iPhone to close.

---

## 3. The paid half. This does not exist.

Nothing here is started. The order below is the order it has to happen in,
because each rung needs the one under it.

**An account.** Sign-in by emailed link, in the web app, never in the
extension. Needed before anything else, and it is the thing 5 says is *for
keeping devices in step and nothing else* — so it must be possible to use Kona
for months and then make one without losing anything, which is a migration
path, not just a login form.

**Hosted sync, encrypted on the device.** The hard one, and the one with no
shortcut: the server stores what it cannot read, with a key that lives on your
devices and in one recovery phrase. 21 settled what happens when two devices
disagree. This is weeks, and it is where the promise in 6 is either kept or
quietly broken.

**Payment.** Stripe on the web, not Apple's in-app purchase. Pro is $30 a year
or $3 a month. Mostly plumbing once there is an account to attach it to.

**Hybrid search.** Embeddings computed on the device, with the model fetched
once after signing in. Affordable because you only ever search your own
library.

**Team.** Frozen, and should stay frozen until Pro has users. It needs the same
server Pro needs, and 3d says it folds into the one web app rather than
standing beside it — which is still only a decision. `team/` is a working demo
sharing nothing with the rest of the code.

---

## 4. Smaller things, honestly listed

- **`conversationId` is still what the code calls a page.** It is the middle of
  every storage key, so it is a migration and not a rename. It wants its own
  session with the migration tested against a library made before it.
- **`team/` still carries its own `memo.ts`, `types.ts` and `store.ts`** — the
  duplication 3d objects to.
- **The landing page still decides its own colours**, the last stylesheet
  outside the token file apart from `team/`.
- **Nothing has been run on a real iPhone, a real Mac, or a desktop build** of
  the rebuilt library.
- **The Browser pane could not test everything.** Where layout or clicking was
  needed and the pane was hidden, behaviour was pinned with tests instead; that
  is in `BUILD-LOG.md` entry by entry.

---

## 5. What I would do, in order

1. **Pick a domain and deploy the web app.** It unblocks the bridge, the
   Library button, the privacy policy URL and the screenshots, and it is an
   afternoon.
2. **Re-take the screenshots**, then submit to the Chrome Web Store as a Free
   product. $5 and a review wait.
3. **Borrow a Mac for a day** and get `apple/package.sh` to run once. Until it
   has run, iOS is an unknown rather than a task.
4. **Spend an afternoon with an iPhone** on the open question in 22. It can
   change the design of capture on both phone platforms, so it is worth
   knowing before anything is built on top of it.
5. **Then the account**, and only then sync.

Free first is not a compromise. 25 says the free tier is the adoption lever and
the upgrade is offered where the limit is felt — which needs people to be using
it and feeling the limit. Shipping Free is how the paid half gets designed
against something real instead of against a guess.
