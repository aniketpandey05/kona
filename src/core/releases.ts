/**
 * What changed, shipped with the build.
 *
 * Decision 4, and it is decision 6 that forces it. **Free sends nothing
 * anywhere**: no account, no server. Fetching a changelog would mean every
 * Free install contacting us, which reveals that somebody has Kona and when
 * they opened it, for the sake of a list of features. An extension updates
 * anyway, so the notes arrive with the update they describe, and they are
 * automatically right for the version actually running rather than for the
 * newest one that exists.
 *
 * So: no network, nothing to log. *Coming* is the only part that wants to be
 * fresher than this, and it waits for the next update like everything else.
 */
export interface Release {
  version: string;
  /** Written for somebody who uses Kona, not somebody who writes it. */
  notes: string[];
}

export const RELEASES: readonly Release[] = [
  {
    version: '1.4.4',
    notes: [
      'The panel opens upward from the mark you clicked, instead of jumping to the opposite corner of the window.',
      'A passage that ran across a line break in the page is kept as one line. It was stored with the page’s own indentation in it, which a Markdown export turned into a code block.',
      'On a page with no space set, the panel no longer draws a row of tabs with only one tab in it.',
    ],
  },
  {
    version: '1.4.3',
    notes: [
      'Escape closes whatever you are in, nearest first: the note you are writing, then the bar, then the panel. One press at a time, so it never takes away two things at once.',
      'Every button Kona draws now shows where your keyboard is, the colours in the bar included. They were leaving that to whatever ring your browser happened to draw.',
    ],
  },
  {
    version: '1.4.2',
    notes: [
      'A highlight you delete stays deleted when your library is kept in a folder you sync. It used to come back from the other machine, because a deletion looked exactly like something that machine had not been told about yet.',
    ],
  },
  {
    version: '1.4.1',
    notes: [
      'Dark actually works. Choosing Dark, or leaving Kona to match your system, now changes the library, the popup and the welcome page. Before this the choice was saved and nothing read it. The panel you open in a page stays dark over any article, as it always has.',
      'Two tabs of your library agree with each other. A name, a new space or a deletion in one shows up in the other without reloading it.',
      'Spaces is a row in the sidebar rather than a heading above one, so there is an obvious way back to all of them, which is also where a new one is made.',
    ],
  },
  {
    version: '1.4.0',
    notes: [
      'Pens: mix your own colour, with a hue and an opacity you choose. Changing the case never repaints what you already marked, and a colour you retire stays in your library and stays something you can filter by.',
      'Keep a picture, not just a passage. Kona stores its own copy, so opening your library never fetches anything from the site it came from.',
      'Keep a passage out of a PDF, by right-clicking it. Nothing of Kona can run in the browser’s PDF viewer, so there is no mark drawn and no landing, and it says so.',
      'A highlight whose page has changed says so in the library as well as on the page, so you can see what has gone without visiting each one.',
      'On a phone the bar sits at the foot of the screen, where your thumb is and where the phone’s own menu over selected text can never reach it.',
      'Spaces can hold a page you have not read yet, be put in the order you want, carry their own labels, and be deleted.',
      'Delete, in the library. A single one can be undone; several at once asks first.',
      'Tags you add are listed in the library and filter it.',
      'Turn Kona off. Press Escape and the bar goes away for that selection, or switch Kona off in the popup and it stops offering on every site at once. Nothing is deleted either way, and your highlights come straight back.',
    ],
  },
  {
    version: '1.3.0',
    notes: [
      'The panel, the bar and your notes are rebuilt: one set of colours and type across the whole of Kona, instead of each screen deciding its own.',
      'Spaces can be set from the panel. While a space is active the panel says so, in words, and a highlight that does not belong there comes back out in one tap.',
      'Kona now installs asking for nothing at all. No site is read until you allow it, including the AI chats.',
      'The library moved to the web, so there is one library rather than two that could disagree.',
      'Search moved there with it. A page’s highlights are already in front of you; everything else belongs where you can see all of it.',
      'Archiving: a highlight put out of the way of the list, still searchable, still painted on its page.',
      'Highlights stay readable on a dark page, which they did not before.',
    ],
  },
  {
    version: '1.1.0',
    notes: [
      'Highlights survive a page that has been edited since you marked it, and Kona says so plainly when a passage can no longer be found.',
      'Links land on the exact words, with no extension needed at the other end.',
    ],
  },
  {
    version: '1.0.0',
    notes: ['Highlight a passage anywhere you read, and find it again.'],
  },
];

/**
 * What is next, said without a date.
 *
 * A roadmap with dates on it is a promise made by somebody who does not know
 * yet. These are in the order they are likely to arrive, and that is all the
 * commitment they carry.
 */
export const COMING: readonly string[] = [
  'Your library on every device, kept in step, with the server unable to read a word of it.',
  'An account, which is what that sync attaches to and is needed for nothing else.',
  'Shared spaces, for deciding something with other people.',
  'Kona on iPhone and iPad, as one install that gives both the extension and the library.',
];
