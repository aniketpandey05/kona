import { describe, expect, it } from 'vitest';
import { buildIndex, ENOUGH_TO_LEARN, indexOf, relatedTerms } from '../src/core/retrieve';
import { stem } from '../src/core/tokens';
import type { Mark } from '../src/core/types';

const mark = (id: string, snapshot: string, extra: Partial<Mark> = {}) =>
  ({
    id,
    snapshot,
    conversationTitle: 'Some chat',
    site: 'chatgpt',
    url: 'https://chatgpt.com/c/x',
    createdAt: Number(id),
    ...extra,
  }) as Mark;

/**
 * A library where two words keep arriving together: `cutover` is in three
 * highlights and `downtime` in two of those three, which is the shape the
 * learning is supposed to notice.
 */
const library = [
  mark('1', 'The cutover took four minutes of downtime'),
  mark('2', 'Plan the cutover for Sunday to limit downtime'),
  mark('3', 'A rehearsed cutover is the only kind worth doing'),
  mark('4', 'Replication lag made the switch slower'),
  mark('5', 'Index rebuilds dominate the window'),
  mark('6', 'Bind mounts behave differently from named volumes'),
  mark('7', 'A named volume survives a container restart'),
  mark('8', 'Compose files pin service versions'),
  mark('9', 'Linting rules caught three defects'),
  mark('10', 'Sorting is typically n log n'),
];

describe('the index', () => {
  it('weighs a word in the passage above the same word in the title', () => {
    const index = buildIndex([mark('1', 'volumes', { conversationTitle: 'volumes' })]);
    // Three for the passage and one for the title, counted together.
    expect(index.postings.get(stem('volumes'))?.get(0)).toBe(4);
  });

  it('keeps a spelling worth showing a person, not the stem', () => {
    const index = buildIndex([mark('1', 'One migration, then the other migrations')]);
    // The plain form of the two that were actually written, never `migrat`.
    expect(index.surface.get(stem('migrations'))).toBe('migration');
  });

  it('is kept for as long as the list it was built from', () => {
    expect(indexOf(library)).toBe(indexOf(library));
    expect(indexOf([...library])).not.toBe(indexOf(library));
  });
});

describe('what a library teaches itself', () => {
  it('puts two words together when they keep arriving together', () => {
    const related = relatedTerms(buildIndex(library));
    expect(related.get(stem('downtime'))).toContain(stem('cutover'));
    expect(related.get(stem('cutover'))).toContain(stem('downtime'));
  });

  it('learns nothing at all from a library too small to mean anything', () => {
    const tiny = library.slice(0, ENOUGH_TO_LEARN - 1);
    expect(relatedTerms(buildIndex(tiny)).size).toBe(0);
  });

  it('refuses two words that have only ever met once', () => {
    const related = relatedTerms(buildIndex(library));
    // `replication` and `lag` are in one highlight between them.
    expect(related.get(stem('replication'))).toBeUndefined();
  });

  it('learns nothing from a word that is in half of everything', () => {
    const everywhere = library.map((entry, at) =>
      mark(String(at + 1), `docker ${entry.snapshot}`),
    );
    const related = relatedTerms(buildIndex(everywhere));
    expect(related.get(stem('docker'))).toBeUndefined();
    // The pair it was already finding is still there.
    expect(related.get(stem('downtime'))).toContain(stem('cutover'));
  });

  it('ignores the words that are in every passage ever written', () => {
    const related = relatedTerms(buildIndex(library));
    expect(related.get('the')).toBeUndefined();
    expect([...related.values()].flat()).not.toContain('the');
  });

  it('works it out once and keeps it', () => {
    const index = buildIndex(library);
    expect(relatedTerms(index)).toBe(relatedTerms(index));
  });
});
