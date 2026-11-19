import { describe, expect, it } from 'vitest';
import { deletedAt, FORGET_AFTER_MS, mergeGone, outlives, prune } from '../src/core/gone';

const NOW = Date.now();

/**
 * Tombstones: the arithmetic that lets a deletion survive a merge taking the
 * union of two sides. The engine's half is in `tests/sync.test.ts`; this is
 * the part that is just numbers.
 */
describe('remembering a deletion', () => {
  it('keeps one that is recent enough to still matter', () => {
    expect(prune([{ id: 'a', at: NOW - 1000 }], NOW)).toEqual([{ id: 'a', at: NOW - 1000 }]);
  });

  it('forgets one older than the window, and says what that costs', () => {
    // The cost, stated rather than hidden: a folder nobody has opened in six
    // months hands back what you deleted, because by then nothing left knows
    // you deleted it.
    const old = NOW - FORGET_AFTER_MS - 1;
    expect(prune([{ id: 'a', at: old }], NOW)).toEqual([]);
  });

  it('drops an entry that is not one', () => {
    const rubbish = [{ id: 'a', at: NOW }, { id: 7 }, null, { at: NOW }] as never;
    expect(prune(rubbish, NOW)).toEqual([{ id: 'a', at: NOW }]);
  });

  it('puts the newest first, so a long list reads as a history', () => {
    const sorted = prune(
      [
        { id: 'old', at: NOW - 5000 },
        { id: 'new', at: NOW - 10 },
      ],
      NOW,
    );
    expect(sorted.map((one) => one.id)).toEqual(['new', 'old']);
  });
});

describe('two sides comparing what they have deleted', () => {
  it('ends with everything either of them deleted', () => {
    const merged = mergeGone([{ id: 'a', at: NOW - 100 }], [{ id: 'b', at: NOW - 200 }], NOW);
    expect(merged.map((one) => one.id).sort()).toEqual(['a', 'b']);
  });

  it('keeps the earliest time for something they both deleted', () => {
    // Earliest, because the question a tombstone answers is whether this was
    // deleted before that copy of the highlight was written. Taking the later
    // time would leave a window for a stale copy to come back through.
    const merged = mergeGone([{ id: 'a', at: NOW - 100 }], [{ id: 'a', at: NOW - 900 }], NOW);
    expect(merged).toEqual([{ id: 'a', at: NOW - 900 }]);
  });

  it('forgets on the way, so the list cannot grow without end', () => {
    const merged = mergeGone(
      [{ id: 'ancient', at: NOW - FORGET_AFTER_MS - 1 }],
      [{ id: 'fresh', at: NOW }],
      NOW,
    );
    expect(merged.map((one) => one.id)).toEqual(['fresh']);
  });
});

describe('a tombstone against a copy of the highlight', () => {
  it('wins when the deletion came after the copy was written', () => {
    expect(outlives(deletedAt([{ id: 'a', at: 500 }], 'a'), 100)).toBe(true);
  });

  it('loses to an edit made after it, which is what 21 settled', () => {
    // My recommendation was that a deletion never silently beats an edit. The
    // author's rule is the latest change wins, which is simpler and is what
    // is built; this is the case where the two differ.
    expect(outlives(deletedAt([{ id: 'a', at: 500 }], 'a'), 900)).toBe(false);
  });

  it('says nothing about a highlight nobody deleted', () => {
    expect(outlives(deletedAt([{ id: 'a', at: 500 }], 'b'), 1)).toBe(false);
  });
});

describe('the list the web library keeps on the device', () => {
  // The half that persists. The delete itself goes through IndexedDB, which
  // this environment has no use for; what is worth pinning is that the record
  // survives, since a deletion nobody wrote down is one the next sync returns.
  it('remembers a deletion, and still has it on the next read', async () => {
    localStorage.clear();
    const { loadGone, rememberGone } = await import('../app/src/storage');
    rememberGone('a', NOW);
    expect(loadGone(NOW)).toEqual([{ id: 'a', at: NOW }]);
  });

  it('forgets one that has aged out, without being asked to', async () => {
    localStorage.clear();
    const { loadGone, rememberGone } = await import('../app/src/storage');
    rememberGone('old', NOW - FORGET_AFTER_MS - 1);
    rememberGone('new', NOW);
    expect(loadGone(NOW).map((one) => one.id)).toEqual(['new']);
  });

  it('survives a list that is not a list', async () => {
    localStorage.setItem('kona:gone', 'not json');
    const { loadGone } = await import('../app/src/storage');
    expect(loadGone(NOW)).toEqual([]);
    localStorage.clear();
  });
});
