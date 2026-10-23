# Kona on Apple platforms

Chrome and Safari are the other way round from each other on phones. Chrome on
Android has no extensions at all, which is why the Android version of Kona is a
web app in [`app/`](../app). Safari has had extensions on iPhone and iPad since
iOS 15. So the Apple version is not a web app: it is the same extension as the
desktop one, built from the same source, running on iPhone, iPad and Mac.

Nothing in here is a second codebase. The extension is built once for Safari,
and this directory holds only the part Apple requires on top: every Safari
extension ships inside a native app, and that app is built with Xcode.

## Building it

```bash
npm install
npm run build:safari   # .output/safari-mv3 — this part builds on any OS
apple/package.sh       # wraps it in the app; needs a Mac with Xcode
```

The first run of `apple/package.sh` generates `apple/Kona/` — an Xcode project
with an iOS target and a macOS target, and the built extension copied in as
resources. Later runs copy a fresh build into the project you already have,
because regenerating would throw away the signing settings and build number you
set in Xcode. `apple/package.sh --replace` starts over deliberately.

That generated project is not committed. It is output, like `.output/`, and
Xcode rewrites it; the script is the source.

In Xcode: set your team on both targets, run the **Kona (iOS)** scheme on a
device or simulator, then switch the extension on in **Settings › Apps ›
Safari › Extensions**. On a Mac it is **Safari › Settings › Extensions**.

## Running it without the Xcode wrap

On a Mac you can skip all of the above while developing. In Safari, turn on
**Settings › Advanced › Show features for web developers**, then **Settings ›
Developer › Allow unsigned extensions**, and load `.output/safari-mv3` as an
unpacked extension. The allowance lasts until Safari quits.

There is no equivalent on iOS. An iPhone only runs an extension that arrived
inside an installed app, which is what the packager is for.

## Safari 17.2 and no lower

Kona paints every highlight with the CSS Custom Highlight API, which reached
Safari in 17.2. Below that it would install and then quietly draw nothing, so
the Safari build declares a floor the way the Firefox build does:

```json
"browser_specific_settings": { "safari": { "strict_min_version": "17.2" } }
```

On an iPhone that is also the iOS version, because Safari's version number and
iOS's are the same one.

## What differs from Chrome

Everything you actually do with Kona is the same code: selecting text and
picking a colour, notes, tags, the panel, the library, search, export, backups.
Three things are not.

- **No right-click on a phone.** Safari on iPhone and iPad ships no
  `contextMenus` API, so **Highlight with Kona** is a Mac-only convenience.
  Reaching for a missing API at startup would take the whole background script
  down, so it is treated as optional — see the top of
  [`src/entrypoints/background.ts`](../src/entrypoints/background.ts).
- **Safari asks about sites its own way.** Switching a site on still goes
  through `permissions.request`, but what the person sees is Safari's prompt and
  its own per-site memory, not Chrome's.
- **Nothing syncs.** The Safari build keeps its own highlights, separate from
  the Chrome one and from the Android app. All three export the same backup
  format, so highlights can be carried across by hand.

## Getting it to other people

A Safari extension reaches anyone else through the App Store, which means an
Apple Developer Program membership at $99 a year — the one real difference from
the Chrome Web Store's one-off $5.

Two routes, both documented by Apple. The Xcode project this script generates
can be archived and uploaded from Xcode. Or App Store Connect takes the
extension resources directly: `npm run zip:safari` produces them, and from
there it is the ordinary create-the-app, pick-platforms, TestFlight, submit
path. Choosing iOS and macOS covers iPhone, iPad and Mac, and shows up on Apple
Vision Pro as a compatible app.

For yourself alone, Xcode will sign and install on your own device with a free
Apple ID. That signature expires after seven days and has to be redone.

## Why not the web app

The Android version works by registering as a share target, so **Share › Kona**
appears anywhere on the phone. Safari has never shipped Web Share Target, and
Apple has not said it will, so a web app on iOS cannot be shared to — which is
the whole mechanism of the Android version. (A Shortcut can open the app's
share URL with text in it, since that share target is a plain `GET`. That is a
workaround nobody here has tested, not a supported path.)

The extension is the better answer anyway: on an iPhone it highlights in the
page, in the actual conversation, which is what the Android app cannot do.

## Not yet run on a Mac

Said plainly, because it matters when you hit an error: the Safari extension
itself is built and type-checked in CI on every push, and that half is known to
work. `apple/package.sh` is written from Apple's documented flags for the
packager — renamed from `safari-web-extension-converter`, which the script
falls back to — and has not been run here, because this was written on Windows.
The first person with a Mac should expect to correct something, most likely the
name of the generated extension target's `Resources` folder, which the script
checks for and complains about by name.
