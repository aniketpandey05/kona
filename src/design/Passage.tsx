import type { HighlightColor } from '../core/types';
import { PEN_COLORS } from './tokens';

/**
 * The three things a passage always is: the pen it was marked with, the words,
 * and your note. Everything around it belongs to the screen drawing it.
 *
 * See `passage.css` for why this has no prop saying which room it is in, and
 * for what the frame around it is expected to carry.
 */
export interface PassageProps {
  /** The pen it was marked with. The dot, not the mark painted on the page. */
  color: HighlightColor;
  /** What the page said. */
  text: string;
  /** What you thought. One per highlight, and usually absent. */
  note?: string | null;
}

export function Passage({ color, text, note }: PassageProps) {
  return (
    <div class="kona-passage">
      <span class="kona-passage-pen" aria-hidden="true" style={{ background: PEN_COLORS[color] }} />
      <div class="kona-passage-body">
        <p class="kona-passage-text">{text}</p>
        {/* An empty note is no note. A highlight saved with the note field
            touched and left blank must not draw an empty accent edge. */}
        {note ? <p class="kona-passage-note">{note}</p> : null}
      </div>
    </div>
  );
}
