/**
 * Built from code points rather than written out, because these characters are
 * invisible: pasted into a regex they look like an empty bracket, and an editor
 * or a copy-paste can silently drop them.
 */
function charClass(codePoints: number[]): RegExp {
  return new RegExp(`[${codePoints.map((c) => String.fromCharCode(c)).join('')}]`, 'g');
}

/**
 * Zero-width space, zero-width non-joiner and joiner, byte order mark, soft
 * hyphen. Ordinary web text is full of them and a selection drags them along.
 */
const INVISIBLE = charClass([0x200b, 0x200c, 0x200d, 0xfeff, 0x00ad]);
const NO_BREAK_SPACE = charClass([0x00a0]);
/** Straight and curly quotes, and guillemets. */
const LEADING_QUOTES = /^["'‘’“”«»]+/;
const TRAILING_QUOTES = /["'‘’“”«»]+$/;
/** Three dots or a real ellipsis, which truncating apps append. */
const TRAILING_ELLIPSIS = /\s*(?:\.\.\.|…)$/;

/**
 * Tidies a passage that arrived from somewhere else — a phone's share sheet,
 * most of all, where the text is rarely byte-identical to the page it came
 * from. It carries invisible characters, non-breaking spaces, the quotation
 * marks an app wrapped around the selection, and the ellipsis a truncating one
 * appended.
 *
 * This matters twice over. A text fragment matches literally, so one stray
 * character sends the browser to the top of the page instead of the passage.
 * And the same text is what gets shown in the library and written into a
 * Markdown export, where the stray quotes and ellipsis are simply wrong.
 *
 * Every rule only ever shortens the text, never adds to it.
 */
export function cleanPassage(text: string): string {
  return text
    .replace(INVISIBLE, '')
    // A non-breaking space is not the space a fragment is compared against.
    .replace(NO_BREAK_SPACE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(LEADING_QUOTES, '')
    .replace(TRAILING_QUOTES, '')
    .replace(TRAILING_ELLIPSIS, '')
    .trim();
}
