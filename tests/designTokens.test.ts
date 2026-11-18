import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error: a plain .mjs script, deliberately not part of the typed build
import { read, render } from '../scripts/tokens-css.mjs';
import { MARK_INK, PEN_COLORS, PEN_MARKS, cssVar, token } from '../src/design/tokens';
import type { HighlightColor } from '../src/core/types';

const CSS = resolve(process.cwd(), 'src/design/tokens.css');
const PENS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink'];

describe('the token file', () => {
  it('has the stylesheet that was generated from it', () => {
    // The one failure this file exists for: a value changed in tokens.json and
    // `npm run tokens` not run, so the stylesheets are still on the old value.
    //
    // Line endings are normalised first. .gitattributes pins both files to LF,
    // and this is the second guard: on Windows an editor can still save CRLF,
    // and a test that fails over a carriage return teaches everyone to ignore
    // it, which costs the drift it was written to catch.
    const lf = (text: string) => text.replace(/\r\n/g, '\n');
    expect(lf(readFileSync(CSS, 'utf8'))).toBe(lf(render(read())));
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

/**
 * Contrast, computed rather than eyeballed.
 *
 * This exists because the knowledge was had and then lost. A comment in the
 * stylesheet the rebuild deleted said that the accent as a *fill* is a
 * different problem from the accent as a line, and three filled buttons went
 * out at 3.50:1 before anybody noticed again.
 */
function luminance(hex: string): number {
  const channel = (pair: string) => {
    const value = parseInt(pair, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const clean = hex.replace('#', '');
  return (
    0.2126 * channel(clean.slice(0, 2)) +
    0.7152 * channel(clean.slice(2, 4)) +
    0.0722 * channel(clean.slice(4, 6))
  );
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('text you have to be able to read', () => {
  it('carries its ink on the accent fill, at AA', () => {
    // 4.5:1 is AA for normal text. Anything that puts words on the accent uses
    // these two and never --kona-accent, which is for a shape.
    expect(contrast(token('accent-fill'), token('accent-fill-ink'))).toBeGreaterThanOrEqual(4.5);
  });

  it('is why the plain accent is not a background for text', () => {
    // Recorded as a fact rather than a rule nobody can check: this is the
    // value that fails, and the reason the fill exists at all.
    expect(contrast(token('accent'), token('accent-fill-ink'))).toBeLessThan(4.5);
  });

  it('reads a passage comfortably in both rooms', () => {
    expect(contrast(token('paper-ink'), token('paper'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('slab-ink-passage'), token('slab-card'))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps even the quietest text legible', () => {
    // The source line under a passage, and a note on the slab. Quiet is not an
    // excuse: these are still words somebody has to read.
    expect(contrast(token('paper-ink-muted'), token('paper'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('slab-ink-note'), token('slab-card'))).toBeGreaterThanOrEqual(4.5);
  });

  // What a mark's ink actually sits on is the mark composited over the page,
  // not the pen at full strength, measuring the wrong pair is what hid the
  // dark-page defect. It is measured properly in tests/painter.test.ts.
});

/**
 * Dark, for the rooms made of paper.
 *
 * Settings offered Match the system, Light and Dark, stamped the answer on
 * `<html>`, and nothing read it: there was no dark in the token file at all,
 * so the library stayed cream whichever chip was lit. These are the
 * conditions that make the choice mean something, and the one that keeps it
 * away from the panel.
 */
describe('dark', () => {
  const dark = (name: string): string => {
    const value = (read().dark as Record<string, string>)[name];
    if (!value) throw new Error(`No such dark token: ${name}`);
    return value;
  };

  it('reads a passage comfortably, the same bar the light room has to clear', () => {
    expect(contrast(dark('paper-ink'), dark('paper'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark('paper-ink-heading'), dark('paper'))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the quiet text and the links legible too', () => {
    expect(contrast(dark('paper-ink-muted'), dark('paper'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark('paper-ink-note'), dark('paper-raised'))).toBeGreaterThanOrEqual(4.5);
    // The light theme's link is a dark orange, which disappears on dark paper.
    expect(contrast(dark('accent-link'), dark('paper'))).toBeGreaterThanOrEqual(4.5);
  });

  it('overrides only tokens that already exist, rather than inventing any', () => {
    const light = new Set<string>();
    for (const group of read().groups) for (const name of Object.keys(group.vars)) light.add(name);
    const orphans = Object.keys(read().dark as object).filter((name) => !light.has(name));
    expect(orphans).toEqual([]);
  });

  it('never reaches the panel, which 17 settled as dark over any page', () => {
    // The panel is drawn in a shadow root wearing `.kona-tokens`, and the main
    // block hands it the light paper values on purpose. A dark rule written
    // against that class, or against `:host`, would make the one surface that
    // must not follow a preference follow one.
    const css = readFileSync(CSS, 'utf8');
    const blocks = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
    expect(blocks).not.toContain('.kona-tokens');
    expect(blocks).not.toContain(':host');
    expect(blocks).toContain(":root:not([data-theme='light'])");
    expect(blocks).toContain("[data-theme='dark']");
  });

  it('lets a light choice survive a dark operating system', () => {
    // Without the :not(), somebody who picked Light would be overruled by
    // their machine every evening, which is the half of this that is easy to
    // leave out and impossible to notice on a light laptop.
    const css = readFileSync(CSS, 'utf8');
    expect(css).toMatch(
      /@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme='light'\]\)/,
    );
  });
});
