import { describe, expect, it } from 'vitest';
import { PEN_COLORS, PEN_MARKS } from '../src/design/tokens';
import {
  DEFAULT_PENS,
  hexToHsl,
  hslToHex,
  hsvToHex,
  isDefaultPen,
  nameOf,
  outlivedThePalette,
  penIdFor,
  penOf,
  pensInUse,
} from '../src/core/pens';

describe('what a pen is', () => {
  it('knows the four Kona starts with', () => {
    expect(DEFAULT_PENS).toEqual(['yellow', 'green', 'blue', 'pink']);
    for (const id of DEFAULT_PENS) {
      const pen = penOf(id);
      expect(pen.ink).toMatch(/^#[0-9a-f]{6}$/);
      expect(pen.mark).toMatch(/^rgba\(.+\)$/);
    }
  });

  it('takes the four from the token file and holds no value of its own', () => {
    // The dot and the mark are two different values on the boards, and
    // deriving the mark from the dot here repainted every yellow highlight a
    // slightly different yellow. Caught by tests/painter.test.ts.
    for (const id of DEFAULT_PENS) {
      const pen = penOf(id);
      expect(pen.ink).toBe(PEN_COLORS[id as 'yellow']);
      expect(pen.mark).toBe(PEN_MARKS[id as 'yellow']);
    }
  });

  it('calls a pen that shipped by its own name, not by its hue', () => {
    // Kona's yellow measures as amber. Renaming it would rename a pen that
    // has been called yellow since the first board; rule 3 is about the
    // colours you mix, which have no name until one is derived.
    expect(penOf('yellow').name).toBe('Yellow');
    expect(penOf('pink').name).toBe('Pink');
  });

  it('stores a colour of your own as a value, not a palette slot', () => {
    // Rule 4: a highlight keeps the colour it was made with, so the mark has
    // to carry the colour itself. A reference would change under it when the
    // pen was edited or removed.
    const id = penIdFor('#14B8A6', 0.45);
    expect(id).toBe('#14b8a6@45');
    const pen = penOf(id);
    expect(pen.ink).toBe('#14b8a6');
    expect(pen.mark).toBe('rgba(20, 184, 166, 0.45)');
  });

  it('allows a pen with no transparency at all', () => {
    // No ceiling on the slider: it is the person's own pen, and a bad pick
    // affects nothing already marked.
    expect(penOf(penIdFor('#000000', 1)).mark).toBe('rgba(0, 0, 0, 1)');
  });

  it('falls back rather than throwing on a colour it cannot read', () => {
    // A highlight whose colour is unreadable is still a passage somebody kept.
    expect(penOf('not-a-colour').id).toBe('yellow');
    expect(penOf('#12345@50').id).toBe('yellow');
  });

  it('tells a default pen from one of your own', () => {
    expect(isDefaultPen('green')).toBe(true);
    expect(isDefaultPen('#14b8a6@45')).toBe(false);
  });
});

describe('naming a colour', () => {
  it('is derived from the hue, never chosen', () => {
    // Deterministic, or two devices name one colour differently and sync has a
    // disagreement to carry.
    expect(nameOf('#14b8a6')).toBe('Teal');
    expect(nameOf('#3b82f6')).toBe('Blue');
    expect(nameOf('#db2777')).toBe('Pink');
    expect(nameOf('#16a34a')).toBe('Green');
  });

  it('gives the same answer every time, for the same value', () => {
    expect(nameOf('#14B8A6')).toBe(nameOf('#14b8a6'));
  });

  it('says grey rather than naming a hue that is not there', () => {
    expect(nameOf('#808080')).toBe('Grey');
    expect(nameOf('#f4f4f5')).toBe('Pale grey');
    expect(nameOf('#1f2023')).toBe('Charcoal');
  });

  it('says how light it is when that is what distinguishes it', () => {
    expect(nameOf('#fde68a')).toMatch(/^Pale /);
    expect(nameOf('#422006')).toMatch(/^Deep /);
  });
});

describe('hue and back', () => {
  it('round-trips a colour through hsl', () => {
    for (const hex of ['#eab308', '#16a34a', '#3b82f6', '#db2777', '#14b8a6']) {
      const [h, s, l] = hexToHsl(hex);
      expect(hslToHex(h, s, l)).toBe(hex);
    }
  });
});

describe('the square you pick a colour out of', () => {
  it('is fully saturated and fully bright in its top-right corner', () => {
    // x is how much of the hue, y is how dark: the corner is the hue itself.
    expect(hsvToHex(174, 1, 1)).toBe(hslToHex(174, 1, 0.5));
  });

  it('is white at the top left and black along the bottom', () => {
    expect(hsvToHex(174, 0, 1)).toBe('#ffffff');
    expect(hsvToHex(174, 1, 0)).toBe('#000000');
    expect(hsvToHex(20, 0.5, 0)).toBe('#000000');
  });

  it('reaches the teal the boards are drawn with', () => {
    // #14b8a6, which is where the board's marker sits: hue 173.41, and 89% of
    // the way across a square 72.2% of the way up it.
    expect(hsvToHex(173.41, 164 / 184, 184 / 255)).toBe('#14b8a6');
  });
});

describe('the colours in use', () => {
  const library = ['yellow', 'yellow', 'green', '#14b8a6@45', 'yellow', '#14b8a6@45'];

  it('counts what the library actually contains, commonest first', () => {
    const inUse = pensInUse(library);
    expect(inUse.map((each) => [each.pen.id, each.count])).toEqual([
      ['yellow', 3],
      ['#14b8a6@45', 2],
      ['green', 1],
    ]);
  });

  it('keeps a colour that is no longer a pen', () => {
    // Taking a pen out of the case never changes a mark already made, so the
    // colours in use can outnumber the palette and stay filterable.
    const inUse = pensInUse(library);
    const gone = outlivedThePalette(['yellow', 'green', 'blue', 'pink'], inUse);
    expect(gone.map((each) => each.pen.name)).toEqual(['Teal']);
    expect(gone[0]?.count).toBe(2);
  });

  it('reports nothing left over when the palette still holds everything', () => {
    const inUse = pensInUse(['yellow', 'green']);
    expect(outlivedThePalette(['yellow', 'green', 'blue', 'pink'], inUse)).toEqual([]);
  });
});
