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

Export your highlights as Markdown for Obsidian or Notion, or as a backup file you can move
to another computer.

Free for a single user: https://github.com/aniketpandey05/kona

**Category**
Productivity

**Single Purpose**
Highlights text on web pages and in AI chats, saves it with the user's notes, and navigates
back to the highlighted passage.

**Primary Language**
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `src/public/icon/128.png` |
| Screenshot 1 | 1280×800 | 🟡 Needs resize | `docs/screenshots/chat-panel.jpg` |
| Screenshot 2 | 1280×800 | 🟡 Needs resize | `docs/screenshots/library.jpg` |
| Screenshot 3 | 1280×800 | 🟡 Needs resize | `docs/screenshots/web-page.jpg` |
| Screenshot 4 | 1280×800 | 🟡 Needs resize | `docs/screenshots/library-light.jpg` |
| Small Promo Tile | 440×280 | ⬜ Not created | |

### Screenshot notes
The existing captures show the product in use rather than the popup, which is what the
review team wants to see. They need padding out to exactly 1280×800 before upload — the
store rejects anything that is not one of its two accepted sizes.

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
- [x] Builds clean, 77 tests pass
- [ ] Screenshots padded to 1280×800
- [ ] Privacy policy URL confirmed live after Pages deploy
- [ ] $5 one-off developer registration paid
- [ ] ZIP uploaded from `.output/kona-1.1.0-chrome.zip` (`npm run zip`)

The ZIP produced by `npm run zip` contains only the built extension — no `.git`, no
`node_modules`, no source, and not this file.

## Version History

| Version | Date | Summary |
|---|---|---|
| 1.1.0 | 2026-10-23 | Colour on phone captures, with filtering to match. Backups and appearance reachable from the header rather than the foot of the list. Shared text is tidied as it is stored. A conversation link shared to the app attaches itself to everything kept from that conversation. |
| 1.0.0 | 2026-10-21 | First public release. Highlighting with notes and tags on ChatGPT, Claude, Gemini and any site the user switches on; side panel; cross-chat search; one library with Markdown and backup export; light and dark themes. |
