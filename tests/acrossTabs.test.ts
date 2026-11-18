import { describe, expect, it } from 'vitest';
import { watch } from '../app/src/storage';

/**
 * The same library, open in two tabs.
 *
 * `watch` reached only the page it was called on, so a second tab held a copy
 * of the store from whenever it was opened and never heard about anything
 * after that: a name set in one tab still read *Your name and backups* in the
 * other, and a space made in one never appeared beside the others.
 *
 * Two halves, because nothing the browser offers covers both. Highlights and
 * spaces are in IndexedDB, which fires no cross-tab event at all, and a
 * BroadcastChannel carries those; identity is in localStorage, which fires
 * `storage` in the other tabs by itself. This is the half a test can reach in
 * one realm, and it is also the half that still works where a channel cannot
 * be made.
 */
describe('a change written by another tab', () => {
  const change = (key: string | null) =>
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: 'anything' }));

  it('reaches a watcher in this one', () => {
    let told = 0;
    const stop = watch(() => {
      told += 1;
    });
    change('kona:me');
    expect(told).toBe(1);
    stop();
  });

  it('is ignored when it belongs to somebody else on the same origin', () => {
    // The library shares an origin with whatever else is served from it, and
    // re-reading the whole store because an unrelated key moved is work
    // nobody asked for.
    let told = 0;
    const stop = watch(() => {
      told += 1;
    });
    change('some-other-app:setting');
    expect(told).toBe(0);
    stop();
  });

  it('counts the whole store being cleared as news', () => {
    // A null key is every key at once, which is the one case where ignoring
    // it would leave the tab showing a library that no longer exists.
    let told = 0;
    const stop = watch(() => {
      told += 1;
    });
    change(null);
    expect(told).toBe(1);
    stop();
  });

  it('stops when the watcher does', () => {
    let told = 0;
    const stop = watch(() => {
      told += 1;
    });
    stop();
    change('kona:me');
    expect(told).toBe(0);
  });
});
