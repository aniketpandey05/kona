import { describe, expect, it } from 'vitest';
import { describeQuote, resolveQuote } from '../src/core/quote';

function quoteOf(text: string, exact: string, occurrence = 0) {
  let start = -1;
  for (let i = 0; i <= occurrence; i++) start = text.indexOf(exact, start + 1);
  return describeQuote(text, { start, end: start + exact.length });
}

describe('resolveQuote', () => {
  it('finds the quote in unchanged text', () => {
    const text = 'Use docker compose up -d to start the stack.';
    const quote = quoteOf(text, 'docker compose up -d');
    expect(resolveQuote(text, quote)).toEqual({ start: 4, end: 24 });
  });

  it('picks the occurrence whose context matches', () => {
    const text = 'Step one: run the tests. Step two: deploy, then run the tests again.';
    const quote = quoteOf(text, 'run the tests', 1);
    const span = resolveQuote(text, quote)!;
    expect(text.slice(span.start - 13, span.end)).toBe('deploy, then run the tests');
  });

  it('survives text inserted before the quote', () => {
    const original = 'Intro. The key insight is caching. Outro.';
    const quote = quoteOf(original, 'The key insight is caching.');
    const edited = 'A brand new paragraph was added here. ' + original;
    const span = resolveQuote(edited, quote)!;
    expect(edited.slice(span.start, span.end)).toBe('The key insight is caching.');
  });

  it('falls back to whitespace-insensitive matching', () => {
    const original = 'first line\n\n  second   line';
    const quote = quoteOf(original, 'line\n\n  second');
    const rerendered = 'first line second line';
    const span = resolveQuote(rerendered, quote)!;
    expect(rerendered.slice(span.start, span.end)).toBe('line second');
  });

  it('prefers the nearest match when context cannot decide', () => {
    const text = 'ok ok ok ok';
    const quote = { exact: 'ok', prefix: '', suffix: '', start: 6 };
    expect(resolveQuote(text, quote)).toEqual({ start: 6, end: 8 });
  });

  it('returns null when the text is gone', () => {
    const quote = quoteOf('hello brave world', 'brave');
    expect(resolveQuote('hello world', quote)).toBeNull();
  });
});

/**
 * The page changed under the highlight. Before these, a single different
 * character lost the passage for good; the exact passes still run first, so
 * none of this costs anything on a page that has not moved.
 */
describe('resolveQuote, allowing a page to have changed', () => {
  const on = { approximate: true };

  it('survives a typo being fixed in the page', () => {
    const was = 'The pg_upgrade utility performs an in-place upgade with minimal downtime.';
    const now = 'The pg_upgrade utility performs an in-place upgrade with minimal downtime.';
    const quote = quoteOf(was, 'performs an in-place upgade with minimal downtime');
    const span = resolveQuote(now, quote, on)!;
    expect(span).not.toBeNull();
    expect(now.slice(span.start, span.end)).toBe(
      'performs an in-place upgrade with minimal downtime',
    );
  });

  it('survives a word being respelled', () => {
    const was = 'Pick the colour that marks it best, then carry on reading the page.';
    const now = 'Pick the color that marks it best, then carry on reading the page.';
    const quote = quoteOf(was, 'colour that marks it best, then carry on reading');
    const span = resolveQuote(now, quote, on)!;
    expect(now.slice(span.start, span.end)).toContain('color that marks it best');
  });

  it('does none of this unless it is asked to', () => {
    const was = 'The pg_upgrade utility performs an in-place upgade with minimal downtime.';
    const now = 'The pg_upgrade utility performs an in-place upgrade with minimal downtime.';
    const quote = quoteOf(was, 'performs an in-place upgade with minimal downtime');
    expect(resolveQuote(now, quote)).toBeNull();
  });

  it('still refuses text that is simply not there', () => {
    const quote = quoteOf(
      'Postgres 17 changed how the planner handles partitioned tables entirely.',
      'changed how the planner handles partitioned tables',
    );
    expect(resolveQuote('A recipe for sourdough, and what to do with the starter.', quote, on)).toBeNull();
  });

  it('will not guess at a short phrase', () => {
    // Twelve characters with one error matches far too much to be worth placing.
    const quote = quoteOf('we ran the cat command first', 'the cat');
    expect(resolveQuote('we ran the car command first', quote, on)).toBeNull();
  });

  it('uses the surroundings to pick between two near-identical passages', () => {
    // The typo is fixed in both, so both read the same and both are one error
    // away from what was kept. Only the context says which one was highlighted.
    const was = 'In staging we ran the migraton twice. In production we ran the migraton twice.';
    const now = 'In staging we ran the migration twice. In production we ran the migration twice.';
    const quote = quoteOf(was, 'we ran the migraton twice', 1);
    const span = resolveQuote(now, quote, on)!;
    expect(now.slice(span.start, span.end)).toBe('we ran the migration twice');
    expect(now.slice(0, span.start)).toContain('In production');
  });

  it('refuses an edit too large to still be the same passage', () => {
    // "twice" to "two times" is six edits in a thirty-seven character quote.
    // Past a point a near match is a different sentence, and a highlight in
    // the wrong place is worse than one that says it could not be placed.
    const was = 'In production we ran the migration twice to be safe.';
    const now = 'In production we ran the migration two times to be safe.';
    const quote = quoteOf(was, 'we ran the migration twice to be safe');
    expect(resolveQuote(now, quote, on)).toBeNull();
  });

  it('reports offsets in the real text, not the collapsed one', () => {
    const was = 'alpha\n\n   the  passage   worth  keeping\n\nomega';
    const now = 'alpha\n\n   the  passage   worth  keepin\n\nomega';
    const quote = quoteOf(was, 'the  passage   worth  keeping');
    const span = resolveQuote(now, quote, on)!;
    expect(now.slice(span.start, span.end)).toBe('the  passage   worth  keepin');
  });
});
