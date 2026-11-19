import { beforeEach, describe, expect, it } from 'vitest';
import { loadMarks, upsertMark } from '../src/core/store';
import { paged, type Mark } from '../src/core/types';

/**
 * A page used to be called a conversation.
 *
 * The chat sites came first, so `conversationId` and `conversationTitle` were
 * what the code called a page, on ordinary articles as much as inside a chat.
 * The rename is the easy half. These are the two things that make it safe:
 * what is already on somebody's device still reads, and what this copy of
 * Kona writes is still readable by the one that has not updated yet.
 *
 * That second half is not hypothetical. 3c put the library on the web, so the
 * two halves of the product update at different speeds: the web app deploys
 * the moment a change lands and the extension waits on a store review. For a
 * week at a time a new library is handing whole marks to an old extension,
 * which keys its storage by the page a mark says it is on.
 */
const old = (id: string) =>
  ({
    id,
    site: 'chatgpt',
    conversationId: 'c1',
    conversationTitle: 'Upgrading Postgres',
    url: 'https://chatgpt.com/c/c1',
    label: '',
    color: 'yellow',
    snapshot: 'Named volumes are kept',
    createdAt: 1,
    updatedAt: 1,
  }) as unknown as Mark;

describe('a highlight that arrives under the old name', () => {
  it('is read as being on a page', () => {
    const mark = paged(old('a'));
    expect(mark.pageId).toBe('c1');
    expect(mark.pageTitle).toBe('Upgrading Postgres');
  });

  it('keeps the old names on it, for whoever has not updated', () => {
    const mark = paged(old('a'));
    expect(mark.conversationId).toBe('c1');
    expect(mark.conversationTitle).toBe('Upgrading Postgres');
  });

  it('prefers the new name when a mark carries both and they differ', () => {
    // They should never differ, since everything that writes one writes both.
    // If they ever do, the one this version of Kona maintains is the truth.
    const mark = paged({ ...old('a'), pageId: 'new', pageTitle: 'New' });
    expect(mark.pageId).toBe('new');
    expect(mark.conversationId).toBe('new');
  });

  it('does not invent a page for a mark that names none', () => {
    const mark = paged({ ...old('a'), conversationId: undefined } as never);
    expect(mark.pageId).toBe('');
  });
});

describe('a library already on the device', () => {
  beforeEach(() => localStorage.clear());

  it('still reads after the rename', async () => {
    // Written the way a Kona from before the rename wrote it, straight into
    // the store, with no migration run over it.
    localStorage.setItem('marks:chatgpt:c1', JSON.stringify([old('a'), old('b')]));

    const marks = await loadMarks('chatgpt', 'c1');

    expect(marks.map((mark) => mark.id)).toEqual(['a', 'b']);
    expect(marks.every((mark) => mark.pageId === 'c1')).toBe(true);
    expect(marks[0]?.pageTitle).toBe('Upgrading Postgres');
  });

  it('is written back carrying both names', async () => {
    // So that an extension still waiting on a store review, reading the same
    // device's storage or being handed this mark over the bridge, files it
    // under the page it is on rather than under `undefined`.
    await upsertMark(paged(old('a')));

    const raw = JSON.parse(localStorage.getItem('marks:chatgpt:c1') ?? '[]') as Mark[];
    expect(raw[0]?.pageId).toBe('c1');
    expect(raw[0]?.conversationId).toBe('c1');
    expect(raw[0]?.conversationTitle).toBe('Upgrading Postgres');
  });

  it('files a highlight under the page whichever name it arrived wearing', async () => {
    // The storage key is built from the value, so this is the test that would
    // have caught a mark landing under `marks:chatgpt:undefined`.
    await upsertMark(old('a'));
    expect(localStorage.getItem('marks:chatgpt:c1')).not.toBeNull();
    expect(localStorage.getItem('marks:chatgpt:undefined')).toBeNull();
  });
});
