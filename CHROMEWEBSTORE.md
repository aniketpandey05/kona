# Chrome Web Store Listing — Kona

> Last Updated: 2026-10-23 · Version 1.1.0

Everything needed to fill in the Developer Dashboard, so nothing has to be invented at
submission time. Exclude this file from the uploaded ZIP.

## Store Listing

**Extension Name**
Kona — highlight and come back

**Short Description** (132 max)
Highlight anything you read — pages, docs, AI chats — keep it with your notes and jump
back to the exact spot.

**Detailed Description**

Kona lets you highlight what matters as you read and takes you back to it later.

Switch Kona on for any site — a paper, documentation, Stack Overflow, a blog you keep
coming back to — select some text and pick a colour. It works inside a ChatGPT, Claude or
Gemini conversation too, which is the hard case. Add a note to any highlight, tag it, and
it joins one searchable library covering everything you have ever marked.

Highlights come back where you left them. Kona finds a passage again by its words and the
words around it, so a highlight survives a page being re-rendered, a reply being
regenerated, or a chat being edited. A copy of the text is kept as well, so you still have
it even if the original is deleted.

Search finds the passage that says your thing in other words. Alongside ordinary keyword
ranking, Kona measures which words keep turning up together in your own highlights and
widens a search along those pairs — so looking for "downtime" can turn up the passage that
only ever says "cutover". It tells you which word did that. Nothing is sent anywhere to
work it out, and a library too small to have taught it anything claims nothing.

When a handful of highlights turn out to be about one question, put them in a space. A
space holds the question, the passages that bear on it, what you concluded from them and
what you still do not know — and writes it up for you, with every claim citing the exact
sentence it rests on.

A space is also a file. Send it to somebody and they get your question, your evidence and
your conclusions, with a link under each that lands on the exact sentence even without
Kona installed. They can reply to a passage where the passage is, conclude something of
their own, and send it back — and it merges into the space you already have rather than
arriving beside it. Everything each person writes is signed with a key made on their own
computer, so a space coming back is provably from the same person, and anything whose
words moved after it was signed is flagged rather than hidden.

How to use it:
1. Select some text on a supported page.
2. Pick a colour from the small bar that appears, or right-click and choose "Highlight with
Kona".
3. Add a note with the pencil button if you want one.
4. Open the panel on the right to see everything on this page, reorder it, or jump to it.
5. Press Alt+Shift+F to search every highlight you have, without leaving the page.

Everything is stored on your own computer. Kona makes no network requests of any kind:
there is no account, no server, and no analytics. It can only see the three chat sites plus
whichever sites you switch on yourself, and you can switch any of them off again.

Export your highlights as Markdown for Obsidian or Notion, or as a backup file — highlights,
spaces and all — that you can move to another computer.

Free for a single user: https://github.com/aniketpandey05/kona

**Category**
Productivity

**Single Purpose**
Highlights text on web pages and in AI chats, saves it with the user's notes, and navigates
back to the highlighted passage. Spaces, write-ups and sharing are all views over those
same saved highlights — organising and citing what the user has already marked, not a
second feature.

**Primary Language**
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `src/public/icon/128.png` |
| Screenshot 1 | 1280×800 | ✅ Ready | `docs/screenshots/web-page.png` |
| Screenshot 2 | 1280×800 | ✅ Ready | `docs/screenshots/chat-panel.png` |
| Screenshot 3 | 1280×800 | ✅ Ready | `docs/screenshots/library.png` |
| Screenshot 4 | 1280×800 | ✅ Ready | `docs/screenshots/spaces.png` |
| Screenshot 5 | 1280×800 | ✅ Ready | `docs/screenshots/space.png` |
| Small Promo Tile | 440×280 | ⬜ Not created | |

### Screenshot notes
All five are exactly 1280×800, which is one of the two sizes the store accepts; anything
else is rejected. They show the product in use rather than the popup, which is what the
review team wants to see, and between them they cover a highlight on an ordinary page,
the panel inside a chat, the library, the spaces list, and a space two people have worked
in — with the decision signed and checked.

