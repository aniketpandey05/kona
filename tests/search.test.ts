import { describe, expect, it } from 'vitest';
import { searchLibrary, searchMarks } from '../src/core/search';
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

const marks = [
  mark('1', 'docker compose up -d', { note: 'starts the stack detached' }),
  mark('2', 'Named volumes are kept', { conversationTitle: 'Docker setup help' }),
  mark('3', 'O(n log n) is typical for good sorting', {
    site: 'claude',
    url: 'https://claude.ai/chat/y',
  }),
];

describe('searchMarks', () => {
  it('returns everything for an empty query', () => {
    expect(searchMarks(marks, '  ').length).toBe(3);
  });

  it('matches the highlight, the note and the chat title', () => {
    expect(searchMarks(marks, 'volumes').map((m) => m.id)).toEqual(['2']);
    expect(searchMarks(marks, 'detached').map((m) => m.id)).toEqual(['1']);
    expect(searchMarks(marks, 'setup help').map((m) => m.id)).toEqual(['2']);
  });

  it('matches the site a highlight came from', () => {
    expect(searchMarks(marks, 'claude').map((m) => m.id)).toEqual(['3']);
    expect(searchMarks(marks, 'chatgpt sorting')).toEqual([]);
  });

  it('puts matches in the highlight text above matches in the title', () => {
    expect(searchMarks(marks, 'docker').map((m) => m.id)).toEqual(['1', '2']);
  });

  it('requires every word of the query to match', () => {
    expect(searchMarks(marks, 'docker sorting')).toEqual([]);
  });

  it('ignores case', () => {
    expect(searchMarks(marks, 'DOCKER Compose').map((m) => m.id)).toEqual(['1']);
  });
});

describe('finding a passage that says it another way', () => {
  const written = [
    mark('1', 'Run the migrations before the deploy'),
    mark('2', 'Named volumes are kept'),
    mark('3', 'Caching the query plan helps'),
  ];

  it('finds a word in whatever form the passage used it', () => {
    expect(searchMarks(written, 'migrate').map((m) => m.id)).toEqual(['1']);
    expect(searchMarks(written, 'deployment').map((m) => m.id)).toEqual(['1']);
    expect(searchMarks(written, 'caches').map((m) => m.id)).toEqual(['3']);
  });

  it('finds something while the word is still being typed', () => {
    expect(searchMarks(written, 'volum').map((m) => m.id)).toEqual(['2']);
    expect(searchMarks(written, 'migr').map((m) => m.id)).toEqual(['1']);
  });

  it('does not go hunting on a word of one or two letters', () => {
    expect(searchMarks(written, 'q')).toEqual([]);
  });
});

describe('putting the better answer first', () => {
  it('counts repeating an unusual word for more than an ordinary one', () => {
    const library = [
      mark('1', 'pgbouncer pgbouncer database'),
      mark('2', 'database database pgbouncer'),
      mark('3', 'database rows'),
      mark('4', 'database columns'),
      mark('5', 'database indexes'),
      mark('6', 'database vacuum'),
      mark('7', 'database planner'),
      mark('8', 'database replica'),
    ];
    expect(searchMarks(library, 'pgbouncer database').map((m) => m.id)).toEqual(['1', '2']);
  });

  it('prefers the passage that is mostly about what you asked for', () => {
    const padding = 'and then a great deal of other material about unrelated matters '.repeat(4);
    const library = [
      mark('1', 'Named volumes are kept'),
      mark('2', `Named volumes are kept ${padding}`),
    ];
    expect(searchMarks(library, 'volumes').map((m) => m.id)).toEqual(['1', '2']);
  });
});

describe('searching by meaning as well as by word', () => {
  // `cutover` turns up in three highlights and `downtime` in two of them, so
  // the library has grounds to treat them as the same idea. The third is the
  // one that a search for the other word has to find.
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

  it('finds the passage that uses none of the words you typed', () => {
    const found = searchLibrary(library, 'downtime');
    expect(found.marks.map((m) => m.id)).toContain('3');
    expect(found.byMeaning).toEqual(new Set(['3']));
  });

  it('says which word nobody typed did the work', () => {
    expect(searchLibrary(library, 'downtime').alsoMatched).toContain('cutover');
  });

  it('still puts the passages that said your word above the ones that did not', () => {
    const ids = searchLibrary(library, 'downtime').marks.map((m) => m.id);
    expect(ids.indexOf('3')).toBeGreaterThan(ids.indexOf('1'));
    expect(ids.indexOf('3')).toBeGreaterThan(ids.indexOf('2'));
  });

  it('claims nothing about meaning from a library too small to have taught it any', () => {
    const tiny = library.slice(0, 4);
    const found = searchLibrary(tiny, 'downtime');
    expect(found.learned).toBe(false);
    expect(found.alsoMatched).toEqual([]);
    expect(found.marks.map((m) => m.id)).toEqual(['1', '2']);
  });

  it('does not widen a word into something it never sat beside', () => {
    expect(searchMarks(library, 'downtime sorting')).toEqual([]);
    expect(searchMarks(library, 'downtime unwritten')).toEqual([]);
  });

  it('leaves an empty query alone', () => {
    expect(searchLibrary(library, '   ').marks).toHaveLength(10);
    expect(searchLibrary(library, '   ').alsoMatched).toEqual([]);
  });

  it('has nothing to say about an empty library', () => {
    expect(searchLibrary([], 'downtime').marks).toEqual([]);
  });
});
