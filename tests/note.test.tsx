import { render } from 'preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Note } from '../src/ui/Note';
import type { KonaController, NoteCardState } from '../src/content/controller';
import type { Mark } from '../src/core/types';

let host: HTMLElement | undefined;

function draw(node: preact.ComponentChild): HTMLElement {
  host = document.createElement('div');
  document.body.append(host);
  render(node as never, host);
  return host;
}

/** Long enough for preact's effects to have run. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 50));

afterEach(() => {
  if (host) render(null, host);
  host?.remove();
  host = undefined;
});

const mark = {
  id: 'm1',
  site: 'web',
  conversationId: 'c1',
  conversationTitle: 'How an amoeba moves',
  url: 'https://example.org/a',
  label: '',
  color: 'blue',
  snapshot: 'The outer layer stiffens into a gel',
  tags: ['osmosis'],
  createdAt: 0,
  updatedAt: 0,
} as Mark;

const card: NoteCardState = { markId: 'm1', position: { top: 200, left: 60 }, focusNote: true };

function stub(overrides: Partial<KonaController> = {}): KonaController {
  return {
    saveNote: vi.fn(),
    updateMark: vi.fn(),
    remove: vi.fn(),
    closeCard: vi.fn(),
    ...overrides,
  } as unknown as KonaController;
}

describe('the note editor', () => {
  it('is your words and your tags, and nothing the bar already has', () => {
    // 10c puts the pens and Delete on the bar, and the editor opens from it.
    // Repeating them here is the same control in two places.
    const el = draw(<Note card={card} mark={mark} controller={stub()} />);
    expect(el.querySelector('.kona-note-text')).not.toBeNull();
    expect(el.querySelector('.kona-bar-pen')).toBeNull();
    expect(el.textContent).not.toMatch(/delete/i);
  });

  it('opens on what was already written', () => {
    const el = draw(<Note card={card} mark={{ ...mark, note: 'active or passive?' }} controller={stub()} />);
    expect(el.querySelector<HTMLTextAreaElement>('.kona-note-text')?.value).toBe(
      'active or passive?',
    );
  });

  it('saves what is in the box, not what a stale render thought', () => {
    const controller = stub();
    const el = draw(<Note card={card} mark={mark} controller={controller} />);
    const area = el.querySelector<HTMLTextAreaElement>('.kona-note-text')!;
    area.value = 'typed after the render';
    el.querySelector<HTMLElement>('.kona-note-save')?.click();
    expect(controller.saveNote).toHaveBeenCalledWith('m1', 'typed after the render');
  });

  it('keeps what was typed when you click away, rather than throwing it out', async () => {
    // Losing a sentence because you looked at the page it was about would be
    // the worst small failure this screen has available.
    const controller = stub();
    const el = draw(<Note card={card} mark={mark} controller={controller} />);
    // preact schedules effects on an animation frame, which happy-dom backs
    // with a timer, so the click-away listener is not attached on the tick
    // the component renders, nor on the next one. Measured: it needs a frame.
    await settled();
    el.querySelector<HTMLTextAreaElement>('.kona-note-text')!.value = 'half a thought';
    window.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(controller.saveNote).toHaveBeenCalledWith('m1', 'half a thought');
  });

  it('shows the tags it has and takes one off when clicked', () => {
    const controller = stub();
    const el = draw(<Note card={card} mark={mark} controller={controller} />);
    const tag = el.querySelector<HTMLElement>('.kona-note-tag');
    expect(tag?.textContent).toContain('osmosis');
    tag?.click();
    expect(controller.updateMark).toHaveBeenCalledWith('m1', { tags: [] });
  });

  it('says what the note is about when there is no highlight to sit beside', () => {
    const el = draw(<Note card={{ ...card, position: null }} mark={mark} controller={stub()} />);
    expect(el.querySelector('.kona-note-quote')?.textContent).toBe(
      'The outer layer stiffens into a gel',
    );
    expect(el.querySelector('.kona-note')?.className).toContain('kona-note--docked');
  });

  it('does not repeat the passage when it is sitting on it', () => {
    const el = draw(<Note card={card} mark={mark} controller={stub()} />);
    expect(el.querySelector('.kona-note-quote')).toBeNull();
  });

  it('closes on Escape without saving over what is there', () => {
    const controller = stub();
    const el = draw(<Note card={card} mark={mark} controller={controller} />);
    el.querySelector('.kona-note')?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(controller.closeCard).toHaveBeenCalled();
  });
});
