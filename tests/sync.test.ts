import { describe, expect, it } from 'vitest';
import { makePerson } from '../src/core/people';
import { addComment, addFinding, addMark, createSpace, type Space } from '../src/core/spaces';
import { changedHere, syncOnce, type Folder, type SyncStore } from '../src/core/sync';
import type { Mark } from '../src/core/types';

const mark = (id: string, snapshot: string, updatedAt = 100): Mark =>
  ({
    id,
    snapshot,
    site: 'chatgpt',
    conversationId: 'c1',
    conversationTitle: 'Upgrading Postgres',
    url: 'https://chatgpt.com/c/c1',
    color: 'yellow',
    createdAt: 100,
    updatedAt,
  }) as Mark;

/** A folder that is only a variable, which is all the engine needs one to be. */
function folder(contents: string | null = null) {
  let held = contents;
  let writes = 0;
  return {
    folder: {
      read: async () => held,
      write: async (text: string) => {
        held = text;
        writes += 1;
      },
    } satisfies Folder,
    get writes() {
      return writes;
    },
    get contents() {
      return held;
    },
  };
}

/** One side's library, in memory. */
function side(marks: Mark[] = [], spaces: Space[] = []) {
  const held = { marks: [...marks], spaces: [...spaces] };
  const store: SyncStore = {
    marks: async () => [...held.marks],
    spaces: async () => [...held.spaces],
    saveMark: async (next) => {
      const at = held.marks.findIndex((entry) => entry.id === next.id);
      if (at === -1) held.marks.push(next);
      else held.marks[at] = next;
    },
    saveSpace: async (next) => {
      const at = held.spaces.findIndex((entry) => entry.id === next.id);
      if (at === -1) held.spaces.push(next);
      else held.spaces[at] = next;
    },
  };
  return { store, held };
}

describe('a folder two libraries share', () => {
  it('fills an empty folder from the first side to look', async () => {
    const disk = folder();
    const one = side([mark('a', 'Named volumes are kept')]);
    const result = await syncOnce(disk.folder, one.store);
    expect(result.wrote).toBe(true);
    expect(disk.contents).toContain('Named volumes are kept');
  });

  it('brings the other side everything it had not got', async () => {
    const disk = folder();
    const one = side([mark('a', 'Named volumes are kept')]);
    const two = side([mark('b', 'Logical replication keeps the downtime down')]);

    await syncOnce(disk.folder, one.store);
    const second = await syncOnce(disk.folder, two.store);

    expect(second.added).toBe(1);
    expect(two.held.marks.map((entry) => entry.id).sort()).toEqual(['a', 'b']);
  });

  it('leaves both sides holding the same thing', async () => {
    const disk = folder();
    const one = side([mark('a', 'Named volumes are kept')]);
    const two = side([mark('b', 'Logical replication keeps the downtime down')]);

    await syncOnce(disk.folder, one.store);
    await syncOnce(disk.folder, two.store);
    await syncOnce(disk.folder, one.store);

    expect(one.held.marks.map((entry) => entry.id).sort()).toEqual(['a', 'b']);
    expect(two.held.marks.map((entry) => entry.id).sort()).toEqual(['a', 'b']);
  });

  it('stops writing once the two agree', async () => {
    const disk = folder();
    const one = side([mark('a', 'Named volumes are kept')]);
    const two = side([mark('b', 'Logical replication')]);

    await syncOnce(disk.folder, one.store);
    await syncOnce(disk.folder, two.store);
    await syncOnce(disk.folder, one.store);
    const settled = disk.writes;

    // However many times either side looks again, there is nothing to say.
    await syncOnce(disk.folder, one.store);
    await syncOnce(disk.folder, two.store);
    expect(disk.writes).toBe(settled);
    expect(changedHere(await syncOnce(disk.folder, two.store))).toBe(false);
  });

  it('takes the newer copy of a highlight that both sides have', async () => {
    const disk = folder();
    const one = side([mark('a', 'The old wording', 100)]);
    const two = side([mark('a', 'The newer wording', 200)]);

    await syncOnce(disk.folder, two.store);
    const back = await syncOnce(disk.folder, one.store);

    expect(back.updated).toBe(1);
    expect(one.held.marks[0]?.snapshot).toBe('The newer wording');
  });

  it('keeps its own copy when it is the newer one', async () => {
    const disk = folder();
    const one = side([mark('a', 'The old wording', 100)]);
    const two = side([mark('a', 'The newer wording', 200)]);

    await syncOnce(disk.folder, one.store);
    const second = await syncOnce(disk.folder, two.store);

    expect(second.updated).toBe(0);
    expect(two.held.marks[0]?.snapshot).toBe('The newer wording');
    // And the folder is corrected, so the first side gets it next time round.
    expect(disk.contents).toContain('The newer wording');
  });
});

