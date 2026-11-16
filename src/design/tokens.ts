/**
 * The tokens, for the code rather than for a stylesheet.
 *
 * Most of Kona's tokens are only ever read by CSS, and `tokens.css` is where
 * they arrive. A few have to exist in TypeScript as well, because the thing
 * that uses them is not a stylesheet: the CSS Custom Highlight API is driven
 * from script, so `painter.ts` builds its `::highlight()` rules as text and
 * needs the pen colours as values.
 *
 * Both halves read `tokens.json`, so there is still one place a token is
 * decided. Nothing here holds a value of its own, and nothing here should
 * grow to: if a value is only ever used in CSS, it belongs in the stylesheet
 * and not in this file.
 */
import type { HighlightColor } from '../core/types';
import tokens from './tokens.json';

const vars: Record<string, string> = Object.fromEntries(
  tokens.groups.flatMap((group) => Object.entries(group.vars)),
);

/**
 * One token, by the name it has in `tokens.json`, so `token('accent')` for
 * what CSS calls `--kona-accent`. Throws rather than returning undefined,
 * because a missing token is a typo and silently painting nothing is worse
 * than stopping.
 */
export function token(name: string): string {
  const value = vars[name];
  if (value === undefined) throw new Error(`No such token: ${name}`);
  return value;
}

/** The custom-property name CSS knows a token by. */
export function cssVar(name: string): string {
  return `--${tokens.prefix}-${name}`;
}

const PENS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink'];

/**
 * The pens at full strength, for Kona's own rooms: a dot in the panel, a
 * dot in the library, where the colour sits on a plain background.
 */
export const PEN_COLORS: Record<HighlightColor, string> = Object.fromEntries(
  PENS.map((pen) => [pen, token(`pen-${pen}`)]),
) as Record<HighlightColor, string>;

/**
 * The pens as painted over somebody else's text, transparent so the words
 * underneath stay readable.
 */
export const PEN_MARKS: Record<HighlightColor, string> = Object.fromEntries(
  PENS.map((pen) => [pen, token(`pen-${pen}-mark`)]),
) as Record<HighlightColor, string>;

/**
 * The ink written on a mark, which depends on the page under it.
 *
 * A mark is transparent, so the words end up on the mark *and* whatever the
 * page puts behind it. Dark ink reads at 9.5:1 or better over a light page and
 * collapses to 1.5:1 over a dark one, a highlight that makes text harder to
 * read than leaving it alone. So the painter asks the page first.
 */
export const MARK_INK = token('mark-ink');
export const MARK_INK_DARK = token('mark-ink-dark');

/** The ink to write on a mark, given how dark the page behind it is. */
export function markInk(pageIsDark: boolean): string {
  return pageIsDark ? MARK_INK_DARK : MARK_INK;
}

/** The dotted underline that says a highlight carries a note. */
export const MARK_NOTED = token('mark-noted');

/** The brief flare when Kona has just landed you on a passage. */
export const MARK_FLASH = token('mark-flash');
