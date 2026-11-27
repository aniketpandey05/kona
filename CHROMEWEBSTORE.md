# Chrome Web Store listing for Kona

> Last updated: 2026-11-27 · Version 1.4.5

Everything needed to fill in the Developer Dashboard, so nothing has to be invented at
submission time. Exclude this file from the uploaded ZIP.

**Read this before copying anything out of it.** Everything below has been checked
against the build rather than against the last version of this file. What was
wrong, and is worth knowing about because it is the shape of mistake that gets a
listing pulled rather than rejected: the description told the reviewer to press a
shortcut that does not exist, said a space writes up a document for you when 20 took
the write-up out of the product, and said Kona can see the three AI chats, which is the
opposite of what the manifest does and would have been a false statement about
permissions. The data-use section held two tables that answered the same questions the
other way round. All four are fixed here.

## What to send, and what it is for

| Send | Where it is | What it is for |
| --- | --- | --- |
| `kona-1.4.5-chrome.zip` | the [v1.4.5 release](https://github.com/aniketpandey05/kona/releases/tag/v1.4.5), or `.output/` after `npm run zip` | The package itself. Prefer the release copy: CI built it from the tagged commit, so it is the one the source can be checked against |
| This file | `CHROMEWEBSTORE.md` | Every box on the submission form, already written |
| Five screenshots | `docs/screenshots/*.png` | `web-page`, `chat-panel`, `library`, `spaces`, `space`. All 1280×800, which is one of the two sizes the store takes |
| Two tiles | `docs/screenshots/` | `promo-tile.png` at 440×280, and `marquee.png` at 1400×560 for the carousel |
| The icon | `src/public/icon/128.png` | 128×128, and already inside the ZIP as well |

**Three things they will need from you rather than from a file.** A Google
account with the $5 one-off developer registration paid; the privacy policy
live at `https://aniketpandey05.github.io/kona/privacy.html`, which is served
by GitHub Pages from this repository; and a decision about whose account the
listing lives on, because the account that publishes it owns it and moving a
published extension between accounts is not a thing the store does readily.

**The one step that is easy to skip.** The reviewer instructions below are not
optional for this extension. Kona arrives allowed on no site at all, so a
reviewer who installs it and opens a page sees nothing happen, and the honest
conclusion from that is that it does not work. Paste them into the box.

## Store Listing

**Extension Name**
Kona, highlight and come back

**Short Description** (132 max)
Highlight anything you read, pages, docs, AI chats, keep it with your notes and jump
back to the exact spot.

**Detailed Description**

Kona lets you highlight what matters as you read and takes you back to it later.

Switch Kona on for any site, a paper, documentation, Stack Overflow, a blog you keep
coming back to, select some text and pick a colour. It works inside a ChatGPT, Claude or
Gemini conversation too, which is the hard case. Kona arrives able to read nothing at
all: you allow one site at a time, from the toolbar, while standing on it. Add a note to any highlight, tag it, and
it joins one searchable library covering everything you have ever marked.

Highlights come back where you left them. Kona finds a passage again by its words and the
words around it, so a highlight survives a page being re-rendered, a reply being
regenerated, or a chat being edited. A copy of the text is kept as well, so you still have
it even if the original is deleted.

Search finds the passage that says your thing in other words. Alongside ordinary keyword
ranking, Kona measures which words keep turning up together in your own highlights and
widens a search along those pairs, so looking for "downtime" can turn up the passage that
only ever says "cutover". It tells you which word did that. Nothing is sent anywhere to
work it out, and a library too small to have taught it anything claims nothing.

Colour is yours. Four pens to start with, and you can mix your own at any hue and any
strength. Retiring a colour never repaints what you already marked with it, and that
colour stays something you can filter your library by.

A picture can be a highlight too. Right-click a chart or a diagram and Kona keeps its
own copy, so opening your library later never fetches anything from the site it came
from. The caption or the words nearest it are what you find it by.

A passage in a PDF can be kept as well, by right-clicking it. Nothing of Kona can run
inside the browser's own PDF viewer, so there is no mark drawn on the page and no way
back to the exact words, and Kona says so rather than pretending.

When a handful of highlights turn out to be about one question, put them in a space. A
space holds the question, the passages that bear on it, what you concluded from them and
what is still open, with every conclusion citing the exact sentence it rests on.

A space is also a file. Send it to somebody and they get your question, your evidence and
your conclusions, with a link under each that lands on the exact sentence even without
Kona installed. They can reply to a passage where the passage is, conclude something of
their own, and send it back, and it merges into the space you already have rather than
arriving beside it. Everything each person writes is signed with a key made on their own
computer, so a space coming back is provably from the same person, and anything whose
words moved after it was signed is flagged rather than hidden.

How to use it:
1. Click the Kona icon and switch it on for the site you are reading. Nothing happens
before this: Kona arrives allowed on nothing at all.
2. Select some text. Pick a colour from the small bar that appears, or right-click and
choose "Highlight with Kona".
3. Add a note with the pencil button if you want one.
4. Open the panel from the mark at the bottom right to see everything on this page,
reorder it, or jump back to any of it.
5. Open the library from the panel for everything you have ever kept, across every site.

Selecting text is not a request to highlight it, so press Escape and the bar goes away
and leaves your selection alone. If you want Kona quiet for longer, there is a switch in
the popup: off means no bar and nothing painted, on every site at once. Nothing is
deleted either way, and your highlights come back the moment you turn it back on.

Everything is stored on your own computer. Kona makes no network requests of any kind:
there is no account, no server, and no analytics. It arrives able to read no site
whatsoever, the AI chats included, and reads only the sites you switch on one at a time.
Your browser's own extensions page lists every site you have allowed and takes any of
them back.

Export your highlights as Markdown for Obsidian or Notion, or as a backup file, highlights,
spaces and all; that you can move to another computer. Or point Kona at a folder your
machine already keeps in sync and it will keep the library there: your own folder keeps
your own computers in step, and a folder you share with somebody keeps a space in step
with them. A shared folder only ever carries the spaces you tick and the passages they
cite; nothing else in your library is written to it. On browsers without a folder
picker the same file can be opened and put back by hand. This still makes no network
request: Kona writes a file, and the sync client you already use carries it.

Free on the device you read on: https://github.com/aniketpandey05/kona

**Category**
Productivity

**Single Purpose**
Highlights text on web pages and in AI chats, saves it with the user's notes, and navigates
back to the highlighted passage. Spaces and sharing are views over those
same saved highlights, organising and citing what the user has already marked, not a
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
| Small Promo Tile | 440×280 | ✅ Ready | `docs/screenshots/promo-tile.png` |
| Marquee | 1400×560 | ✅ Ready | `docs/screenshots/marquee.png` |
| Promo video | a YouTube link | ⬜ Needs recording | see below |

### Screenshot notes
All five are exactly 1280×800, which is one of the two sizes the store accepts; anything
else is rejected. They show the product in use rather than the popup, which is what the
review team wants to see, and between them they cover a highlight on an ordinary page,
the panel inside a chat, the library, the spaces list, and a space two people have worked
in, with the decision signed and checked.

Both tiles are drawn the same way, in `harness/tile.html` and
`harness/marquee.html`, from the real mark and the real tokens, so they cannot
drift away from the product the way an image exported once from a design tool
does. Both are captured at exactly their size by the same script. The marquee
is optional and is only used if the store features Kona in the carousel on its
home page, which is a thing a listing without one cannot be picked for.

### The video

**The store takes a YouTube link, not a file.** So the recording and the
upload are a person's job, and the account the video lives on is a decision
worth making on purpose, because it is on the listing for as long as the
listing is.

What is here is the part that can be made repeatable: `harness/shot-page.html?demo`
runs the whole story on its own, at a pace somebody can watch, using the real
extension against a real page. Open it, hit record, and it does the same take
every time without depending on anybody's mouse hand. Record at 1280×800 and
you have the store's own screenshot size.

The beats, in order, about twenty seconds end to end:

| | |
| --- | --- |
| 0:00 | An ordinary article. Nothing of Kona on screen except the resting mark |
| 0:02 | A sentence is selected. The bar appears beside it |
| 0:04 | A colour is picked. The sentence is marked, and the resting mark counts up |
| 0:06 | Twice more, in two more colours, because the palette is the thing people ask about first |
| 0:13 | The panel opens. It lists what was kept on this page |
| 0:15 | The page is scrolled away to the end of the article |
| 0:18 | A row in the panel is clicked, and the page goes back to the exact words and flashes them |

That last beat is the product and is the only one worth protecting if the
video has to be cut shorter. Everything before it is setup.

If you narrate it, the one line that matters is the one the listing opens
with: *highlight anything you read, and land back on the exact words.*

`node scripts/screenshots.mjs` regenerates them against a running harness
(`npm run dev:harness`). Three are captured straight from the page. The other two show
the product mid-interaction, which a headless run cannot stage, so they are taken by
hand as `.jpg` and the script only centres them on a 1280×800 background at their own
scale, stretching an 800-wide capture to 1280 is the first thing anyone would notice.
The two `.jpg` files are kept as the sources for that step.

## Permissions Justification

Every entry below is phrased for a reviewer: what breaks without it.

Folder sync adds no permission. `showDirectoryPicker` is gated on a click and on the
folder the user chooses in the system dialog, so it needs nothing in the manifest, and
it is still true that the extension makes no network request of any kind.

| Permission | Why it is needed |
|---|---|
| `storage` | Holds the user's highlights, notes, tags and preferences on their own device. This is the entire contents of the product; without it nothing survives a page reload. |
| `unlimitedStorage` | A heavy reader accumulates thousands of highlights, each keeping a copy of its text so it survives the source being deleted. The default quota would silently start failing writes. |
| `activeTab` | When the toolbar button is clicked, the popup needs the current tab's address to show whether Kona is switched on for this site and to offer to switch it on. It is used only for that, only on a click. |
| `scripting` | After the user allows a new site, highlighting starts on the page they are already looking at instead of requiring a reload. |
| `contextMenus` | Adds a single "Highlight with Kona" item on a text selection, for sites whose own selection popup covers Kona's colour bar. Offered only on sites the user has already allowed. Safari on iPhone ships no such API and Kona treats it as optional rather than failing. |

**`host_permissions` is empty.** Kona is granted access to no site at install,
including the AI chats, and the browser therefore raises no warning when it is
installed. This is deliberate and is the single most important thing about the
package: the first sentence an extension says about itself should not be a
demand.

| Host permission | Why it is needed |
|---|---|
| `optional_host_permissions: *://*/*` | **Never requested on install, and never requested in bulk.** Requested for exactly one site at a time, from the popup, on a click, while the user is looking at the page they want to keep something from. A site Kona has not been granted runs no Kona code at all, there is no content script on it. The browser's own extensions screen lists every site granted and takes any of them back; Kona keeps no second list that could disagree with it. |

| Content script | Why it is needed |
|---|---|
| `https://aniketpandey05.github.io/kona/*` | Kona's own web app, and the only match in the manifest. On a free account there is no sync, so the library on the web has to read what the extension saved on the same machine; this script is the bridge between the two. It runs on no other origin, only at the top level, and answers nothing that did not come from the page itself. |

**Remote code:** none. All code is bundled in the package; nothing is fetched or evaluated
at runtime.

## Privacy & Data Use

**What to tick on the data-use form.** The store asks you to declare what the
extension handles, and the honest answers are:

| Category | Declare | Why |
| --- | --- | --- |
| **Website content** | **Yes** | The passage you highlight, and a copy of it, are page content |
| **Personal communications** | **Yes** | A highlight taken from an AI chat is a message you wrote or received |
| Authentication information | No | Kona has no account and reads no credentials |
| Personally identifiable information | No | No name, address or identifier is collected |
| Location, health, financial, activity | No | None is read or stored |

Then the three affirmations, all of which are true: the data is **not sold** to
third parties, **not used** for anything unrelated to the single purpose, and
**not used** for creditworthiness or lending. Everything stays in the browser's
own storage on the device; there is no server to send it to.

**Privacy policy URL:** https://aniketpandey05.github.io/kona/privacy.html

**Declare it, even though nothing leaves the device.** This file used to carry a second
table saying *No* to website content and personal communications, directly under the
one above saying *Yes*, which left whoever submitted it to guess. The guess that gets an
extension pulled is the one that under-declares, and Google's own user-data FAQ settles
it: extensions must disclose how they handle user data *even when that data is processed
or stored locally on the user's device*. Handling means collecting, using or sharing it,
not only sending it somewhere.

So the single table above is the answer. Saying *Yes* to website content and personal
communications costs nothing here, because the privacy policy and the listing both say
the same true thing about where it goes, which is nowhere.

Everything else on the form is *No*: personally identifiable information, health,
financial, authentication, location, web history and user activity are not read or
stored.

Three certifications to accept, all true: the data is not sold to third parties; it is
not used for any purpose unrelated to the single purpose above; and it is not used to
determine creditworthiness or for lending.

## Test instructions for the reviewer

**Paste this into the "Instructions for reviewers" box on the submission form.**
It matters more for Kona than for most extensions: because nothing is built in,
a fresh install can read **no site at all**, so a reviewer who installs it and
opens a page will see nothing happen. Without these steps the honest conclusion
is that the extension does not work.

> Kona asks for no site access when it is installed, so there is one step
> before it does anything. That is deliberate, it is why installing raises no
> permission warning.
>
> 1. Install Kona and open any article, blog post or documentation page.
> 2. Click the Kona icon in the toolbar.
> 3. Turn on **Highlight on <this site>**. Chrome will ask you to allow the
>    site; allow it. Nothing happens before this.
> 4. Select a sentence on the page. A small dark bar appears beside it.
> 5. Click one of the four coloured dots. The sentence is highlighted and a
>    small Kona mark appears at the bottom right with a count.
> 6. Click that mark to open the panel. It lists what you have kept on this
>    page; clicking a row scrolls back to the passage and flashes it.
> 7. Reload the page. The highlight is still there, finding it again is what
>    Kona is for.
> 8. Click **Library** in the panel to open the web library at
>    `https://aniketpandey05.github.io/kona/app/`.
>
> Two more, if you want to see the rest: right-click a picture and choose
> **Keep this picture with Kona**, which stores a copy of it rather than a
> link to it. And in the popup, switch **Kona is on** off: the bar stops
> appearing on every site and nothing is drawn, while every highlight stays
> saved and comes back when you switch it on again.
>
> To test a chat site, do the same on chatgpt.com, claude.ai or
> gemini.google.com. They are not special and are not granted at install.

---

## Pre-Submission Checklist

- [x] Manifest V3, no V2 APIs
- [x] Every icon size referenced exists at its true dimensions
- [x] Every permission has a specific justification above
- [x] Privacy policy written and served over HTTPS
- [x] No remote code, no analytics, no network requests
- [x] Builds clean, 553 tests pass
- [x] Screenshots re-captured against the rebuilt interface, all five 1280×800
- [x] Listing copy re-read against the build, line by line, at 1.4.5
- [x] The manifest carries the real web-app origin, not a placeholder
- [x] ZIP built by CI from the tagged commit, `kona-1.4.5-chrome.zip`
- [ ] Privacy policy URL confirmed live, which needs the Pages deploy to have run
- [ ] $5 one-off developer registration paid

- [x] Small promotional tile, 440×280, and the marquee at 1400×560, both drawn
      from the real mark and the real tokens rather than exported once from a
      design tool

- [ ] The promo video recorded and uploaded, and its YouTube link pasted into
      the listing. Optional, and the one asset nobody else can make for you,
      because the store wants a link rather than a file

One thing that is nobody's blocker but will be noticed:

- [ ] The landing page's Enterprise button still mails `sales@kona.example`,
      which is nobody. It is the website rather than the extension, so it does
      not affect review.

The ZIP produced by `npm run zip` contains only the built extension, no `.git`, no
`node_modules`, no source, and not this file.

## Version History

| Version | Date | Summary |
|---|---|---|
| 1.4.5 | 2026-11-27 | Note keeps the colour you have been using rather than whichever pen sits first in the case, and the colour can be changed from inside the note card. |
| 1.4.4 | 2026-11-27 | The panel opens upward from the mark rather than jumping to the opposite corner. A passage that ran across a line break is kept as one line, which a Markdown export had been turning into a code block. No row of tabs with one tab in it. |
| 1.4.3 | 2026-11-21 | Escape closes what you are in, nearest first: the note, then the bar, then the panel, one press at a time. Every button Kona draws shows where the keyboard is, the colours in the bar included. |
| 1.4.2 | 2026-11-19 | A highlight you delete stays deleted when your library is kept in a folder you sync; it used to come back from the other machine, because an absence looked exactly like something that machine had not been told about yet. |
| 1.4.1 | 2026-11-18 | Dark works. Choosing Dark, or leaving Kona to match the system, now changes the library, the popup and the welcome page; before this the choice was saved and nothing read it. The panel inside a page stays dark over any article, as it always has. Two tabs of the library agree with each other: a name, a new space or a deletion in one shows up in the other without a reload. Spaces is a row in the sidebar rather than a heading above one, so there is an obvious way back to all of them. |
| 1.4.0 | 2026-11-17 | Pens you mix yourself, at any hue and strength; retiring one never repaints what it marked. A picture can be a highlight, kept as Kona's own copy so the library never fetches from the site it came from. A passage can be kept out of the browser's PDF viewer, where no extension can run, and Kona says what that costs. A page that changed under a highlight says so in the library as well as on the page. On a phone the bar sits at the foot of the screen. Spaces hold pages you have not read yet, and can be ordered, labelled and deleted. Delete and tags in the library. And Kona can be turned off: Escape for one selection, a switch in the popup for every site at once, with nothing deleted either way. |
| 1.3.0 | 2026-11-16 | Rebuilt from the design documents. Kona installs asking for nothing: no site is read until it is allowed, the AI chats included. One set of colours and type across the whole product. Spaces can be set from the panel, and while one is active the panel says in words where highlights are going; a highlight that does not belong comes back out in one tap. A space is the highlights gathered in it, the write-up and findings are gone. Archiving puts a highlight out of the way of the list without losing it. The library moved to the web, so there is one library rather than two. Highlights stay readable on dark pages, which they were not. |
| 1.1.0 | 2026-10-23 | Colour on phone captures, with filtering to match. Backups and appearance reachable from the header rather than the foot of the list. Shared text is tidied as it is stored. A conversation link shared to the app attaches itself to everything kept from that conversation. |
| 1.0.0 | 2026-10-21 | First public release. Highlighting with notes and tags on ChatGPT, Claude, Gemini and any site the user switches on; side panel; cross-chat search; one library with Markdown and backup export; light and dark themes. |
