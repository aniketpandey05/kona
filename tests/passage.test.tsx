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
});
