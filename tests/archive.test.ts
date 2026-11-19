import { describe, expect, it } from 'vitest';
import {
  archive,
  archivedOnly,
  countArchived,
  FREE_ARCHIVE_LIMIT,
  FREE_SPACE_LIMIT,
  isArchived,
  notArchived,
  roomForSpace,
  roomToArchive,
  unarchive,
} from '../src/core/archive';
import type { Mark } from '../src/core/types';

const mark = (id: string, archivedAt?: number): Mark =>
  ({
    id,
    site: 'web',
    pageId: 'p1',
    pageTitle: 'A page',
    url: 'https://example.org/a',
    label: '',
    color: 'yellow',
    snapshot: `passage ${id}`,
    createdAt: 0,
    updatedAt: 0,
    ...(archivedAt === undefined ? {} : { archivedAt }),
  }) as Mark;

const many = (n: number, archived = 0) =>
  Array.from({ length: n }, (_, i) => mark(`m${i}`, i < archived ? 1 : undefined));

describe('what archiving is', () => {
  it('is absent until it happens, so nothing ever needs migrating', () => {
    expect(isArchived(mark('m1'))).toBe(false);
    expect(isArchived(mark('m1', 1))).toBe(true);
  });

  it('takes it out of the default view and nothing else', () => {
    const marks = [mark('a'), mark('b', 1), mark('c')];
    expect(notArchived(marks).map((m) => m.id)).toEqual(['a', 'c']);
    expect(archivedOnly(marks).map((m) => m.id)).toEqual(['b']);
  });

  it('never deletes, and leaves the passage itself untouched', () => {
    const before = mark('a');
    const { changed } = archive([before], ['a'], false);
    expect(changed[0]?.snapshot).toBe(before.snapshot);
    expect(changed[0]?.id).toBe('a');
    expect(changed).toHaveLength(1);
  });
});

describe('the Free working set', () => {
  it('is fifteen at a time', () => {
    expect(FREE_ARCHIVE_LIMIT).toBe(15);
    expect(roomToArchive(many(40), false)).toBe(15);
    expect(roomToArchive(many(40, 15), false)).toBe(0);
  });

  it('archives as many as there is room for, and says which it would not', () => {
    // Said up front rather than discovered partway through a bulk gesture:
    // archiving two hundred one at a time is a punishment, so bulk has to know
    // its own answer before it starts.
    const marks = many(20, 13);
    const ids = marks.filter((m) => !isArchived(m)).map((m) => m.id);
    const { changed, refused } = archive(marks, ids, false);
    expect(changed).toHaveLength(2);
    expect(refused).toHaveLength(ids.length - 2);
  });

  it('never un-archives or deletes anything to make room', () => {
    // 7: at the cap, Kona itself never removes or hides anything.
    const marks = many(20, 15);
    const { changed } = archive(marks, ['m16', 'm17'], false);
    expect(changed).toEqual([]);
    expect(countArchived(marks)).toBe(15);
  });

  it('hands the slot straight back when one comes out', () => {
    // A working set, not a quota: the limit is how many can be put away at
    // once, not how many ever can be.
    const marks = many(20, 15);
    const back = unarchive(marks, ['m0']);
    expect(back).toHaveLength(1);
    expect(isArchived(back[0]!)).toBe(false);
    const after = marks.map((m) => back.find((b) => b.id === m.id) ?? m);
    expect(roomToArchive(after, false)).toBe(1);
  });

  it('does not limit Pro at all', () => {
    expect(roomToArchive(many(500, 400), true)).toBe(Number.POSITIVE_INFINITY);
    const { refused } = archive(many(40), ['m0', 'm1', 'm2'], true);
    expect(refused).toEqual([]);
  });

  it('leaves one already put away alone rather than counting it twice', () => {
    const marks = [mark('a', 1), mark('b')];
    const { changed } = archive(marks, ['a', 'b'], false);
    expect(changed.map((m) => m.id)).toEqual(['b']);
  });
});

describe('the five spaces', () => {
  it('is a hard five on Free', () => {
    // Hard because archiving a space is Pro: there is nothing to defeat it
    // with, which is a reason for somebody to pay rather than a hardship.
    expect(FREE_SPACE_LIMIT).toBe(5);
    expect(roomForSpace(4, false)).toBe(true);
    expect(roomForSpace(5, false)).toBe(false);
  });

  it('does not apply above Free', () => {
    expect(roomForSpace(500, true)).toBe(true);
  });
});
