import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { folderAt, readJson, writeJson } from '../desktop/src/disk';
import { readBackup } from '../src/core/backup';
import { addMark, createSpace, type Space } from '../src/core/spaces';
import { makePerson } from '../src/core/people';
import { SYNC_FILE, syncOnce, type SyncStore } from '../src/core/sync';
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

/** One side's library, in memory, as the engine is allowed to see it. */
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

let dir = '';

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'kona-disk-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('a folder that is a real folder', () => {
  it('reads nothing from a folder with no sync file in it', async () => {
    // The ordinary first state of a folder nobody has put a space in yet.
    expect(await folderAt(dir).read()).toBeNull();
  });

  it('reads nothing from a folder that is not there at all', async () => {
    // An unplugged drive, or a sync client that has not made the folder yet.
    // Neither is a reason to throw, because there is simply nothing to take.
    expect(await folderAt(join(dir, 'not', 'here')).read()).toBeNull();
  });

  it('writes a file and reads back what it wrote', async () => {
    const folder = folderAt(dir);
    await folder.write('{"app":"kona"}');
    expect(await folder.read()).toBe('{"app":"kona"}');
    expect(await readdir(dir)).toEqual([SYNC_FILE]);
  });

  it('makes the folder when it has to', async () => {
    const nested = join(dir, 'Drive', 'Kona');
    await folderAt(nested).write('hello');
    expect(await folderAt(nested).read()).toBe('hello');
  });

  it('leaves nothing behind it, so a sync client has one file to carry', async () => {
    const folder = folderAt(dir);
    await folder.write('one');
    await folder.write('two');
    await folder.write('three');
    // The file is written beside its destination and renamed into place, so a
    // sync client watching the folder never sees a half-written one — and the
    // only thing it is ever asked to upload is the file itself.
    expect(await readdir(dir)).toEqual([SYNC_FILE]);
    expect(await folder.read()).toBe('three');
  });

  it('replaces the file in place rather than failing on an existing one', async () => {
    await writeFile(join(dir, SYNC_FILE), 'old', 'utf8');
    await folderAt(dir).write('new');
    expect(await folderAt(dir).read()).toBe('new');
  });
});

describe('the engine over a real folder', () => {
  it('carries a library from one side to the other through the disk', async () => {
    const folder = folderAt(dir);
    const one = side([mark('a', 'Named volumes are kept')]);
    const two = side([mark('b', 'Logical replication keeps the downtime down')]);

    const first = await syncOnce(folder, one.store);
    expect(first.wrote).toBe(true);

    const second = await syncOnce(folder, two.store);
    expect(second.added).toBe(1);
    expect(two.held.marks.map((entry) => entry.id).sort()).toEqual(['a', 'b']);

    // And back, so both sides hold the union.
    await syncOnce(folder, one.store);
    expect(one.held.marks.map((entry) => entry.id).sort()).toEqual(['a', 'b']);
  });

  it('stops writing once the two sides agree', async () => {
    const folder = folderAt(dir);
    const one = side([mark('a', 'Named volumes are kept')]);
    await syncOnce(folder, one.store);
    const again = await syncOnce(folder, one.store);
    // Otherwise every pass would write, and the sync client would upload the
    // file every twelve seconds for the rest of the day.
    expect(again.wrote).toBe(false);
  });

  it('leaves a file on disk that reads back as a backup', async () => {
    const folder = folderAt(dir);
    const space = addMark(createSpace('Postgres upgrade', 'Can we upgrade without downtime?'), 'a', makePerson('Ada'));
    const one = side([mark('a', 'Named volumes are kept')], [space]);
    await syncOnce(folder, one.store);

    const text = await folder.read();
    expect(text).not.toBeNull();
    const restored = readBackup(text!);
    expect(restored.marks).toHaveLength(1);
    expect(restored.spaces[0]?.name).toBe('Postgres upgrade');
    // Never the signing key: this same folder may be one shared with somebody.
    expect(text).not.toContain('"signingKey"');
  });

  it('writes only the cited passages when the folder is a shared one', async () => {
    const folder = folderAt(dir);
    const space = addMark(createSpace('Postgres upgrade', 'Can we upgrade without downtime?'), 'a', makePerson('Ada'));
    const one = side(
      [mark('a', 'Named volumes are kept'), mark('private', 'My salary review notes')],
      [space],
    );

    await syncOnce(folder, one.store, { kind: 'spaces', origins: [space.id] });
    const text = (await folder.read())!;
    expect(text).toContain('Named volumes are kept');
    expect(text).not.toContain('salary review');
  });
});

describe('settings beside the app', () => {
  it('reads nothing before anything has been saved', async () => {
    expect(await readJson(join(dir, 'settings.json'))).toBeNull();
  });

  it('reads nothing back from a file that is not JSON', async () => {
    // A settings file somebody has edited by hand should start the app over,
    // not stop it from starting.
    const file = join(dir, 'settings.json');
    await writeFile(file, '{ not json', 'utf8');
    expect(await readJson(file)).toBeNull();
  });

  it('keeps a folder and a scope', async () => {
    const file = join(dir, 'settings.json');
    await writeJson(file, { folder: dir, scope: { kind: 'spaces', origins: ['s1'] } });
    expect(await readJson(file)).toEqual({
      folder: dir,
      scope: { kind: 'spaces', origins: ['s1'] },
    });
  });
});
