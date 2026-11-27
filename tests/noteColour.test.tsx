import { render } from 'preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SelectionBar } from '../src/ui/Bar';
import { Note } from '../src/ui/Note';
import { penToUse } from '../src/core/palette';
import { DEFAULT_PENS } from '../src/core/pens';
import type { KonaController, NoteCardState, ViewState } from '../src/content/controller';
import type { Mark, PenId } from '../src/core/types';

/**
 * Picking a colour and writing a note, which could not be done together.
 *
 * Note on a selection has to make the highlight before it can open a note on
 * it, so it chooses a colour for you, and it chose the first pen in the case:
 * yellow, until somebody rearranges them. Mark nine things in blue and the
 * tenth, the one you had something to say about, still came out yellow, with
 * no way to say otherwise short of closing the note, tapping the highlight
 * and starting again.
 *
 * Two halves to the answer. It uses the pen you last marked with, and the
 * note card carries the case so you can change it while you write.
 */
let host: HTMLElement | undefined;

afterEach(() => {
  if (host) render(null, host);
  host?.remove();
  host = undefined;
});

function draw(node: preact.ComponentChild): HTMLElement {
  host = document.createElement('div');
  document.body.append(host);
  render(node as never, host);
  return host;
}

const selection: NonNullable<ViewState['selection']> = {
  top: 100,
  bottom: 120,
  left: 40,
  streaming: false,
};

const mark = {
  id: 'm1',
  site: 'web',
  pageId: 'p1',
  pageTitle: 'How an amoeba moves',
  url: 'https://example.org/a',
  label: '',
  color: 'blue',
  snapshot: 'The outer layer stiffens into a gel',
  createdAt: 0,
  updatedAt: 0,
} as Mark;

const card: NoteCardState = { markId: 'm1', position: { top: 200, left: 60 }, focusNote: true };

const stub = (overrides: Partial<KonaController> = {}): KonaController =>
  ({
    highlight: vi.fn(),
    updateMark: vi.fn(),
    editNote: vi.fn(),
    ...overrides,
  }) as unknown as KonaController;

const noteButton = (where: HTMLElement) =>
  [...where.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Note');

describe('which pen Note uses', () => {
  it('is the one you marked with last, not whichever sits first', () => {
    const highlight = vi.fn();
    const where = draw(
      <SelectionBar
        selection={selection}
        controller={stub({ highlight })}
        pens={DEFAULT_PENS}
        lastPen="blue"
      />,
    );
    noteButton(where)?.click();
    expect(highlight).toHaveBeenCalledWith('blue', { withNote: true });
  });

  it('falls back to the first pen before anything has been marked', () => {
    const highlight = vi.fn();
    const where = draw(
      <SelectionBar
        selection={selection}
        controller={stub({ highlight })}
        pens={DEFAULT_PENS}
        lastPen={null}
      />,
    );
    noteButton(where)?.click();
    expect(highlight).toHaveBeenCalledWith(DEFAULT_PENS[0], { withNote: true });
  });

  it('does not hand back a pen that has been retired from the case', () => {
    // 12 rule 4: retiring a pen repaints nothing, so a colour can outlive the
    // case. Offering it here would put a pen back in your hand that you
    // deliberately put down.
    const short: PenId[] = ['green', 'pink'];
    expect(penToUse(short, 'blue')).toBe('green');
    expect(penToUse(short, 'pink')).toBe('pink');
  });
});

describe('the colour, inside the note', () => {
  it('offers the whole case', () => {
    const where = draw(<Note card={card} mark={mark} controller={stub()} pens={DEFAULT_PENS} />);
    expect(where.querySelectorAll('.kona-note-pen')).toHaveLength(DEFAULT_PENS.length);
  });

  it('shows which one it is marked in', () => {
    const where = draw(<Note card={card} mark={mark} controller={stub()} pens={DEFAULT_PENS} />);
    const on = where.querySelector('.kona-note-pen--on');
    expect(on?.getAttribute('aria-label')).toBe('Blue, in use');
    expect(on?.getAttribute('aria-pressed')).toBe('true');
  });

  it('changes the highlight when another is picked, without closing the note', () => {
    const updateMark = vi.fn();
    const where = draw(
      <Note card={card} mark={mark} controller={stub({ updateMark })} pens={DEFAULT_PENS} />,
    );
    const pink = [...where.querySelectorAll('.kona-note-pen')].find(
      (b) => b.getAttribute('aria-label') === 'Pink',
    );
    (pink as HTMLButtonElement | undefined)?.click();
    expect(updateMark).toHaveBeenCalledWith('m1', { color: 'pink' });
    // Still open: the mark exists already and nothing here is a draft but the
    // words, so a colour change does not interrupt what is being written.
    expect(where.querySelector('.kona-note-text')).not.toBeNull();
  });
});
