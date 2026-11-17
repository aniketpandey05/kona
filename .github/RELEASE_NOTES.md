Kona is an extension for highlighting a passage anywhere you read, and finding
it again on the exact words. It runs on ordinary pages and inside AI chats.

**Kona installs asking for nothing.** No site is read until you allow it, from
the toolbar, while you are standing on the page you want to keep something
from. That includes ChatGPT, Claude and Gemini: they are not built in and are
not special.

### Installing

Chrome, Edge and Brave: download `kona-chrome.zip`, unzip it, then
`chrome://extensions`, turn on developer mode, and **Load unpacked** on the
unzipped folder. Firefox: `kona-firefox.zip`, loaded as a temporary add-on from
`about:debugging`. Safari: `kona-safari.zip` holds the extension's resources
and still needs the Xcode wrap, which is described in `apple/README.md`.

Your library lives on the web at
<https://aniketpandey05.github.io/kona/app/>, and on a free account nothing
leaves the device it was marked on.

### In this release

Every decision in the design documents that does not need a server is now
built.

**Pens.** Mix your own colour, with a hue and an opacity you pick. Changing
the case never repaints what you already marked, so a colour you retire is
still in your library and still something you can filter by.

**Pictures.** Right-click a chart and keep it. Kona stores its own copy, so
opening your library never fetches anything from the site it came from.

**PDFs.** Right-click a passage in the browser's own viewer and keep it.
Nothing of Kona can run in there, so there is no mark drawn and no way back
to the exact words, and Kona says so rather than pretending.

**A page that changed under a highlight** says so in the library as well as
on the page, so you can see what has gone without visiting each one.

**On a phone** the bar sits at the foot of the screen, where your thumb is
and where the phone's own menu over selected text can never reach it.

**Spaces** can hold a page you have not read yet, be ordered by hand, carry
their own labels, and be deleted. **Delete** is in the library now: one can be
undone, several at once ask first. **Tags** you add are listed and filter the
library.

**Turning Kona off.** Selecting text is not a request to highlight it, so
`Esc` takes the bar away and leaves your selection where it was. For longer
than a moment there is a switch in the popup: off means no bar and nothing
painted, on every site. Nothing is deleted, and your highlights come back the
moment you turn it on.

Still not here, and needing a server rather than more work: an account, sync
between devices, and shared spaces.
