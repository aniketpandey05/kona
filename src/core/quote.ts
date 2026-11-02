/**
 * Text-quote anchoring, as in the W3C Web Annotation model (and Hypothesis):
 * store the highlighted text plus some context on each side, then find the
 * best match again later, even if the surrounding text has shifted.
 *
 * There are three passes, tried in that order, and the order is the point.
 * The first two ask for the passage exactly as it was kept, once as written
 * and once with whitespace collapsed, and between them they place almost every
 * highlight almost every time, for the cost of an `indexOf`.
 *
 * The third is for the case those two cannot survive: the page itself changed.
 * Somebody fixed a typo, updated a figure, changed `colour` to `color`. Before
 * this pass existed a single character was enough to lose a highlight for
 * good, which is the one thing Kona promises not to do. So when the exact
 * passes come back with nothing, the passage is looked for again allowing a
 * few differences. That search is much more expensive than an `indexOf`, so it
 * is off by default and `locate.ts` only turns it on once the cheap passes
 * have failed everywhere.
 */

import search from 'approx-string-match';
import type { TextSpan } from './textIndex';

export interface TextQuote {
  exact: string;
  prefix: string;
  suffix: string;
  /** Offset where the quote began when created; only used to break ties. */
  start: number;
}

export interface ResolveOptions {
  /**
   * Allow a match that is close rather than identical. Costs much more than
   * the exact passes, so this is a second attempt rather than a setting.
   */
  approximate?: boolean;
}

const CONTEXT_CHARS = 32;
const MAX_CANDIDATES = 500;

/**
 * How far from the kept passage a match may be and still be the same passage.
 *
 * A rate rather than a count, because ten changed characters mean something
 * different in a sentence than in three pages. The cap keeps a very long quote
 * from being matched by almost anything, and the floor is there because
 * fuzzily matching a short string is how you land on the wrong one: at this
 * rate nothing under 17 characters is allowed a single error, which is about
 * where a phrase stops being distinctive enough to find by itself.
 */
const MAX_ERROR_RATE = 0.12;
const MAX_ERRORS = 24;

export function describeQuote(text: string, span: TextSpan): TextQuote {
  return {
    exact: text.slice(span.start, span.end),
    prefix: text.slice(Math.max(0, span.start - CONTEXT_CHARS), span.start),
    suffix: text.slice(span.end, span.end + CONTEXT_CHARS),
    start: span.start,
  };
}

export function resolveQuote(
  text: string,
  quote: TextQuote,
  options: ResolveOptions = {},
): TextSpan | null {
  if (!quote.exact) return null;
  const exactly = findBest(text, quote) ?? findBestIgnoringWhitespace(text, quote);
  if (exactly || !options.approximate) return exactly;
  return findApproximately(text, quote);
}

function findBest(text: string, quote: TextQuote): TextSpan | null {
  let best: TextSpan | null = null;
  let bestScore = -Infinity;
  let from = 0;
  for (let n = 0; n < MAX_CANDIDATES; n++) {
    const at = text.indexOf(quote.exact, from);
    if (at === -1) break;
    const span = { start: at, end: at + quote.exact.length };
    const score = contextScore(text, span, quote);
    if (score > bestScore) {
      bestScore = score;
      best = span;
    }
    from = at + 1;
  }
  return best;
}

function contextScore(text: string, span: TextSpan, quote: TextQuote): number {
  const before = text.slice(Math.max(0, span.start - quote.prefix.length), span.start);
  const after = text.slice(span.end, span.end + quote.suffix.length);
  // Matching context dominates; distance from the original position (always < 1) only breaks ties.
  const distance = Math.abs(span.start - quote.start) / (text.length + 1);
  return commonSuffixLength(before, quote.prefix) + commonPrefixLength(after, quote.suffix) - distance;
}

// Re-rendered markdown often changes whitespace (line breaks, indentation), so retry with it collapsed.
function findBestIgnoringWhitespace(text: string, quote: TextQuote): TextSpan | null {
  const collapsed = collapseWhitespace(text);
  const wanted = collapseQuote(quote, text.length, collapsed.text.length);
  if (!wanted.exact) return null;
  const span = findBest(collapsed.text, wanted);
  return span && backToOriginal(collapsed.map, span);
}

/**
 * The passage as it is now, rather than as it was kept.
 *
 * Whitespace is collapsed first, so an edit and a re-flow together still count
 * as one problem. `search` returns every match sharing the lowest error count,
 * which leaves exactly one thing to decide: a page can say nearly the same
 * sentence twice, so the winner is the one whose surroundings still look like
 * the surroundings that were kept.
 */
function findApproximately(text: string, quote: TextQuote): TextSpan | null {
  const collapsed = collapseWhitespace(text);
  const wanted = collapseQuote(quote, text.length, collapsed.text.length);
  const maxErrors = Math.min(MAX_ERRORS, Math.floor(wanted.exact.length * MAX_ERROR_RATE));
  if (maxErrors < 1) return null;

  const matches = search(collapsed.text, wanted.exact, maxErrors);
  if (matches.length === 0) return null;

  let best: TextSpan | null = null;
  let bestScore = -Infinity;
  for (const match of matches) {
    const score = contextScore(collapsed.text, match, wanted);
    if (score > bestScore) {
      bestScore = score;
      best = match;
    }
  }
  return best && backToOriginal(collapsed.map, best);
}

/** The same quote, measured against whitespace-collapsed text. */
function collapseQuote(quote: TextQuote, was: number, now: number): TextQuote {
  return {
    exact: collapseWhitespace(quote.exact).text.trim(),
    prefix: collapseWhitespace(quote.prefix).text,
    suffix: collapseWhitespace(quote.suffix).text,
    start: Math.round((quote.start * now) / (was || 1)),
  };
}

/** A span found in collapsed text, put back where it is in the real text. */
function backToOriginal(map: number[], span: TextSpan): TextSpan | null {
  const start = map[span.start];
  const last = map[span.end - 1];
  return start == null || last == null ? null : { start, end: last + 1 };
}

/** Collapses whitespace runs to one space; map[i] is the original index of collapsed char i. */
function collapseWhitespace(input: string): { text: string; map: number[] } {
  const chars: string[] = [];
  const map: number[] = [];
  let previousWasSpace = false;
  for (let i = 0; i < input.length; i++) {
    const char = input.charAt(i);
    const isSpace = /\s/.test(char);
    if (isSpace && previousWasSpace) continue;
    chars.push(isSpace ? ' ' : char);
    map.push(i);
    previousWasSpace = isSpace;
  }
  return { text: chars.join(''), map };
}

function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i++;
  return i;
}

function commonSuffixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i;
}
