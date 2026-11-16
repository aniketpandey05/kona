import { beforeEach, describe, expect, it } from 'vitest';
import { HighlightPainter, HIGHLIGHT_COLORS, UI_COLORS } from '../src/core/painter';
import {
  MARK_FLASH,
  MARK_INK,
  MARK_INK_DARK,
  MARK_NOTED,
  PEN_COLORS,
  PEN_MARKS,
} from '../src/design/tokens';
import type { HighlightColor } from '../src/core/types';

/**
 * The painter is the main ability made visible: a highlight that is found
 * again has to be *drawn* again, in the colour it was made with, over text
 * Kona does not own.
 *
 * It had no test. Moving the pen values into the token file was the only
 * change ever made to it during the rebuild, and that change was exactly the
 * kind that compiles, passes everything else, and silently paints nothing.
 *
 * The CSS Custom Highlight API does not exist in happy-dom, so the two globals
 * it needs are stood up here. They are deliberately thin: what is being
 * checked is the rules the painter writes and the ranges it hands over, not
 * the browser's implementation of them.
 */
class FakeHighlight {
  readonly ranges = new Set<Range>();
  priority = 0;
  add(range: Range) {
    this.ranges.add(range);
  }
  clear() {
    this.ranges.clear();
  }
  [Symbol.iterator]() {
    return this.ranges[Symbol.iterator]();
  }
}

let registry: Map<string, FakeHighlight>;

beforeEach(() => {
  registry = new Map();
  (globalThis as Record<string, unknown>).Highlight = FakeHighlight;
  // happy-dom defines CSS with only a getter, so assignment throws.
  Object.defineProperty(globalThis, 'CSS', {
    configurable: true,
    value: {
      highlights: {
        set: (name: string, layer: FakeHighlight) => registry.set(name, layer),
        delete: (name: string) => registry.delete(name),
      },
    },
  });
  document.head.innerHTML = '';
  document.body.innerHTML = '<p>An amoeba moves by extending a pseudopod</p>';
});

const PENS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink'];

function aRange(): Range {
  const range = document.createRange();
  range.selectNodeContents(document.querySelector('p')!);
  return range;
}

function rules(): string {
  return document.querySelector('style[data-kona-ui]')?.textContent ?? '';
}

