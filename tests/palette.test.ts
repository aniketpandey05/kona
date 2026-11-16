import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addPen, loadPalette, removePen, savePalette, watchPalette } from '../src/core/palette';
import { DEFAULT_PENS } from '../src/core/pens';

/**
 * The pens in the case, which is a different list from the colours in your
 * library (12, rule 4). Everything here is about the case; nothing here is
 * allowed to be about the marks already made.
 */
beforeEach(() => {
  localStorage.clear();
});

describe('the pens you have', () => {
  it('starts as the four Kona ships with', async () => {
    await expect(loadPalette()).resolves.toEqual(DEFAULT_PENS);
  });

  it('keeps one you mixed, on this device', async () => {
    // Free, and therefore per device, since Free does not sync (12, rule 7).
    await addPen('#14b8a6@45');
    await expect(loadPalette()).resolves.toEqual([...DEFAULT_PENS, '#14b8a6@45']);
  });

  it('adds a pen once, however many times it is added', async () => {
    await addPen('#14b8a6@45');
    await addPen('#14b8a6@45');
    expect((await loadPalette()).filter((id) => id === '#14b8a6@45')).toHaveLength(1);
  });

  it('takes one out without touching anything already marked', async () => {
    // Nothing in this module can reach a highlight, which is the point: the
    // mark carries its own colour, so removing a pen *cannot* repaint.
    await savePalette(['yellow', '#14b8a6@45']);
    await expect(removePen('#14b8a6@45')).resolves.toEqual(['yellow']);
  });

  it('refuses to empty the case', async () => {
    // A palette with no pens in it is a product that cannot highlight.
    await savePalette(['yellow']);
    await expect(removePen('yellow')).resolves.toEqual(['yellow']);
  });

  it('falls back to the four when what is stored is unusable', async () => {
    localStorage.setItem('pens', JSON.stringify([]));
    await expect(loadPalette()).resolves.toEqual(DEFAULT_PENS);
  });

  it('tells the page when the palette changes, so the bar redraws', async () => {
    // The bar in the article and the Pens screen in the library are two
    // windows onto one list; without this the bar keeps offering the pen you
    // just took out until the page is reloaded.
    const told = vi.fn();
    const stop = watchPalette(told);
    await addPen('#14b8a6@45');
    expect(told).toHaveBeenCalledWith([...DEFAULT_PENS, '#14b8a6@45']);
    stop();
  });
});
