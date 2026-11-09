import { render } from 'preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarkBar, SelectionBar } from '../src/ui/Bar';
import { PEN_COLORS } from '../src/design/tokens';
import type { KonaController, NoteCardState, ViewState } from '../src/content/controller';
import type { Mark } from '../src/core/types';

let host: HTMLElement | undefined;

function draw(node: preact.ComponentChild): HTMLElement {
  host = document.createElement('div');
  document.body.append(host);
  render(node as never, host);
  return host;
}

afterEach(() => {
  if (host) render(null, host);
  host?.remove();
  host = undefined;
});

const selection: NonNullable<ViewState['selection']> = {
  top: 100,
  bottom: 120,
  left: 40,
  streaming: false,
};

const mark = {
  id: 'm1',
  site: 'web',
  conversationId: 'c1',
  conversationTitle: 'How an amoeba moves',
  url: 'https://example.org/a',
  label: '',
  color: 'blue',
  snapshot: 'The outer layer stiffens into a gel',
  createdAt: 0,
  updatedAt: 0,
} as Mark;

const card: NoteCardState = { markId: 'm1', position: { top: 200, left: 60 }, focusNote: false };

function stub(overrides: Partial<KonaController> = {}): KonaController {
  return {
    highlight: vi.fn(),
    updateMark: vi.fn(),
    editNote: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  } as unknown as KonaController;
}

describe('the bar, marking something', () => {
  it('offers every pen and nothing to delete yet', () => {
    const el = draw(<SelectionBar selection={selection} controller={stub()} />);
    expect(el.querySelectorAll('.kona-bar-pen')).toHaveLength(4);
    // Nothing is marked yet, so no pen is in use.
    expect(el.querySelector('.kona-bar-pen--in-use')).toBeNull();
    expect([...el.querySelectorAll('.kona-bar-action')].map((b) => b.textContent)).toEqual(['Note']);
  });

  it('shows the pens at full strength, not the value painted on the page', () => {
    // The bar is one of Kona's own rooms. The transparent mark washes out to
    // almost nothing on the slab, which is what the two values are for.
    const el = draw(<SelectionBar selection={selection} controller={stub()} />);
    const first = el.querySelector<HTMLElement>('.kona-bar-pen');
    expect(first?.style.background).toBe(PEN_COLORS.yellow);
  });

  it('marks the passage in the pen that was picked', () => {
    const controller = stub();
    const el = draw(<SelectionBar selection={selection} controller={controller} />);
    el.querySelectorAll<HTMLElement>('.kona-bar-pen')[2]?.click();
    expect(controller.highlight).toHaveBeenCalledWith('blue');
  });

  it('says to wait rather than marking half a reply', () => {
    const el = draw(
      <SelectionBar selection={{ ...selection, streaming: true }} controller={stub()} />,
    );
    expect(el.querySelector('.kona-bar-wait')).not.toBeNull();
    expect(el.querySelector('.kona-bar-pen')).toBeNull();
  });
});

describe('the bar, on a highlight you already made', () => {
  it('is the same bar, now with delete (10c)', () => {
    const el = draw(<MarkBar card={card} mark={mark} controller={stub()} />);
    expect(el.querySelectorAll('.kona-bar-pen')).toHaveLength(4);
    expect([...el.querySelectorAll('.kona-bar-action')].map((b) => b.textContent)).toEqual([
      'Note',
      'Delete',
    ]);
  });

  it('offers no archive, because archiving would change nothing you can see', () => {
    // DEFINITIONS, Archive: an archived highlight is still painted where you
    // made it, so the gesture belongs in the library and not on the page.
    const el = draw(<MarkBar card={card} mark={mark} controller={stub()} />);
    expect(el.textContent).not.toMatch(/archive/i);
  });

  it('rings the pen it was marked with', () => {
    const el = draw(<MarkBar card={card} mark={mark} controller={stub()} />);
    const inUse = el.querySelector('.kona-bar-pen--in-use');
    expect(inUse?.getAttribute('aria-label')).toBe('blue, in use');
  });

  it('changes the colour rather than making a second highlight', () => {
    const controller = stub();
    const el = draw(<MarkBar card={card} mark={mark} controller={controller} />);
    el.querySelectorAll<HTMLElement>('.kona-bar-pen')[0]?.click();
    expect(controller.updateMark).toHaveBeenCalledWith('m1', { color: 'yellow' });
    expect(controller.highlight).not.toHaveBeenCalled();
  });

  it('hands Note and Delete to the highlight it is about', () => {
    const controller = stub();
    const el = draw(<MarkBar card={card} mark={mark} controller={controller} />);
    const [note, remove] = [...el.querySelectorAll<HTMLElement>('.kona-bar-action')];
    note?.click();
    remove?.click();
    expect(controller.editNote).toHaveBeenCalledWith('m1');
    expect(controller.remove).toHaveBeenCalledWith('m1');
  });

  it('draws nothing when there is nowhere to put it', () => {
    // The controller reports a null position when the highlight is no longer
    // on screen. A bar at 0,0 in the corner would be worse than none.
    const el = draw(<MarkBar card={{ ...card, position: null }} mark={mark} controller={stub()} />);
    expect(el.querySelector('.kona-bar')).toBeNull();
  });
});
