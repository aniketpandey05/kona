import { render } from 'preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Panel } from '../src/ui/Panel';
import type { KonaController, NoteCardState, ViewState } from '../src/content/controller';
import { DEFAULT_PENS } from '../src/core/pens';

/**
 * Escape, and what it closes.
 *
 * The panel is a dialog and the × was the only way out of it without a mouse.
 * Worse, while a bar was up Escape did nothing at all, so there were states
 * the keyboard could not leave.
 *
 * The rule is innermost first, one press per thing: the note editor answers
 * first, then a bar, then the panel. Each of those is in a different file,
 * which is exactly why the order is worth a test rather than a comment.
 */
let host: HTMLElement | undefined;

afterEach(() => {
  if (host) render(null, host);
  host?.remove();
  host = undefined;
});

const base: ViewState = {
  enabled: true,
  pageId: 'c1',
  items: [],
  undo: null,
  selection: null,
  card: null,
  health: 'ok',
  pens: DEFAULT_PENS,
  outlines: [],
} as unknown as ViewState;

const controller = () =>
  ({
    subscribe: vi.fn(() => () => undefined),
    getState: vi.fn(() => base),
  }) as unknown as KonaController;

function draw(state: ViewState) {
  host = document.createElement('div');
  document.body.append(host);
  render(<Panel state={state} controller={controller()} />, host);
  return host;
}

const escape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

/**
 * Long enough for Preact to render *and* run the effect that attaches the
 * listener. A microtask is not: the listener goes on after the paint, so a
 * test that only awaited a resolved promise pressed Escape at a document
 * nothing was listening to and watched the panel stay open.
 */
const settle = () => new Promise((done) => setTimeout(done, 20));
const openPanel = (where: HTMLElement) => where.querySelector<HTMLElement>('.kona-rest')?.click();

describe('Escape, with the panel open', () => {
  it('closes it, which only the × could do before', async () => {
    const where = draw(base);
    openPanel(where);
    await vi.waitFor(() => expect(where.querySelector('.kona-panel')).not.toBeNull());

    escape();
    await vi.waitFor(() => expect(where.querySelector('.kona-panel')).toBeNull());
    // Back to the mark it rests as, rather than to nothing at all.
    expect(where.querySelector('.kona-rest')).not.toBeNull();
  });

  it('leaves it alone while a bar is over a selection', async () => {
    // The bar answers this press. The panel is the room around it and closes
    // on the next one, so one press never takes away two things.
    const where = draw({ ...base, selection: { top: 10, bottom: 20, left: 5, streaming: false } });
    openPanel(where);
    await vi.waitFor(() => expect(where.querySelector('.kona-panel')).not.toBeNull());

    escape();
    await settle();
    expect(where.querySelector('.kona-panel')).not.toBeNull();
  });

  it('leaves it alone while a bar is over a highlight', async () => {
    const card: NoteCardState = { markId: 'm1', position: { top: 20, left: 5 }, focusNote: false };
    const where = draw({ ...base, card });
    openPanel(where);
    await vi.waitFor(() => expect(where.querySelector('.kona-panel')).not.toBeNull());

    escape();
    await settle();
    expect(where.querySelector('.kona-panel')).not.toBeNull();
  });

  it('stops listening once it is closed', async () => {
    // A listener left on the document after the panel has gone is the kind of
    // thing that works until a second Escape does something surprising.
    const where = draw(base);
    openPanel(where);
    await vi.waitFor(() => expect(where.querySelector('.kona-panel')).not.toBeNull());
    escape();
    await vi.waitFor(() => expect(where.querySelector('.kona-panel')).toBeNull());

    expect(() => escape()).not.toThrow();
    expect(where.querySelector('.kona-panel')).toBeNull();
  });
});
