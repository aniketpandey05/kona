import { describe, expect, it } from 'vitest';
import { createBackup, readBackup } from '../src/core/backup';
import { makePerson } from '../src/core/people';
import { addComment, addFinding, addMark, createSpace, recordDecision } from '../src/core/spaces';
import type { Mark } from '../src/core/types';

const mark = (id: string) =>
  ({ id, site: 'chatgpt', conversationId: 'c1', snapshot: 'some text' }) as Mark;

describe('backup', () => {
  it('survives a round trip', () => {
    const marks = [mark('a'), mark('b')];
    expect(readBackup(createBackup(marks)).marks).toEqual(marks);
  });

  it('also accepts a plain list of highlights', () => {
    expect(readBackup(JSON.stringify([mark('a')])).marks.length).toBe(1);
  });

  it('skips entries that are not highlights', () => {
    const file = JSON.stringify({ marks: [mark('a'), { id: 'b' }, null, 'nope'] });
    expect(readBackup(file).marks.map((m) => m.id)).toEqual(['a']);
  });

  it('explains what is wrong with a bad file', () => {
    expect(() => readBackup('not json')).toThrow(/readable/);
    expect(() => readBackup('{"hello":"world"}')).toThrow(/backup/);
    expect(() => readBackup('[]')).toThrow(/No highlights/);
  });

  it('reads a backup from before spaces existed', () => {
    const old = JSON.stringify({ app: 'kona', version: 1, exportedAt: 1, marks: [mark('a')] });
    const restored = readBackup(old);
    expect(restored.marks).toHaveLength(1);
    expect(restored.spaces).toEqual([]);
    expect(restored.identity).toBeNull();
  });
});

describe('a backup that has to move everything', () => {
  const priya = makePerson('Priya', 'p1');
  const marks = [mark('a'), mark('b')];

  function worked() {
    let space = addMark(createSpace('Upgrade', 'Can we do it without downtime?'), 'a', priya);
    space = addMark(space, 'b', priya);
    space = addComment(space, 'a', 'This is the one that bit us.', priya, 100);
    space = addFinding(space, 'Link mode is faster', 'supports', ['a'], priya, 110);
    space = recordDecision(space, 'Go in January.', priya, 120);
    return space;
  }

  it('brings the question, the evidence and what was concluded', () => {
    const restored = readBackup(createBackup(marks, [worked()]));
    const space = restored.spaces[0]!;
    expect(space.name).toBe('Upgrade');
    expect(space.question).toBe('Can we do it without downtime?');
    expect(space.markIds).toEqual(['a', 'b']);
    expect(space.findings[0]?.claim).toBe('Link mode is faster');
    expect(space.decision?.body).toBe('Go in January.');
  });

  it('brings the discussion and who everybody was', () => {
    const restored = readBackup(createBackup(marks, [worked()]));
    const space = restored.spaces[0]!;
    expect(space.comments?.[0]?.body).toBe('This is the one that bit us.');
    expect(space.people?.map((person) => person.name)).toEqual(['Priya']);
    expect(space.gathered?.a).toBe('p1');
  });

  it('brings you, so your own work still reads as yours', () => {
    const identity = { me: { ...priya, key: 'a-public-key' }, signingKey: { kty: 'EC' } };
    const restored = readBackup(createBackup(marks, [worked()], identity));
    expect(restored.identity?.me.name).toBe('Priya');
    expect(restored.identity?.me.key).toBe('a-public-key');
    expect(restored.identity?.signingKey?.kty).toBe('EC');
  });

  it('writes no identity at all when there is nobody to write', () => {
    expect(readBackup(createBackup(marks, [worked()])).identity).toBeNull();
  });

  it('drops a space citing highlights the file does not have', () => {
    // The same rule a shared space follows: a claim may only cite evidence
    // that came with it.
    const restored = readBackup(createBackup([mark('a')], [worked()]));
    expect(restored.spaces[0]?.markIds).toEqual(['a']);
    expect(restored.spaces[0]?.comments).toHaveLength(1);
  });

  it('takes nothing from a spaces field that is not spaces', () => {
    const file = JSON.stringify({ marks: [mark('a')], spaces: ['nope', null, 42, {}] });
    expect(readBackup(file).spaces).toEqual([]);
  });

  it('takes nothing from an identity that is not one', () => {
    const file = (identity: unknown) => JSON.stringify({ marks: [mark('a')], identity });
    expect(readBackup(file('Priya')).identity).toBeNull();
    expect(readBackup(file({ me: { id: 'p1' } })).identity).toBeNull();
    expect(readBackup(file({ me: { id: 'p1', name: 'Priya' } })).identity?.me.name).toBe('Priya');
  });

  it('refuses a signing key that is not a key', () => {
    const file = JSON.stringify({
      marks: [mark('a')],
      identity: { me: { id: 'p1', name: 'Priya' }, signingKey: 'give me your secrets' },
    });
    expect(readBackup(file).identity?.signingKey).toBeUndefined();
  });
});
