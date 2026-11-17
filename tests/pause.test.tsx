import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPaused, savePaused, watchPaused } from '../src/core/pause';
import { Popup } from '../src/entrypoints/popup/Popup';

/**
 * Turning Kona off.
 *
 * Selecting text is not a request to highlight it, and a product that offers
 * every time somebody copies a line is interrupting a conversation it was not
 * part of. Two answers, and these cover both: Escape for the moment, and a
 * switch for the afternoon.
 */
describe('off, as a stored fact', () => {
  beforeEach(() => localStorage.clear());

  it('is on until somebody says otherwise', async () => {
    // Not a setting anybody should have to find and turn on to get a product
    // that works: absent means on.
    expect(await loadPaused()).toBe(false);
  });

  it('remembers being turned off, and turned back on', async () => {
    await savePaused(true);
    expect(await loadPaused()).toBe(true);
    await savePaused(false);
    expect(await loadPaused()).toBe(false);
  });

  it('tells every page at once rather than one at a time', async () => {
    // The switch is in the popup, which is a different page from the tab you
    // are reading. Without this, a tab already open would go on offering
    // until it was reloaded.
    const heard: boolean[] = [];
    const stop = watchPaused((paused) => heard.push(paused));
    await savePaused(true);
    await savePaused(false);
    stop();
    await savePaused(true);
    expect(heard).toEqual([true, false]);
  });
});

let host: HTMLElement | undefined;

afterEach(() => {
  if (host) render(null, host);
  host?.remove();
  host = undefined;
  localStorage.clear();
});

async function drawPopup(): Promise<HTMLElement> {
  host = document.createElement('div');
  document.body.append(host);
  render(<Popup />, host);
  // The popup asks the tab, the permissions and the stored switch before it
  // can draw anything.
  await vi.waitFor(() => expect(host!.querySelector('.pop-pause')).not.toBeNull());
  return host;
}

const pauseBox = (where: HTMLElement) =>
  where.querySelector<HTMLInputElement>('.pop-pause input[type="checkbox"]')!;

describe('the switch in the popup', () => {
  beforeEach(() => localStorage.clear());

  it('says Kona is on, and is checked, on a fresh install', async () => {
    const popup = await drawPopup();
    expect(popup.querySelector('.pop-pause')?.textContent).toContain('Kona is on');
    expect(pauseBox(popup).checked).toBe(true);
  });

  it('turns Kona off, and says what that does and does not do', async () => {
    const popup = await drawPopup();
    pauseBox(popup).click();

    await vi.waitFor(() => expect(popup.textContent).toContain('Kona is off'));
    expect(await loadPaused()).toBe(true);

    // The sentence has to answer the question somebody turning a thing off is
    // actually asking, which is whether their highlights are still there.
    const said = popup.querySelector('.pop-pause')?.textContent ?? '';
    expect(said).toMatch(/no bar when you select/i);
    expect(said).toMatch(/still here|come back/i);
  });

  it('comes back on, and is not a separate kind of off from the site switch', async () => {
    await savePaused(true);
    const popup = await drawPopup();
    expect(pauseBox(popup).checked).toBe(false);

    pauseBox(popup).click();
    await vi.waitFor(() => expect(popup.textContent).toContain('Kona is on'));
    expect(await loadPaused()).toBe(false);

    // 3e gave up the per-site soft switch because a second list of sites could
    // disagree with the browser's. This is one boolean and keeps no sites, so
    // which sites Kona may read is still the browser's word alone.
    expect(localStorage.getItem('disabled-sites')).toBeNull();
  });
});
