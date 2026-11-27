Kona is an extension for highlighting a passage anywhere you read, and finding
it again on the exact words. It runs on ordinary pages and inside AI chats.

**Kona installs asking for nothing.** No site is read until you allow it, from
the toolbar, while you are standing on the page you want to keep something
from. That includes ChatGPT, Claude and Gemini: they are not built in and are
not special.

### Installing

The attached files carry the version in their names, so this release's are
`kona-1.4.4-chrome.zip` and so on; a later release attaches its own.

Chrome, Edge and Brave: download the `-chrome` zip, unzip it, then
`chrome://extensions`, turn on developer mode, and **Load unpacked** on the
unzipped folder. Firefox: the `-firefox` zip, loaded as a temporary add-on
from `about:debugging`; the `-sources` zip beside it is what add-on review
asks for and nobody installing needs. Safari: the `-safari` zip holds the
extension's resources and still needs the Xcode wrap, which is described in
`apple/README.md`.

Your library lives on the web at
<https://aniketpandey05.github.io/kona/app/>, and on a free account nothing
leaves the device it was marked on.

### Fixed in 1.4.4

**The panel opens from the mark.** It was anchored to the top of the window
while the mark that opens it sits at the bottom, so one click threw it to the
opposite corner. It grows upward from where you clicked now, on the same inset.

**A passage that ran across a line break** is kept as one line. It used to be
stored with the page's own indentation inside it, which looked fine on screen,
because HTML collapses it, and came out of a Markdown export as a code block.

**No row of tabs with one tab in it**, on a page where no space is set.

### Fixed in 1.4.3

**Escape closes what you are in.** Nearest first: the note you are writing,
then the bar, then the panel. One press at a time, so it never takes two
things away at once. Before this the panel could only be closed with its ×,
and while a bar was up Escape did nothing at all, which left states a
keyboard could not get out of.

**Every button shows where your keyboard is**, the colours in the bar
included. They had no focus style of their own and were leaving it to
whatever ring the browser happened to draw.

### Fixed in 1.4.2

**A deletion stays deleted.** If your library is kept in a folder you sync,
deleting a highlight on one machine used to leave the other machine free to
hand it back, because an absence looks exactly like something that machine
has not been told about yet. It is a fact with a time on it now, and the same
rule settles the awkward case: delete on one machine and edit on another, and
whichever happened later is what you keep.

### Fixed in 1.4.1

**Dark actually works.** Choosing Dark, or leaving Kona to match your system,
now changes the library, the popup and the welcome page. Before this the
choice was saved and nothing read it, so the chip lit and the paper stayed
cream. The panel you open inside a page stays dark over any article, as it
always has.

**Two tabs of your library agree with each other.** A name, a new space or a
deletion in one shows up in the other without reloading it.

**Spaces is a row in the sidebar** rather than a heading above one, so there
is an obvious way back to all of them, which is also where a new one is made.

### In 1.4.0

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
