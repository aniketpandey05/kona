import { beforeEach, describe, expect, it } from 'vitest';
import { HighlightPainter, HIGHLIGHT_COLORS, UI_COLORS } from '../src/core/painter';
import { MARK_FLASH, MARK_INK, MARK_NOTED, PEN_COLORS, PEN_MARKS } from '../src/design/tokens';
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

  it('writes a rule for every pen, in the pen it was made with', () => {
    new HighlightPainter(document);
    for (const pen of PENS) {
      expect(rules()).toContain(`::highlight(kona-${pen})`);
      expect(rules()).toContain(PEN_MARKS[pen]);
    }
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

  it('registers one layer per pen, plus the note and the flash', () => {
    new HighlightPainter(document);
    expect([...registry.keys()].sort()).toEqual(
      ['kona-blue', 'kona-flash', 'kona-green', 'kona-noted', 'kona-pink', 'kona-yellow'].sort(),
    );
  });

  it('puts a range in its pen layer, and in the note layer when it has one', () => {
    const painter = new HighlightPainter(document);
    const range = aRange();
    painter.paint([{ color: 'blue', range, noted: true }]);
    expect([...registry.get('kona-blue')!.ranges]).toEqual([range]);
    expect([...registry.get('kona-noted')!.ranges]).toEqual([range]);
    expect([...registry.get('kona-yellow')!.ranges]).toEqual([]);
  });

  it('repaints from scratch, so a deleted highlight stops being drawn', () => {
    const painter = new HighlightPainter(document);
    const range = aRange();
    painter.paint([{ color: 'blue', range, noted: false }]);
    painter.paint([]);
    expect([...registry.get('kona-blue')!.ranges]).toEqual([]);
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
