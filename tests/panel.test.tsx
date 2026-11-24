import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from 'preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Panel } from '../src/ui/Panel';
import type { ActiveSpaceState, KonaController, ViewState } from '../src/content/controller';
import { DEFAULT_PENS } from '../src/core/pens';

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

const space: ActiveSpaceState = {
  id: 'sp1',
  name: 'Attention',
  items: [],
} as unknown as ActiveSpaceState;

const controller = () =>
  ({
    subscribe: vi.fn(() => () => undefined),
    getState: vi.fn(() => base),
  }) as unknown as KonaController;

function open(state: ViewState) {
  host = document.createElement('div');
  document.body.append(host);
  render(<Panel state={state} controller={controller()} />, host);
  host.querySelector<HTMLElement>('.kona-rest')?.click();
  return host;
}

/**
 * 2f describes a pair: *This page* and the space, appearing together only
 * when a space is active. A single tab is not a pair. It was drawn anyway,
 * which put a switch with nowhere to go above a list it was already
 * describing, and made it the second thing you saw on a page with nothing
 * kept on it.
 */
describe('the panel tabs', () => {
  it('are not drawn at all when there is no space to switch to', async () => {
    const where = open(base);
    await vi.waitFor(() => expect(where.querySelector('.kona-panel')).not.toBeNull());
    expect(where.querySelector('.kona-panel-tabs')).toBeNull();
  });

  it('appear as a pair once a space is active', async () => {
    const where = open({ ...base, activeSpace: space } as ViewState);
    await vi.waitFor(() => expect(where.querySelector('.kona-panel')).not.toBeNull());
    const tabs = [...where.querySelectorAll('.kona-panel-tab')].map((t) => t.textContent?.trim());
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toContain('This page');
    expect(tabs[1]).toContain('Attention');
  });

  it('still says there is nothing here, which the tab was not needed for', async () => {
    const where = open(base);
    await vi.waitFor(() => expect(where.querySelector('.kona-panel')).not.toBeNull());
    expect(where.querySelector('.kona-panel-none')?.textContent).toMatch(/nothing kept/i);
  });
});

/**
 * The card a highlight sits in is `width: 100%` with padding and a border on
 * top of it. Without border-box that is twenty-six pixels wider than the list
 * holding it, the list scrolls on its y axis so the browser gives it an x
 * axis too, and the panel grows a horizontal scrollbar. happy-dom lays
 * nothing out, so this reads the rule rather than the geometry.
 */
describe('what the panel is built on', () => {
  it('sets border-box for everything in the page UI, once, at the top', () => {
    const css = readFileSync(resolve('src/ui/shadow.css'), 'utf8');
    expect(css).toMatch(/\.kona-tokens \*[^{]*\{[^}]*box-sizing:\s*border-box/s);
  });
});