describe('a space in a shared folder', () => {
  const priya = makePerson('Priya', 'p1');
  const sam = makePerson('Sam', 's1');
  const marks = [mark('a', 'A rehearsed cutover is the only kind worth doing')];

  function spaceWith(by: typeof priya) {
    let space = createSpace('Postgres 17 upgrade', 'Can we upgrade without downtime?');
    space = { ...space, id: 'sp', origin: 'sp' };
    return addMark(space, 'a', by, 100);
  }

  it('arrives whole on the other side', async () => {
    const disk = folder();
    const one = side(marks, [spaceWith(priya)]);
    const two = side(marks);

    await syncOnce(disk.folder, one.store);
    const second = await syncOnce(disk.folder, two.store);

    expect(second.spacesAdded).toBe(1);
    expect(two.held.spaces[0]?.question).toBe('Can we upgrade without downtime?');
  });

  it('merges a reply written on the other side, rather than replacing', async () => {
    const disk = folder();
    const hers = addComment(spaceWith(priya), 'a', 'This is the one that worries me.', priya, 200);
    const his = addComment(spaceWith(sam), 'a', 'Agreed — rehearse it twice.', sam, 210);
    const one = side(marks, [hers]);
    const two = side(marks, [his]);

    await syncOnce(disk.folder, one.store);
    await syncOnce(disk.folder, two.store);
    await syncOnce(disk.folder, one.store);

    for (const held of [one.held, two.held]) {
      const bodies = (held.spaces[0]?.comments ?? []).map((entry) => entry.body).sort();
      expect(bodies).toEqual(['Agreed — rehearse it twice.', 'This is the one that worries me.']);
    }
  });

  it('brings both people, so both names resolve', async () => {
    const disk = folder();
    const one = side(marks, [addFinding(spaceWith(priya), 'Link mode is faster', 'supports', ['a'], priya, 200)]);
    const two = side(marks, [addFinding(spaceWith(sam), 'But it is destructive', 'contradicts', ['a'], sam, 210)]);

    await syncOnce(disk.folder, one.store);
    await syncOnce(disk.folder, two.store);
    await syncOnce(disk.folder, one.store);

    expect(one.held.spaces[0]?.people?.map((person) => person.name).sort()).toEqual(['Priya', 'Sam']);
    expect(one.held.spaces[0]?.findings).toHaveLength(2);
  });

  it('settles down rather than merging the same space forever', async () => {
    const disk = folder();
    const one = side(marks, [addComment(spaceWith(priya), 'a', 'Mine.', priya, 200)]);
    const two = side(marks, [addComment(spaceWith(sam), 'a', 'His.', sam, 210)]);

    await syncOnce(disk.folder, one.store);
    await syncOnce(disk.folder, two.store);
    await syncOnce(disk.folder, one.store);
    await syncOnce(disk.folder, two.store);

    expect(changedHere(await syncOnce(disk.folder, one.store))).toBe(false);
    expect(changedHere(await syncOnce(disk.folder, two.store))).toBe(false);
  });
});

describe('what a shared folder must never carry', () => {
  it('does not write the signing key into it', async () => {
    const disk = folder();
    const one = side([mark('a', 'Named volumes are kept')]);
    await syncOnce(disk.folder, one.store);
    // Somebody you share a folder with can read everything in it.
    expect(disk.contents).not.toContain('signingKey');
    expect(disk.contents).not.toContain('identity');
  });

  it('refuses a file that is not a library at all', async () => {
    const disk = folder('{"hello":"world"}');
    const one = side([mark('a', 'Named volumes are kept')]);
    await expect(syncOnce(disk.folder, one.store)).rejects.toThrow(/backup/);
  });

  it('drops a space in the folder that cites highlights it did not bring', async () => {
    const disk = folder(
      JSON.stringify({
        app: 'kona',
        version: 2,
        marks: [mark('a', 'Named volumes are kept')],
        spaces: [{ ...createSpace('Sneaky'), id: 'sp', origin: 'sp', markIds: ['a', 'not-in-the-file'] }],
      }),
    );
    const two = side();
    await syncOnce(disk.folder, two.store);
    expect(two.held.spaces[0]?.markIds).toEqual(['a']);
  });
});
