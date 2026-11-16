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
    version: '1.2.0',
    notes: [
      'The panel, the bar and your notes are rebuilt: one set of colours and type across the whole of Kona, instead of each screen deciding its own.',
      'Spaces can be set from the panel. While a space is active the panel says so, in words, and a highlight that does not belong there comes back out in one tap.',
      'Kona now installs asking for nothing at all. No site is read until you allow it, including the AI chats.',
      'The library moved to the web, so there is one library rather than two that could disagree.',
      'Search moved there with it. A page’s highlights are already in front of you; everything else belongs where you can see all of it.',
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
  'Archiving: putting a highlight out of the way of the list without losing it.',
  'Your library on every device, kept in step, with the server unable to read a word of it.',
  'Search by meaning as well as by word.',
  'Shared spaces, for deciding something with other people.',
];
