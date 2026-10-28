import { describe, expect, it } from 'vitest';
import { adoptSpace, packSpace, readSharedSpace, shareFilename } from '../src/core/spaceShare';
import {
  addFinding,
  addMark,
  addQuestion,
  createSpace,
  recordDecision,
} from '../src/core/spaces';
import type { Mark } from '../src/core/types';

function mark(id: string, snapshot: string, over: Partial<Mark> = {}): Mark {
  return {
    id,
    site: 'chatgpt',
    conversationId: 'c1',
    conversationTitle: 'Docker setup help',
    url: 'https://chatgpt.com/c/c1',
    label: 'chatgpt.com',
    color: 'yellow',
    snapshot,
    createdAt: 10,
    updatedAt: 10,
    ...over,
  };
}

const KEPT = 'Named volumes are kept, so your database survives.';
const BIND = 'A bind mount is not a named volume.';

function sender() {
  const marks = [mark('a1', KEPT, { note: 'Checked on 24.0.' }), mark('a2', BIND)];
  let space = createSpace('Docker teardown', 'How do I stop the stack safely?');
  space = addMark(space, 'a1');
  space = addMark(space, 'a2');
  space = addFinding(space, 'down keeps named volumes', 'supports', ['a1']);
  space = addQuestion(space, 'Which compose files use bind mounts?');
  space = recordDecision(space, 'Use down, never -v.');
  return { space, marks };
}

describe('packing a space', () => {
  it('sends only the highlights the space holds, not the library', () => {
    const { space, marks } = sender();
    const library = [...marks, mark('a9', 'Something else entirely', { conversationId: 'c2' })];

    const file = readSharedSpace(packSpace(space, library));
    expect(file.marks.map((m) => m.id).sort()).toEqual(['a1', 'a2']);
  });

  it('survives the round trip whole', () => {
    const { space, marks } = sender();
    const file = readSharedSpace(packSpace(space, marks));

    expect(file.space.question).toBe('How do I stop the stack safely?');
    expect(file.space.decision?.body).toBe('Use down, never -v.');
    expect(file.space.openQuestions).toEqual(['Which compose files use bind mounts?']);
    expect(file.space.findings[0]!.claim).toBe('down keeps named volumes');
    expect(file.space.findings[0]!.markIds).toEqual(['a1']);
    expect(file.marks.find((m) => m.id === 'a1')!.note).toBe('Checked on 24.0.');
  });

  it('names the file after the space', () => {
    expect(shareFilename(createSpace('Docker teardown'))).toBe('docker-teardown.kona-space.json');
    expect(shareFilename(createSpace('  !!!  '))).toBe('space.kona-space.json');
  });
});

describe('reading a file somebody sent', () => {
  it('refuses anything that is not one of ours', () => {
    expect(() => readSharedSpace('not json')).toThrow(/readable/);
    expect(() => readSharedSpace('{}')).toThrow(/shared from Kona/);
    expect(() => readSharedSpace(JSON.stringify({ app: 'kona', kind: 'backup' }))).toThrow(
      /shared from Kona/,
    );
  });

  it('says so rather than guessing when the file is from a newer Kona', () => {
    const file = JSON.stringify({ app: 'kona', kind: 'space', version: 99, space: {}, marks: [] });
    expect(() => readSharedSpace(file)).toThrow(/newer version/);
  });

  it('drops a highlight whose address could never make a link', () => {
    const file = JSON.stringify({
      app: 'kona',
      kind: 'space',
      version: 1,
      space: { name: 'Hostile', markIds: ['a1', 'bad'] },
      marks: [mark('a1', KEPT), mark('bad', 'click me', { url: 'javascript:alert(1)' })],
    });
    const read = readSharedSpace(file);
    expect(read.marks.map((m) => m.id)).toEqual(['a1']);
    expect(read.dropped).toBe(1);
    // And the space cannot still be holding the one that was dropped.
    expect(read.space.markIds).toEqual(['a1']);
  });

  it('keeps no property it was not expecting', () => {
    const file = JSON.stringify({
      app: 'kona',
      kind: 'space',
      version: 1,
      space: { name: 'Sneaky', markIds: ['a1'], isTeam: true, seats: 999 },
      marks: [{ ...mark('a1', KEPT), evil: 'payload' }],
    });
    const read = readSharedSpace(file);
    expect(read.space).not.toHaveProperty('isTeam');
    expect(read.space).not.toHaveProperty('seats');
    expect(read.marks[0]).not.toHaveProperty('evil');
  });

  it('will not let a claim cite a highlight that did not come with it', () => {
    // 'local-7' may well exist in the reader's library. The sender never saw it.
    const file = JSON.stringify({
      app: 'kona',
      kind: 'space',
      version: 1,
      space: {
        name: 'Borrowed evidence',
        markIds: ['a1', 'local-7'],
        findings: [{ id: 'f1', claim: 'Everything is fine', stance: 'supports', markIds: ['local-7'] }],
      },
      marks: [mark('a1', KEPT)],
    });
    const read = readSharedSpace(file);
    expect(read.space.markIds).toEqual(['a1']);
    expect(read.space.findings[0]!.markIds).toEqual([]);
  });

  it('falls back to something sane on a junk stance or colour', () => {
    const file = JSON.stringify({
      app: 'kona',
      kind: 'space',
      version: 1,
      space: {
        name: 'Odd',
        markIds: ['a1'],
        findings: [{ id: 'f1', claim: 'Hmm', stance: 'definitely', markIds: ['a1'] }],
      },
      marks: [mark('a1', KEPT, { color: 'octarine' as never, site: 'myspace' as never })],
    });
    const read = readSharedSpace(file);
    expect(read.space.findings[0]!.stance).toBe('open');
    expect(read.marks[0]!.color).toBe('yellow');
    expect(read.marks[0]!.site).toBe('web');
  });
});

