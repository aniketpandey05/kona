import { describe, expect, it } from 'vitest';
import { adoptSpace, packSpace, readSharedSpace, shareFilename } from '../src/core/spaceShare';
import {
  addFinding,
  addMark,
  addQuestion,
  createSpace,
  recordDecision,
  removeMark,
} from '../src/core/spaces';
import type { Space } from '../src/core/spaces';
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

    const taken = adoptSpace(file, [], [], 500);
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

    const taken = adoptSpace(file, mine, [], 500);
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

    const taken = adoptSpace(file, mine, [], 500);
    expect(taken.updated).toEqual([]);
  });

  it('takes the sender’s note when the reader had written none', () => {
    const { space, marks } = sender();
    const file = readSharedSpace(packSpace(space, marks));
    const mine = [mark('mine-1', KEPT)];

    const taken = adoptSpace(file, mine, [], 500);
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

    const taken = adoptSpace(file, mine, [], 500);
    const ids = taken.added.map((m) => m.id);
    expect(ids).not.toContain('a1');
    expect(ids).toHaveLength(2);
    // Whatever it was renamed to, the space and its claim point at it.
    const renamed = taken.added.find((m) => m.snapshot === KEPT)!;
    expect(taken.space.findings[0]!.markIds).toEqual([renamed.id]);
    expect(taken.space.markIds).toContain(renamed.id);
  });

  it('gives an arriving space its own local id, but keeps where it came from', () => {
    const { space, marks } = sender();
    const taken = adoptSpace(readSharedSpace(packSpace(space, marks)), [], [], 500);
    expect(taken.space.id).not.toBe(space.id);
    expect(taken.merged).toBe(false);
    // The origin is what makes the trip back a merge rather than a third copy.
    expect(taken.space.origin).toBe(space.id);
  });

  it('merges a second import into the copy already here, rather than beside it', () => {
    const { space, marks } = sender();
    const file = readSharedSpace(packSpace(space, marks));

    const first = adoptSpace(file, [], [], 500);
    const second = adoptSpace(file, first.added, [first.space], 600);
    expect(second.merged).toBe(true);
    expect(second.space.id).toBe(first.space.id);
    expect(second.space.markIds).toEqual(first.space.markIds);
    expect(second.space.findings).toHaveLength(first.space.findings.length);
    expect(second.added).toEqual([]);
    expect(second.reused).toBe(2);
  });
});

describe('a space coming back with someone else’s work in it', () => {
  const marks = [mark('a1', KEPT, { note: 'Checked on 24.0.' }), mark('a2', BIND)];

  /** You send a space; they add to it; you take it back. */
  function roundTrip(theirEdit: (space: Space) => Space) {
    let mine = createSpace('Docker teardown', 'How do I stop the stack safely?');
    mine = addMark(mine, 'a1');
    mine = addFinding(mine, 'down keeps named volumes', 'supports', ['a1']);

    const theirs = adoptSpace(readSharedSpace(packSpace(mine, marks)), [], [], 500);
    const edited = theirEdit(theirs.space);
    const back = adoptSpace(
      readSharedSpace(packSpace(edited, [...marks, ...theirs.added])),
      marks,
      [mine],
      600,
    );
    return { mine, back };
  }

  it('comes back into the same space, not a second one', () => {
    const { mine, back } = roundTrip((space) => addQuestion(space, 'What about bind mounts?'));
    expect(back.merged).toBe(true);
    expect(back.space.id).toBe(mine.id);
    expect(back.space.updatedAt).toBe(600);
  });

  it('brings their highlights, conclusions and open questions with it', () => {
    const { back } = roundTrip((space) => {
      let edited = addMark(space, 'a2');
      edited = addFinding(edited, 'Bind mounts are not covered', 'contradicts', ['a2']);
      return addQuestion(edited, 'What about bind mounts?');
    });
    expect(back.space.markIds).toContain('a2');
    expect(back.space.findings.map((f) => f.claim)).toEqual([
      'down keeps named volumes',
      'Bind mounts are not covered',
    ]);
    expect(back.space.openQuestions).toEqual(['What about bind mounts?']);
  });

  it('does not delete what they took out — the merge only ever adds', () => {
    // They removed the highlight the whole space rests on. On their copy that
    // is their business; on mine it would be an import deleting my work.
    const { mine, back } = roundTrip((space) => removeMark(space, 'a1'));
    expect(back.space.markIds).toEqual(mine.markIds);
    expect(back.space.findings).toHaveLength(1);
  });

  it('takes a decision they reached, because mine has none', () => {
    const { back } = roundTrip((space) => recordDecision(space, 'Go in January.', 550));
    expect(back.space.decision?.body).toBe('Go in January.');
  });

  it('keeps my later decision over their earlier one', () => {
    let mine = createSpace('Docker teardown', 'Safe?');
    mine = addMark(mine, 'a1');
    const theirs = adoptSpace(readSharedSpace(packSpace(mine, marks)), [], [], 500);
    const decided = recordDecision(theirs.space, 'Wait until spring.', 520);
    mine = recordDecision(mine, 'Go in January.', 580);

    const back = adoptSpace(readSharedSpace(packSpace(decided, marks)), marks, [mine], 600);
    expect(back.space.decision?.body).toBe('Go in January.');
  });

  it('does not let them rename a question I already asked', () => {
    let mine = createSpace('Docker teardown', 'How do I stop the stack safely?');
    mine = addMark(mine, 'a1');
    const theirs = adoptSpace(readSharedSpace(packSpace(mine, marks)), [], [], 500);
    const renamed = { ...theirs.space, question: 'Something else entirely' };

    const back = adoptSpace(readSharedSpace(packSpace(renamed, marks)), marks, [mine], 600);
    expect(back.space.question).toBe('How do I stop the stack safely?');
  });

  it('still files an unrelated space of theirs separately', () => {
    const mine = addMark(createSpace('Docker teardown', 'Safe?'), 'a1');
    const unrelated = addMark(createSpace('Thesis chapter 3', 'Replicates?'), 'a2');

    const taken = adoptSpace(readSharedSpace(packSpace(unrelated, marks)), marks, [mine], 600);
    expect(taken.merged).toBe(false);
    expect(taken.space.id).not.toBe(mine.id);
  });
});