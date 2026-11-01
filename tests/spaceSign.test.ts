import { describe, expect, it } from 'vitest';
import { makeKeypair } from '../src/core/identity';
import { makePerson, type Person } from '../src/core/people';
import {
  addComment,
  addFinding,
  addMark,
  commentsOn,
  createSpace,
  editComment,
  recordDecision,
  type Space,
} from '../src/core/spaces';
import { checkSpace, DECISION, signMine } from '../src/core/spaceSign';

interface Signer {
  person: Person;
  privateKey: JsonWebKey;
}

async function signer(name: string, id: string): Promise<Signer> {
  const pair = (await makeKeypair())!;
  return { person: { ...makePerson(name, id), key: pair.publicKey }, privateKey: pair.privateKey };
}

/** A space Priya has written every part of, signed on its way out. */
async function hers(priya: Signer): Promise<Space> {
  let space = addMark(createSpace('Upgrade', 'When?'), 'k1', priya.person, 90);
  space = addComment(space, 'k1', 'Measured on 13, not 16.', priya.person, 100);
  space = addFinding(space, 'Link mode is faster', 'supports', ['k1'], priya.person, 110);
  space = recordDecision(space, 'Go in January.', priya.person, 120);
  return signMine(space, priya.person, priya.privateKey);
}

describe('signing what you wrote', () => {
  it('signs the reply, the conclusion and the decision', async () => {
    const priya = await signer('Priya', 'p1');
    const space = await hers(priya);
    expect(space.comments?.[0]?.sig).toBeTruthy();
    expect(space.findings[0]?.sig).toBeTruthy();
    expect(space.decision?.sig).toBeTruthy();
  });

  it('leaves somebody else’s work alone', async () => {
    const priya = await signer('Priya', 'p1');
    const sam = await signer('Sam', 's1');
    let space = addMark(createSpace('Upgrade', 'When?'), 'k1', priya.person);
    space = addComment(space, 'k1', 'Mine.', priya.person, 100);
    space = addComment(space, 'k1', 'His.', sam.person, 110);
    const signed = await signMine(space, priya.person, priya.privateKey);
    expect(commentsOn(signed, 'k1')[0]?.sig).toBeTruthy();
    expect(commentsOn(signed, 'k1')[1]?.sig).toBeUndefined();
  });

  it('puts your key in the space, so the other side can check it', async () => {
    const priya = await signer('Priya', 'p1');
    const space = await hers(priya);
    expect(space.people?.find((person) => person.id === 'p1')?.key).toBe(priya.person.key);
  });
});

describe('checking what came back', () => {
  it('says every signature is good when nothing has been touched', async () => {
    const priya = await signer('Priya', 'p1');
    const space = await hers(priya);
    const checked = await checkSpace(space);
    expect(checked.broken.size).toBe(0);
    expect(checked.verified.size).toBe(3);
    expect(checked.verified.has(DECISION)).toBe(true);
    expect([...checked.proven]).toEqual(['p1']);
  });

  it('catches a reply whose words have been changed underneath it', async () => {
    const priya = await signer('Priya', 'p1');
    const space = await hers(priya);
    const id = space.comments![0]!.id;
    // What a hostile file looks like: the signature left in place over words
    // that are no longer the words it was made for.
    const tampered: Space = {
      ...space,
      comments: space.comments!.map((entry) => ({ ...entry, body: 'Measured on 16, actually.' })),
    };
    const checked = await checkSpace(tampered);
    expect(checked.broken.has(id)).toBe(true);
    expect(checked.proven.has('p1')).toBe(false);
    // The other two were not touched and still stand.
    expect(checked.verified.size).toBe(2);
  });

  it('catches a conclusion moved into somebody else’s name', async () => {
    const priya = await signer('Priya', 'p1');
    const sam = await signer('Sam', 's1');
    const space = await hers(priya);
    const reattributed: Space = {
      ...space,
      people: [...(space.people ?? []), sam.person],
      findings: space.findings.map((finding) => ({ ...finding, by: 's1' })),
    };
    const checked = await checkSpace(reattributed);
    expect(checked.broken.has(space.findings[0]!.id)).toBe(true);
    expect(checked.proven.has('s1')).toBe(false);
  });

  it('catches a signature from somebody there is no key for', async () => {
    const priya = await signer('Priya', 'p1');
    const space = await hers(priya);
    const keyless: Space = {
      ...space,
      people: (space.people ?? []).map(({ id, name }) => ({ id, name })),
    };
    const checked = await checkSpace(keyless);
    expect(checked.broken.size).toBe(3);
    expect(checked.verified.size).toBe(0);
  });

  it('does not call an unsigned space suspect', async () => {
    const priya = makePerson('Priya', 'p1');
    let space = addMark(createSpace('Upgrade', 'When?'), 'k1', priya);
    space = addComment(space, 'k1', 'Nothing signed here.', priya, 100);
    const checked = await checkSpace(space);
    expect(checked.broken.size).toBe(0);
    expect(checked.verified.size).toBe(0);
    expect(checked.proven.size).toBe(0);
  });
});

describe('rewording something you already signed', () => {
  it('drops the signature rather than leaving a false one', async () => {
    const priya = await signer('Priya', 'p1');
    const space = await hers(priya);
    const id = space.comments![0]!.id;
    const reworded = editComment(space, id, 'Measured on 13 — rerun asked for.', 300);
    expect(reworded.comments?.[0]?.sig).toBeUndefined();

    // Unsigned, so it is not evidence of anything — but nor is it a forgery.
    const checked = await checkSpace(reworded);
    expect(checked.broken.size).toBe(0);
  });

  it('is signed again the next time the space goes out', async () => {
    const priya = await signer('Priya', 'p1');
    const space = await hers(priya);
    const id = space.comments![0]!.id;
    const reworded = editComment(space, id, 'Measured on 13 — rerun asked for.', 300);
    const resigned = await signMine(reworded, priya.person, priya.privateKey);
    const checked = await checkSpace(resigned);
    expect(checked.verified.has(id)).toBe(true);
    expect(checked.broken.size).toBe(0);
  });
});