describe('painting a highlight', () => {
  it('is supported where the API is', () => {
    expect(HighlightPainter.isSupported()).toBe(true);
  });

  it('writes a rule for the pen a highlight was made with', () => {
    // A layer per colour *on the page*, made as the colours appear, rather
    // than a fixed four: a palette is a set of pens you add to (12), so the
    // painter cannot know the list up front.
    const painter = new HighlightPainter(document);
    painter.paint(PENS.map((color) => ({ color, range: aRange(), noted: false })));
    for (const pen of PENS) {
      expect(rules()).toContain(`::highlight(kona-${pen})`);
      expect(rules()).toContain(PEN_MARKS[pen]);
    }
  });

  it('paints a colour you mixed yourself, not only the four built in', () => {
    // The id is a value, `#14b8a6@45`, and `::highlight()` takes a custom
    // ident, so the name is sanitised. If this ever stops matching the rule
    // the painter writes, a highlight in your own colour paints nothing.
    const painter = new HighlightPainter(document);
    const range = aRange();
    painter.paint([{ color: '#14b8a6@45', range, noted: false }]);
    expect(rules()).toContain('::highlight(kona--14b8a6-45)');
    expect(rules()).toContain('rgba(20, 184, 166, 0.45)');
    expect([...registry.get('kona--14b8a6-45')!.ranges]).toEqual([range]);
  });

  it('takes its colours from the token file and holds none of its own', () => {
    // The whole point of the indirection. If these ever diverge, the panel and
    // the page are drawing the same highlight two different colours.
    expect(HIGHLIGHT_COLORS).toBe(PEN_MARKS);
    expect(UI_COLORS).toBe(PEN_COLORS);
  });

  it('writes dark text on every mark, so a pale pen stays readable', () => {
    new HighlightPainter(document);
    expect(rules()).toContain(`color: ${MARK_INK}`);
  });

  it('underlines a highlight that carries a note, and flashes one it landed on', () => {
    new HighlightPainter(document);
    expect(rules()).toContain(MARK_NOTED);
    expect(rules()).toContain(MARK_FLASH);
  });

  it('registers the note and the flash up front, and a pen when one is used', () => {
    const painter = new HighlightPainter(document);
    expect([...registry.keys()].sort()).toEqual(['kona-flash', 'kona-noted']);
    painter.paint([{ color: 'blue', range: aRange(), noted: false }]);
    expect([...registry.keys()].sort()).toEqual(['kona-blue', 'kona-flash', 'kona-noted']);
  });

  it('puts a range in its pen layer, and in the note layer when it has one', () => {
    const painter = new HighlightPainter(document);
    const range = aRange();
    painter.paint([{ color: 'blue', range, noted: true }]);
    expect([...registry.get('kona-blue')!.ranges]).toEqual([range]);
    expect([...registry.get('kona-noted')!.ranges]).toEqual([range]);
    // Nothing on this page is yellow, so there is no yellow layer to hold a
    // range: the registry carries the colours in use, not the palette.
    expect(registry.get('kona-yellow')).toBeUndefined();
  });

  it('repaints from scratch, so a deleted highlight stops being drawn', () => {
    const painter = new HighlightPainter(document);
    const range = aRange();
    painter.paint([{ color: 'blue', range, noted: false }]);
    expect([...registry.get('kona-blue')!.ranges]).toEqual([range]);
    painter.paint([]);
    // The layer goes with the last highlight that used it, so a long session
    // does not leave a registry entry behind for every colour ever seen.
    expect(registry.get('kona-blue')).toBeUndefined();
    expect(rules()).not.toContain('::highlight(kona-blue)');
  });

  it('flashes one passage at a time when Kona lands you on it', () => {
    const painter = new HighlightPainter(document);
    const first = aRange();
    const second = aRange();
    painter.flashRange(first);
    painter.flashRange(second);
    expect([...registry.get('kona-flash')!.ranges]).toEqual([second]);
    painter.clearFlash();
    expect([...registry.get('kona-flash')!.ranges]).toEqual([]);
  });

  it('takes everything of its own away again', () => {
    // Kona is a guest on every page it appears on (2c), which includes
    // leaving nothing behind when the script is torn down.
    const painter = new HighlightPainter(document);
    painter.dispose();
    expect(registry.size).toBe(0);
    expect(document.querySelector('style[data-kona-ui]')).toBeNull();
  });
});

/**
 * What the words actually sit on.
 *
 * A mark is transparent, so the readable colour is the mark composited over
 * whatever the page puts behind it, not the mark alone. Measuring the mark
 * on its own is what hid this: dark ink over a dark page falls to 1.5:1, and a
 * highlight that makes text harder to read than not highlighting it is a
 * defect in the one thing Kona does.
 */
function luminance(rgb: [number, number, number]): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const asRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
};

/** A mark laid over a page background, as the browser would composite it. */
function markOver(mark: string, page: [number, number, number]): [number, number, number] {
  const parts = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(mark)!;
  const alpha = Number(parts[4]);
  return [0, 1, 2].map((i) =>
    Math.round(Number(parts[i + 1]) * alpha + page[i]! * (1 - alpha)),
  ) as [number, number, number];
}

const WHITE: [number, number, number] = [255, 255, 255];
const NEAR_BLACK: [number, number, number] = [23, 24, 26];

describe('a highlight you can still read', () => {
  it('is legible on a light page, with the dark ink', () => {
    for (const pen of PENS) {
      const on = markOver(PEN_MARKS[pen], WHITE);
      expect(contrast(asRgb(MARK_INK), on)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('is legible on a dark page, with the light one', () => {
    // The case that was broken: ChatGPT and most documentation sites in dark
    // mode, which is a lot of where Kona is meant to be used.
    for (const pen of PENS) {
      const on = markOver(PEN_MARKS[pen], NEAR_BLACK);
      expect(contrast(asRgb(MARK_INK_DARK), on)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('would have been unreadable on a dark page with the dark ink', () => {
    // Kept as the record of the defect, so switching the ink back cannot look
    // like a tidy-up.
    const on = markOver(PEN_MARKS.pink, NEAR_BLACK);
    expect(contrast(asRgb(MARK_INK), on)).toBeLessThan(3);
  });

  it('switches ink when the page says it is dark', () => {
    const painter = new HighlightPainter(document);
    expect(rules()).toContain(MARK_INK);
    painter.setPageDark(true);
    expect(rules()).toContain(MARK_INK_DARK);
    painter.setPageDark(false);
    expect(rules()).toContain(MARK_INK);
  });
});