`node scripts/screenshots.mjs` regenerates them against a running harness
(`npm run dev:harness`). Three are captured straight from the page. The other two show
the product mid-interaction, which a headless run cannot stage, so they are taken by
hand as `.jpg` and the script only centres them on a 1280×800 background at their own
scale — stretching an 800-wide capture to 1280 is the first thing anyone would notice.
The two `.jpg` files are kept as the sources for that step.

## Permissions Justification

Every entry below is phrased for a reviewer: what breaks without it.

| Permission | Why it is needed |
|---|---|
| `storage` | Holds the user's highlights, notes, tags and preferences on their own device. This is the entire contents of the product; without it nothing survives a page reload. |
| `unlimitedStorage` | A heavy reader accumulates thousands of highlights, each keeping a copy of its text so it survives the source being deleted. The default quota would silently start failing writes. |
| `activeTab` | When the toolbar button is clicked, the popup needs the current tab's address to show whether Kona is switched on for this site and to offer to switch it on. It is used only for that, only on a click. |
| `scripting` | After the user allows a new site, highlighting starts on the page they are already looking at instead of requiring a reload. |
| `contextMenus` | Adds a single "Highlight with Kona" item on a text selection, for sites whose own selection popup covers Kona's colour bar. |

| Host permission | Why it is needed |
|---|---|
| `https://*.chatgpt.com/*`, `https://chat.openai.com/*` | Reads message text to place highlights in a ChatGPT conversation and find them again on return. |
| `https://*.claude.ai/*` | The same, for Claude. |
| `https://gemini.google.com/*` | The same, for Gemini. |
| `optional_host_permissions: *://*/*` | **Never requested on install.** Only requested for one specific site at a time, when the user explicitly switches Kona on for the site they are looking at. The popup lists everything granted this way and can hand each one back. |

**Remote code:** none. All code is bundled in the package; nothing is fetched or evaluated
at runtime.

## Privacy & Data Use

**Privacy policy URL:** https://aniketpandey05.github.io/kona/privacy.html

Data-use disclosures to tick in the dashboard:

| Question | Answer |
|---|---|
| Collects personally identifiable information | No |
| Collects health information | No |
| Collects financial information | No |
| Collects authentication information | No |
| Collects personal communications | No |
| Collects location | No |
| Collects web history | No |
| Collects user activity | No |
| Collects website content | **No** — page text is read in the page and saved only on the user's own device. Nothing is transmitted. |

Three certifications to accept: data is not sold to third parties; data is not used for any
purpose unrelated to the single purpose above; data is not used to determine
creditworthiness or for lending.

## Pre-Submission Checklist

- [x] Manifest V3, no V2 APIs
- [x] Every icon size referenced exists at its true dimensions
- [x] Every permission has a specific justification above
- [x] Privacy policy written and served over HTTPS
- [x] No remote code, no analytics, no network requests
- [x] Builds clean, 285 tests pass
- [x] Screenshots captured at 1280×800
- [ ] Privacy policy URL confirmed live after Pages deploy
- [ ] $5 one-off developer registration paid
- [ ] ZIP uploaded from `.output/kona-1.2.0-chrome.zip` (`npm run zip`)

The ZIP produced by `npm run zip` contains only the built extension — no `.git`, no
`node_modules`, no source, and not this file.

## Version History

| Version | Date | Summary |
|---|---|---|
| 1.2.0 | 2026-11-01 | Spaces: a question, the highlights that bear on it, what was concluded, and a write-up citing the exact sentence behind every claim. A space can be handed over as a file and merged back with the other person's replies and conclusions in it. Search now finds the passage that says the thing in other words, learned from the user's own library. Contributions are signed with a key made on the user's computer and checked when a space comes back. Notes and tags editable from the library; backups now carry spaces as well as highlights. |
| 1.1.0 | 2026-10-23 | Colour on phone captures, with filtering to match. Backups and appearance reachable from the header rather than the foot of the list. Shared text is tidied as it is stored. A conversation link shared to the app attaches itself to everything kept from that conversation. |
| 1.0.0 | 2026-10-21 | First public release. Highlighting with notes and tags on ChatGPT, Claude, Gemini and any site the user switches on; side panel; cross-chat search; one library with Markdown and backup export; light and dark themes. |
