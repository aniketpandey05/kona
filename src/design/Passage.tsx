import { useState } from 'preact/hooks';
import { penOf } from '../core/pens';
import type { PenId } from '../core/types';

/**
 * The three things a passage always is: the pen it was marked with, the words,
 * and your note. Everything around it belongs to the screen drawing it.
 *
 * See `passage.css` for why this has no prop saying which room it is in, and
 * for what the frame around it is expected to carry.
 */
export interface PassageProps {
  /** The pen it was marked with. The dot, not the mark painted on the page. */
  color: PenId;
  /** What the page said. */
  text: string;
  /** What you thought. One per highlight, and usually absent. */
  note?: string | null;
  /**
   * Where the words go when clicked, in the rooms where a passage is a way
   * back to its page.
   *
   * Given, the words are the link and the passage can be opened out in place;
   * left out, the words are plain text and whatever is drawn around them is
   * the control. That is the difference between the library, where the page
   * may be gone and the whole passage has to be readable here, and the panel,
   * where the passage is on the screen behind you and the card is already a
   * way to land on it.
   */
  href?: string;
  /**
   * A kept picture, as its own bytes (18).
   *
   * A picture is a highlight and not a new noun, so it is drawn here with the
   * pen and the note rather than in a component of its own. The bytes are
   * handed in rather than fetched from where the picture came from: showing it
   * by its original address would tell that host what you kept, every time
   * you opened your library, which decision 6 forbids.
   *
   * Null where Kona has the highlight and not the picture, which is what a
   * site refusing to let it be copied leaves behind. The words near it are
   * still there and still what make it findable.
   */
  picture?: string | null;
  /** Whether this highlight is of a picture at all, with or without a copy. */
  isPicture?: boolean;
}

/**
 * How much of a long passage to show before it is folded (19).
 *
 * **No limit on what can be kept, and no invented number for it**: select a
 * word or select the whole page, Kona keeps it. What the interface does about
 * length is truncate, never refuse. A highlight that is an entire page is
 * really a bookmark, and Kona does not need to forbid that; it just will not
 * be very useful, which the person can see for themselves.
 *
 * This number is about a row in a list rather than about a highlight: a few
 * lines is enough to know which passage this is, which is all a row has to do.
 */
const ENOUGH_TO_RECOGNISE = 420;

/** Cut at a word, so the fold never lands in the middle of one. */
function opening(text: string): string {
  const cut = text.slice(0, ENOUGH_TO_RECOGNISE);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > ENOUGH_TO_RECOGNISE - 60 ? cut.slice(0, lastSpace) : cut}…`;
}

export function Passage({ color, text, note, href, picture, isPicture }: PassageProps) {
  const [whole, setWhole] = useState(false);
  const long = href !== undefined && text.length > ENOUGH_TO_RECOGNISE;
  const shown = long && !whole ? opening(text) : text;

  return (
    <div class="kona-passage">
      <span class="kona-passage-pen" aria-hidden="true" style={{ background: penOf(color).ink }} />
      <div class="kona-passage-body">
        {picture && (
          // Decorative here: the words beside it are the description, and a
          // screen reader reading both would say the same thing twice.
          <img class="kona-passage-picture" src={picture} alt="" loading="lazy" />
        )}
        {isPicture && !picture && (
          <p class="kona-passage-nopicture">
            That site would not let Kona copy the picture. What it said is kept.
          </p>
        )}
        {href === undefined ? (
          <p class="kona-passage-text">{shown}</p>
        ) : (
          <a class="kona-passage-text" href={href} target="_blank" rel="noopener">
            {shown}
          </a>
        )}
        {/* Outside the link on purpose: opening the passage out is not going
            to the page, and a control nested inside a link is both invalid
            and a way to follow the link by accident. */}
        {long && (
          <button
            type="button"
            class="kona-passage-more"
            onClick={() => setWhole((open) => !open)}
          >
            {whole ? 'Show less' : 'Show the whole of it'}
          </button>
        )}
        {/* An empty note is no note. A highlight saved with the note field
            touched and left blank must not draw an empty accent edge. */}
        {note ? <p class="kona-passage-note">{note}</p> : null}
      </div>
    </div>
  );
}
