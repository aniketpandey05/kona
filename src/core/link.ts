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

const collapse = (text: string) => text.replace(/\s+/g, ' ').trim();

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
