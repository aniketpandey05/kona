import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from 'preact';
import { afterEach, describe, expect, it } from 'vitest';
import { Passage } from '../src/design/Passage';
import { PEN_COLORS } from '../src/design/tokens';
import type { HighlightColor } from '../src/core/types';

const PENS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink'];

let host: HTMLElement | undefined;

function draw(node: ReturnType<typeof Passage>): HTMLElement {
  host = document.createElement('div');
  document.body.append(host);
  render(node, host);
  return host;
}

afterEach(() => {
  if (host) render(null, host);
  host?.remove();
  host = undefined;
});

describe('a passage', () => {
  it('is the pen, the words, and nothing else when there is no note', () => {
    const el = draw(<Passage color="yellow" text="An amoeba moves by extending a pseudopod" />);
    expect(el.querySelector('.kona-passage-pen')).not.toBeNull();
    expect(el.querySelector('.kona-passage-text')?.textContent).toBe(
      'An amoeba moves by extending a pseudopod',
    );
    expect(el.querySelector('.kona-passage-note')).toBeNull();
  });

  it('keeps your note apart from what the page said', () => {
    // DEFINITIONS, Note: the two are never mixed together. If this ever starts
    // returning one string, they have been.
    const el = draw(
      <Passage color="blue" text="Contractile vacuoles expel water" note="active or passive?" />,
    );
    expect(el.querySelector('.kona-passage-text')?.textContent).toBe(
      'Contractile vacuoles expel water',
    );
    expect(el.querySelector('.kona-passage-note')?.textContent).toBe('active or passive?');
  });

  it('draws no note for one that was opened and left blank', () => {
    for (const note of ['', null, undefined]) {
      const el = draw(<Passage color="green" text="Feeding uses the same motion" note={note} />);
      expect(el.querySelector('.kona-passage-note')).toBeNull();
      render(null, el);
      el.remove();
    }
  });

  it('marks the pen with the colour it was made with', () => {
    for (const pen of PENS) {
      const el = draw(<Passage color={pen} text="Pseudopods surround a food particle" />);
      const dot = el.querySelector<HTMLElement>('.kona-passage-pen');
      expect(dot?.style.background).toBe(PEN_COLORS[pen]);
      render(null, el);
      el.remove();
    }
  });

  it('hides the pen from a screen reader, leaving the colour to the frame', () => {
    const el = draw(<Passage color="pink" text="Not all amoeboid organisms are related" />);
    expect(el.querySelector('.kona-passage-pen')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('puts the words before the note, always', () => {
    const el = draw(<Passage color="yellow" text="the words" note="the note" />);
    const body = el.querySelector('.kona-passage-body');
    expect([...(body?.children ?? [])].map((child) => child.className)).toEqual([
      'kona-passage-text',
      'kona-passage-note',
    ]);
  });
});

describe('the passage stylesheet', () => {
  it('asks only for tokens that exist', () => {
    // A misspelled var() renders nothing at all and says nothing about it, so
    // a passage would simply lose its colour or its size with no error
    // anywhere. This is the check that turns that into a failure.
    const tokens = JSON.parse(
      readFileSync(resolve(process.cwd(), 'src/design/tokens.json'), 'utf8'),
    );
    const css = readFileSync(resolve(process.cwd(), 'src/design/passage.css'), 'utf8');

    const declared = new Set<string>(
      tokens.groups.flatMap((group: { vars: Record<string, string> }) =>
        Object.keys(group.vars).map((name) => `--${tokens.prefix}-${name}`),
      ),
    );
    // The passage's own properties, which it declares before it uses them.
    for (const match of css.matchAll(/^\s*(--[\w-]+)\s*:/gm)) declared.add(match[1] ?? '');

    const missing = [...css.matchAll(/var\(\s*(--[\w-]+)/g)]
      .map((match) => match[1] ?? '')
      .filter((name) => !declared.has(name));

    expect([...new Set(missing)]).toEqual([]);
  });

  it('keeps a long passage whole, and shows its opening first (19)', () => {
    // No limit on what can be kept and no invented number for it: what the
    // interface does about length is truncate, never refuse.
    const long = 'An amoeba moves by extending a pseudopod. '.repeat(30);
    const el = draw(<Passage color="yellow" text={long} href="https://example.org/a" />);
    const shown = el.querySelector('.kona-passage-text')?.textContent ?? '';
    expect(shown.length).toBeLessThan(long.length);
    expect(shown.endsWith('…')).toBe(true);
    // Cut at a word, never through one.
    expect(shown.slice(0, -1).trimEnd()).toBe(shown.slice(0, -1));
  });

  it('opens the whole of it out, in place', async () => {
    const long = 'An amoeba moves by extending a pseudopod. '.repeat(30);
    const el = draw(<Passage color="yellow" text={long} href="https://example.org/a" />);
    el.querySelector<HTMLElement>('.kona-passage-more')?.click();
    // Preact schedules its re-render; happy-dom needs a real tick for it.
    await new Promise((done) => setTimeout(done, 50));
    expect(el.querySelector('.kona-passage-text')?.textContent).toBe(long);
    expect(el.querySelector('.kona-passage-more')?.textContent).toBe('Show less');
  });

  it('puts the control outside the link, not inside it', () => {
    // A button nested in a link is both invalid and a way to open the page by
    // accident when you meant to read the rest of the passage.
    const long = 'An amoeba moves by extending a pseudopod. '.repeat(30);
    const el = draw(<Passage color="yellow" text={long} href="https://example.org/a" />);
    expect(el.querySelector('a .kona-passage-more')).toBeNull();
    expect(el.querySelector('.kona-passage-more')).not.toBeNull();
  });

  it('offers nothing to open where the passage is not a link', () => {
    // The panel's card is already the way to the whole of it: the page it is
    // on is behind you.
    const long = 'An amoeba moves by extending a pseudopod. '.repeat(30);
    const el = draw(<Passage color="yellow" text={long} />);
    expect(el.querySelector('.kona-passage-more')).toBeNull();
    expect(el.querySelector('.kona-passage-text')?.textContent).toBe(long);
  });
});
