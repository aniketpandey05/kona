import type { Mark } from './types';

/**
 * Builds a link that lands on the highlighted passage in any modern browser,
 * using the URL text fragment syntax:
 *
 *   https://example.com/page#:~:text=prefix-,exact,-suffix
 *
 * The browser finds the text, scrolls to it and highlights it on its own, so
 * these links work for people who have never installed Kona — and on a phone,
 * where no extension can run. Chrome 80+, Safari 16.1+ and Firefox 131+.
 */
export function linkToMark(mark: Mark): string {
  const url = new URL(mark.url);
  const fragment = textFragment(mark);
  if (fragment) url.hash = `:~:text=${fragment}`;
  return url.toString();
}

/**
 * Text fragments match on rendered text, so the stored context has to be
 * trimmed to whole words — a prefix cut mid-word never matches. Long passages
 * are addressed by their first and last few words instead of in full, which
 * keeps the URL short and survives small edits in the middle.
 */
function textFragment(mark: Mark): string | null {
  const exact = collapse(mark.quote?.exact ?? mark.snapshot);
  if (!exact) return null;

  const parts: string[] = [];
  const prefix = lastWords(collapse(mark.quote?.prefix ?? ''), 4);
  if (prefix) parts.push(`${encode(prefix)}-,`);

  const words = exact.split(' ');
  if (words.length > 12) {
    // start,end addresses everything between the two, so the middle can change.
    parts.push(`${encode(words.slice(0, 6).join(' '))},${encode(words.slice(-6).join(' '))}`);
  } else {
    parts.push(encode(exact));
  }

  const suffix = firstWords(collapse(mark.quote?.suffix ?? ''), 4);
  if (suffix) parts.push(`,-${encode(suffix)}`);

  return parts.join('');
}

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
 * hyphen. Ordinary web text is full of them, a selection drags them along, and
 * once they are in the needle nothing will ever match it.
 */
const INVISIBLE = charClass([0x200b, 0x200c, 0x200d, 0xfeff, 0x00ad]);
/** A non-breaking space is not the space a fragment is compared against. */
const NO_BREAK_SPACE = charClass([0x00a0]);
/** Straight and curly quotes, and guillemets. */
const LEADING_QUOTES = /^["'‘’“”«»]+/;
const TRAILING_QUOTES = /["'‘’“”«»]+$/;
/** Three dots or a real ellipsis, which truncating apps append. */
const TRAILING_ELLIPSIS = /\s*(?:\.\.\.|…)$/;

/**
 * Text arriving from a phone's share sheet is rarely byte-identical to what is
 * on the page, and a text fragment matches literally — one stray character and
 * the browser silently lands at the top instead.
 *
 * Everything stripped here makes the needle smaller, never larger, so matching
 * can only become more likely: a fragment matches any substring, so dropping a
 * trailing ellipsis, or the quotation marks an app wrapped around a selection,
 * still finds the passage.
 */
function collapse(text: string): string {
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

/** Whole words only; a fragment that starts mid-word will not match anything. */
function lastWords(text: string, count: number): string {
  const words = text.split(' ').filter(Boolean);
  return words.slice(-count).join(' ');
}

function firstWords(text: string, count: number): string {
  const words = text.split(' ').filter(Boolean);
  return words.slice(0, count).join(' ');
}

/** `-`, `,` and `&` are syntax inside a text fragment, so they have to go. */
function encode(text: string): string {
  return encodeURIComponent(text).replace(/-/g, '%2D').replace(/,/g, '%2C').replace(/&/g, '%26');
}
