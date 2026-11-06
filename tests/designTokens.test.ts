import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- a plain .mjs script, deliberately not part of the typed build
import { read, render } from '../scripts/tokens-css.mjs';
import { MARK_INK, PEN_COLORS, PEN_MARKS, cssVar, token } from '../src/design/tokens';
import type { HighlightColor } from '../src/core/types';

const CSS = resolve(process.cwd(), 'src/design/tokens.css');
const PENS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink'];

describe('the token file', () => {
  it('has the stylesheet that was generated from it', () => {
    // The one failure this file exists for: a value changed in tokens.json and
    // `npm run tokens` not run, so the stylesheets are still on the old value.
    expect(readFileSync(CSS, 'utf8')).toBe(render(read()));
  });

  it('decides each value in exactly one place', () => {
    const seen = new Set<string>();
    const twice: string[] = [];
    for (const group of read().groups) {
      for (const name of Object.keys(group.vars)) {
        if (seen.has(name)) twice.push(name);
        seen.add(name);
      }
    }
    expect(twice).toEqual([]);
  });

  it('names a token the same way in CSS and in code', () => {
    expect(cssVar('accent')).toBe('--kona-accent');
    expect(readFileSync(CSS, 'utf8')).toContain(`${cssVar('accent')}: ${token('accent')};`);
  });

  it('refuses a token that does not exist, rather than painting nothing', () => {
    expect(() => token('accnet')).toThrow(/No such token/);
  });
});

describe('the pens', () => {
  it('gives every pen a dot and a mark', () => {
    expect(Object.keys(PEN_COLORS).sort()).toEqual([...PENS].sort());
    expect(Object.keys(PEN_MARKS).sort()).toEqual([...PENS].sort());
  });

  it('paints over text with something you can read through', () => {
    // The marks sit on somebody else's words, so every one of them has to be
    // transparent. An opaque mark would hide the passage it is marking.
    for (const pen of PENS) expect(PEN_MARKS[pen]).toMatch(/^rgba\(.+, 0\.\d+\)$/);
  });

  it('draws a dot in Kona own rooms at full strength', () => {
    // On paper or on the slab there is nothing showing through, and the
    // transparent values wash out to almost nothing there.
    for (const pen of PENS) expect(PEN_COLORS[pen]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('writes dark text on a mark, whatever the page behind it', () => {
    expect(MARK_INK).toMatch(/^#[0-9a-f]{6}$/);
  });
});
