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

/**
 * A generous wait, on purpose.
 *
 * These assert on a Preact effect: render, then the effect attaches a
 * listener, then a key press re-renders. Under a loaded suite that chain took
 * longer than vi.waitFor's one-second default, so the test passed alone and
 * failed with the other forty-five files running. A flake is worse than a
 * failure, because it fails in CI on somebody else's afternoon.
 */
const PATIENT = { timeout: 5000 };

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
    await vi.waitFor(() => expect(where.querySelector('.kona-panel')).not.toBeNull(), PATIENT);
    expect(where.querySelector('.kona-panel-tabs')).toBeNull();
  });

  it('appear as a pair once a space is active', async () => {
    const where = open({ ...base, activeSpace: space } as ViewState);
    await vi.waitFor(() => expect(where.querySelector('.kona-panel')).not.toBeNull(), PATIENT);
    const tabs = [...where.querySelectorAll('.kona-panel-tab')].map((t) => t.textContent?.trim());
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toContain('This page');
    expect(tabs[1]).toContain('Attention');
  });

  it('still says there is nothing here, which the tab was not needed for', async () => {
    const where = open(base);
    await vi.waitFor(() => expect(where.querySelector('.kona-panel')).not.toBeNull(), PATIENT);
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

  it('opens from the mark rather than across the screen from it', () => {
    // It was anchored to the top while the mark it opens from sits at the
    // bottom, so clicking the one thing Kona shows at rest threw the panel to
    // the other end of the window. 2h never says which end; it says the
    // resting mark takes the same inset both ways, and this keeps the panel
    // on that inset too.
    const css = readFileSync(resolve('src/ui/panel.css'), 'utf8');
    // The block that gives the panel its box, not the one it shares with the
    // resting mark: both are selected as `.kona-panel {`.
    const panel = /\.kona-panel \{([^}]*width: 324px[^}]*)\}/.exec(css)?.[1] ?? '';
    expect(panel).toMatch(/bottom:\s*var\(--kona-space-24\)/);
    expect(panel).not.toMatch(/top:/);
  });

  it('is still a sheet at the foot of a phone, with no top to float to', () => {
    const css = readFileSync(resolve('src/ui/panel.css'), 'utf8');
    const phone = css.slice(css.indexOf('@media (max-width: 839px)'));
    const rule = /\.kona-panel \{([^}]*)\}/.exec(phone)?.[1] ?? '';
    expect(rule).toMatch(/bottom:\s*0/);
    expect(rule).not.toMatch(/top:/);
  });
});