describe('adopting a space into a library', () => {
  it('brings in highlights the library did not have', () => {
    const { space, marks } = sender();
    const file = readSharedSpace(packSpace(space, marks));

    const taken = adoptSpace(file, [], 500);
    expect(taken.added.map((m) => m.id).sort()).toEqual(['a1', 'a2']);
    expect(taken.reused).toBe(0);
    expect(taken.space.markIds.sort()).toEqual(['a1', 'a2']);
    expect(taken.space.updatedAt).toBe(500);
  });

  it('matches the same passage on its text, not on an id neither side agreed', () => {
    const { space, marks } = sender();
    const file = readSharedSpace(packSpace(space, marks));
    // The reader highlighted the same sentence themselves, so it has their id.
    const mine = [mark('mine-1', `  ${KEPT}  `, { note: 'My own reading.' })];

    const taken = adoptSpace(file, mine, 500);
    expect(taken.reused).toBe(1);
    expect(taken.added.map((m) => m.id)).toEqual(['a2']);
    // The claim now rests on the reader's copy of that passage.
    expect(taken.space.findings[0]!.markIds).toEqual(['mine-1']);
    expect(taken.space.markIds).toEqual(['mine-1', 'a2']);
  });

  it('does not overwrite a note the reader wrote themselves', () => {
    const { space, marks } = sender();
    const file = readSharedSpace(packSpace(space, marks));
    const mine = [mark('mine-1', KEPT, { note: 'My own reading.' })];

    const taken = adoptSpace(file, mine, 500);
    expect(taken.updated).toEqual([]);
  });

  it('takes the sender’s note when the reader had written none', () => {
    const { space, marks } = sender();
    const file = readSharedSpace(packSpace(space, marks));
    const mine = [mark('mine-1', KEPT)];

    const taken = adoptSpace(file, mine, 500);
    expect(taken.updated).toHaveLength(1);
    expect(taken.updated[0]!.id).toBe('mine-1');
    expect(taken.updated[0]!.note).toBe('Checked on 24.0.');
    expect(taken.updated[0]!.updatedAt).toBe(500);
  });

  it('re-ids an incoming highlight that collides with a different passage', () => {
    const { space, marks } = sender();
    const file = readSharedSpace(packSpace(space, marks));
    // Same id, entirely different passage: the reader's 'a1' must survive.
    const mine = [mark('a1', 'Something unrelated', { conversationId: 'c9' })];

    const taken = adoptSpace(file, mine, 500);
    const ids = taken.added.map((m) => m.id);
    expect(ids).not.toContain('a1');
    expect(ids).toHaveLength(2);
    // Whatever it was renamed to, the space and its claim point at it.
    const renamed = taken.added.find((m) => m.snapshot === KEPT)!;
    expect(taken.space.findings[0]!.markIds).toEqual([renamed.id]);
    expect(taken.space.markIds).toContain(renamed.id);
  });

  it('gives the arriving space a new id, so importing twice does not clobber', () => {
    const { space, marks } = sender();
    const file = readSharedSpace(packSpace(space, marks));

    const first = adoptSpace(file, [], 500);
    const second = adoptSpace(file, first.added, 600);
    expect(first.space.id).not.toBe(space.id);
    expect(second.space.id).not.toBe(first.space.id);
    // The second import reuses every highlight rather than duplicating them.
    expect(second.reused).toBe(2);
    expect(second.added).toEqual([]);
  });

  it('passes a space back and forth without the evidence growing', () => {
    const { space, marks } = sender();
    const there = adoptSpace(readSharedSpace(packSpace(space, marks)), [], 500);
    const library = [...marks];
    const back = adoptSpace(readSharedSpace(packSpace(there.space, there.added)), library, 600);
    expect(back.added).toEqual([]);
    expect(back.reused).toBe(2);
  });
});
