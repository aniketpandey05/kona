import { describe, expect, it } from 'vitest';
import { makePerson } from '../src/core/people';
import {
  addComment,
  addFinding,
  addMark,
  addQuestion,
  closeQuestion,
  commentsOn,
  createSpace,
  editComment,
  gathererOf,
  isSettled,
  isShared,
  marksIn,
  recordDecision,
  removeComment,
  removeMark,
  reopen,
  setSettled,
  sourcesFor,
  statusOf,
  unusedIn,
  whoFound,
} from '../src/core/spaces';
import { buildMemo, memoMarkdown } from '../src/core/memo';
import type { Mark } from '../src/core/types';

function mark(id: string, snapshot: string, createdAt = 1): Mark {
  return {
    id,
    site: 'web',
    conversationId: 'c',
    conversationTitle: 'A page',
    url: 'https://example.com/page',
    label: 'example.com',
    color: 'yellow',
    snapshot,
    createdAt,
    updatedAt: createdAt,
  };
}

describe('a space', () => {
  it('is a shelf until it asks something', () => {
    expect(statusOf(createSpace('Reading'))).toBe('shelf');
    expect(statusOf(createSpace('Upgrade', 'Can we upgrade safely?'))).toBe('open');
  });

  it('is settled once there is a decision, and open again if that is withdrawn', () => {
    let space = createSpace('Upgrade', 'Can we upgrade safely?');
    space = recordDecision(space, 'Yes, in January.');
    expect(statusOf(space)).toBe('settled');
    expect(statusOf(reopen(space))).toBe('open');
  });

  it('gathers a highlight once, however many times it is added', () => {
    let space = createSpace('Upgrade');
    space = addMark(space, 'k1');
    space = addMark(space, 'k1');
    expect(space.markIds).toEqual(['k1']);
  });

  it('keeps questions in the order they were asked, and closes by position', () => {
    let space = createSpace('Upgrade', 'When?');
    space = addQuestion(space, 'How long does it take?');
    space = addQuestion(space, 'Who owns the rollback?');
    space = closeQuestion(space, 0);
    expect(space.openQuestions).toEqual(['Who owns the rollback?']);
  });

  it('ignores an empty claim, question or decision rather than storing a blank one', () => {
    const space = createSpace('Upgrade', 'When?');
    expect(addFinding(space, '   ', 'supports', ['k1']).findings).toHaveLength(0);
    expect(addQuestion(space, '  ').openQuestions).toHaveLength(0);
    expect(recordDecision(space, ' ').decision).toBeUndefined();
  });
});

describe('sourcesFor', () => {
  const marks = [mark('k1', 'First passage'), mark('k2', 'Second passage')];

  it('resolves the highlights a finding rests on', () => {
    let space = createSpace('Upgrade', 'When?');
    space = addMark(space, 'k1');
    space = addMark(space, 'k2');
    space = addFinding(space, 'Both say so', 'supports', ['k1', 'k2']);
    const { present, withdrawn } = sourcesFor(space, space.findings[0]!, marks);
    expect(present.map((m) => m.id)).toEqual(['k1', 'k2']);
    expect(withdrawn).toBe(0);
  });

  it('will not resolve a source the space no longer holds', () => {
    let space = createSpace('Upgrade', 'When?');
    space = addMark(space, 'k1');
    space = addMark(space, 'k2');
    space = addFinding(space, 'Both say so', 'supports', ['k1', 'k2']);
    space = removeMark(space, 'k2');

    const { present, withdrawn } = sourcesFor(space, space.findings[0]!, marks);
    expect(present.map((m) => m.id)).toEqual(['k1']);
    expect(withdrawn).toBe(1);
  });

  it('counts a source whose highlight has been deleted outright', () => {
    let space = createSpace('Upgrade', 'When?');
    space = addMark(space, 'k1');
    space = addMark(space, 'gone');
    space = addFinding(space, 'Rests on both', 'supports', ['k1', 'gone']);

    // 'gone' is still gathered, but no such highlight exists any more.
    const { present, withdrawn } = sourcesFor(space, space.findings[0]!, marks);
    expect(present.map((m) => m.id)).toEqual(['k1']);
    expect(withdrawn).toBe(1);
  });
});

describe('marksIn and unusedIn', () => {
  const marks = [mark('k1', 'First', 10), mark('k2', 'Second', 20), mark('k3', 'Third', 30)];

  it('returns what the space holds, newest first', () => {
    let space = createSpace('Reading');
    space = addMark(space, 'k1');
    space = addMark(space, 'k3');
    expect(marksIn(space, marks).map((m) => m.id)).toEqual(['k3', 'k1']);
  });

  it('leaves out anything already behind a finding', () => {
    let space = createSpace('Reading', 'Why?');
    space = addMark(space, 'k1');
    space = addMark(space, 'k2');
    space = addFinding(space, 'Because', 'supports', ['k2']);
    expect(unusedIn(space, marks).map((m) => m.id)).toEqual(['k1']);
  });
});

describe('the write-up', () => {
  const marks = [mark('k1', 'Link mode is faster'), mark('k2', 'But it is destructive')];

  function settled() {
    let space = createSpace('Upgrade', 'Can we upgrade safely?');
    space = addMark(space, 'k1');
    space = addMark(space, 'k2');
    space = addFinding(space, 'Link mode is much faster', 'supports', ['k1']);
    space = addFinding(space, 'It destroys the old cluster', 'contradicts', ['k2']);
    space = addQuestion(space, 'How long on 1.4TB?');
    return recordDecision(space, 'Go in January, behind a verified backup.');
  }

  it('titles itself with the question, and numbers each source once', () => {
    const memo = buildMemo(settled(), marks);
    expect(memo.title).toBe('Can we upgrade safely?');
    expect(memo.citations.map((c) => c.n)).toEqual([1, 2]);
    expect(memo.lines[0]!.cites).toEqual([1]);
    expect(memo.lines[1]!.cites).toEqual([2]);
    expect(memo.lines[1]!.contradicts).toBe(true);
  });

  it('gives a source one number however many claims cite it', () => {
    let space = createSpace('Upgrade', 'When?');
    space = addMark(space, 'k1');
    space = addFinding(space, 'First claim', 'supports', ['k1']);
    space = addFinding(space, 'Second claim', 'supports', ['k1']);
    const memo = buildMemo(space, marks);
    expect(memo.citations).toHaveLength(1);
    expect(memo.lines.map((line) => line.cites)).toEqual([[1], [1]]);
  });

  it('says a claim is short a source rather than publishing it whole', () => {
    const space = removeMark(settled(), 'k2');
    const memo = buildMemo(space, marks);
    expect(memo.lines[1]!.withdrawn).toBe(1);
    expect(memo.lines[1]!.cites).toEqual([]);
    expect(memoMarkdown(memo)).toContain('1 source no longer here');
  });

  it('writes the decision, the open questions and a link per source', () => {
    const text = memoMarkdown(buildMemo(settled(), marks));
    expect(text).toContain('# Can we upgrade safely?');
    expect(text).toContain('Go in January, behind a verified backup.');
    expect(text).toContain('How long on 1.4TB?');
    // Every source gets a footnote carrying a link that lands on the passage.
    expect(text).toContain('[^1]: example.com — A page. <https://example.com/page#:~:text=');
  });

  // The thing that makes a space worth opening: you get a document out of it before
  // you have worked anything out. Concluding something is an addition, not the toll.
  it('is already a cited document from the first highlights, with nothing concluded', () => {
    const gathered = [mark('k1', 'Link mode is faster', 10), mark('k2', 'But it is destructive', 20)];
    let space = createSpace('Upgrade', 'What changed in 1.4?');
    space = addMark(space, 'k1');
    space = addMark(space, 'k2');

    const memo = buildMemo(space, gathered);
    expect(memo.lines).toEqual([]);
    expect(memo.highlights.map((h) => h.mark.id)).toEqual(['k2', 'k1']);
    expect(memo.citations).toHaveLength(2);

    const text = memoMarkdown(memo);
    expect(text).toContain('## What I kept');
    expect(text).not.toContain('## What I concluded');
    expect(text).toContain('> Link mode is faster');
    expect(text).toContain('> But it is destructive');
    // Each passage still names where it came from and carries its footnote.
    expect(text).toContain('— example.com[^1]');
    expect(text).toContain('[^2]: example.com — A page. <https://example.com/page#:~:text=');
  });

  it('carries the note you wrote on a highlight into the passage', () => {
    const noted = [{ ...mark('k1', 'Link mode is faster', 10), note: 'Only with a backup.' }];
    let space = createSpace('Upgrade', 'Safe?');
    space = addMark(space, 'k1');
    expect(memoMarkdown(buildMemo(space, noted))).toContain('> Only with a backup.');
  });

  it('drops a withdrawn highlight from the passages, not just the claims', () => {
    const memo = buildMemo(removeMark(settled(), 'k2'), marks);
    expect(memo.highlights.map((h) => h.mark.id)).toEqual(['k1']);
    // The claim survives, marked short a source; the passage itself is gone.
    expect(memoMarkdown(memo)).not.toContain('> But it is destructive');
  });
});

describe('putting a name to the work', () => {
  const priya = makePerson('Priya', 'p1');
  const sam = makePerson('Sam', 's1');

  it('credits whoever brought a highlight in', () => {
    const space = addMark(createSpace('Upgrade', 'When?'), 'k1', priya);
    expect(gathererOf(space, 'k1')?.name).toBe('Priya');
    expect(space.people).toEqual([priya]);
  });

  it('records nothing when nobody has said who they are', () => {
    const space = addMark(createSpace('Upgrade', 'When?'), 'k1');
    expect(gathererOf(space, 'k1')).toBeNull();
    expect(space.people).toBeUndefined();
  });

  it('is not a shared space until a second person turns up', () => {
    let space = addMark(createSpace('Upgrade', 'When?'), 'k1', priya);
    expect(isShared(space)).toBe(false);
    space = addMark(space, 'k2', sam);
    expect(isShared(space)).toBe(true);
  });

  it('credits a conclusion and a decision', () => {
    let space = addMark(createSpace('Upgrade', 'When?'), 'k1', priya);
    space = addFinding(space, 'Link mode is faster', 'supports', ['k1'], sam);
    space = recordDecision(space, 'Go in January.', priya);
    expect(space.findings[0]?.by).toBe('s1');
    expect(space.decision?.by).toBe('p1');
    expect(space.people).toHaveLength(2);
  });

  it('forgets who found a highlight that has been taken back out', () => {
    let space = addMark(createSpace('Upgrade', 'When?'), 'k1', priya);
    space = removeMark(space, 'k1');
    expect(space.gathered?.k1).toBeUndefined();
  });
});

describe('arguing about one highlight', () => {
  const priya = makePerson('Priya', 'p1');

  const gathered = () => addMark(createSpace('Upgrade', 'When?'), 'k1', priya);

  it('keeps what was said, against the highlight it was said about', () => {
    const space = addComment(gathered(), 'k1', 'This was 13, not 16.', priya);
    const said = commentsOn(space, 'k1');
    expect(said).toHaveLength(1);
    expect(said[0]?.body).toBe('This was 13, not 16.');
    expect(said[0]?.by).toBe('p1');
  });

  it('will not take a reply about a highlight this space does not hold', () => {
    const space = addComment(gathered(), 'k9', 'Nothing to reply to.', priya);
    expect(space.comments ?? []).toHaveLength(0);
  });

  it('will not take an empty reply', () => {
    expect(addComment(gathered(), 'k1', '   ', priya).comments ?? []).toHaveLength(0);
  });

  it('shows a thread oldest first, however it was written', () => {
    let space = addComment(gathered(), 'k1', 'Second', priya, 200);
    space = addComment(space, 'k1', 'First', priya, 100);
    expect(commentsOn(space, 'k1').map((entry) => entry.body)).toEqual(['First', 'Second']);
  });

  it('keeps one highlight’s argument out of another’s', () => {
    let space = addMark(gathered(), 'k2', priya);
    space = addComment(space, 'k1', 'About the first', priya);
    expect(commentsOn(space, 'k2')).toHaveLength(0);
  });

  it('lets what was said be reworded or withdrawn', () => {
    let space = addComment(gathered(), 'k1', 'Thsi was 13.', priya);
    const id = space.comments?.[0]?.id ?? '';
    space = editComment(space, id, 'This was 13.');
    expect(commentsOn(space, 'k1')[0]?.body).toBe('This was 13.');
    space = removeComment(space, id);
    expect(commentsOn(space, 'k1')).toHaveLength(0);
  });

  it('settles a thread without deleting it, and opens it again', () => {
    let space = addComment(gathered(), 'k1', 'Agreed then.', priya);
    space = setSettled(space, 'k1', true);
    expect(isSettled(space, 'k1')).toBe(true);
    expect(commentsOn(space, 'k1')).toHaveLength(1);
    space = setSettled(space, 'k1', false);
    expect(isSettled(space, 'k1')).toBe(false);
  });

  it('takes the argument out with the passage it was about', () => {
    let space = addComment(gathered(), 'k1', 'Not so.', priya);
    space = setSettled(space, 'k1', true);
    space = removeMark(space, 'k1');
    expect(space.comments).toHaveLength(0);
    expect(space.settled).toHaveLength(0);
  });
});

describe('a write-up more than one person worked on', () => {
  const priya = makePerson('Priya', 'p1');
  const sam = makePerson('Sam', 's1');
  const marks = [mark('k1', 'Link mode is faster'), mark('k2', 'But it is destructive')];

  const both = () => {
    let space = addMark(createSpace('Upgrade', 'Can we upgrade without downtime?'), 'k1', priya);
    space = addMark(space, 'k2', sam);
    space = addFinding(space, 'Link mode is faster', 'supports', ['k1'], sam);
    space = recordDecision(space, 'Go in January.', priya);
    return space;
  };

  it('says we, and says who', () => {
    const memo = buildMemo(both(), marks);
    expect(memo.shared).toBe(true);
    expect(memo.decidedBy).toBe('Priya');
    expect(memo.lines[0]?.by).toBe('Sam');
    expect(memo.highlights.find((entry) => entry.mark.id === 'k2')?.by).toBe('Sam');

    const out = memoMarkdown(memo);
    expect(out).toContain('## What we decided');
    expect(out).toContain('## What we concluded');
    expect(out).toContain('## What we kept');
    expect(out).toContain('— Sam');
    expect(out).toContain('found by Priya');
  });

  it('says I, and names nobody, when it is only mine', () => {
    let space = addMark(createSpace('Upgrade', 'When?'), 'k1', priya);
    space = addFinding(space, 'Link mode is faster', 'supports', ['k1'], priya);
    const memo = buildMemo(space, marks);
    expect(memo.shared).toBe(false);
    expect(memo.lines[0]?.by).toBeUndefined();
    expect(memoMarkdown(memo)).toContain('## What I concluded');
    expect(memoMarkdown(memo)).not.toContain('— Priya');
  });
});

describe('who found what, across every space', () => {
  const priya = makePerson('Priya', 'p1');
  const sam = makePerson('Sam', 's1');

  it('credits a highlight from whichever space holds it', () => {
    const upgrade = addMark(createSpace('Upgrade'), 'k1', priya);
    const docker = addMark(createSpace('Docker'), 'k2', sam);
    const found = whoFound([upgrade, docker]);
    expect(found.get('k1')?.map((person) => person.name)).toEqual(['Priya']);
    expect(found.get('k2')?.map((person) => person.name)).toEqual(['Sam']);
  });

  it('credits both when two spaces disagree about who found it', () => {
    const upgrade = addMark(createSpace('Upgrade'), 'k1', priya);
    const docker = addMark(createSpace('Docker'), 'k1', sam);
    expect(whoFound([upgrade, docker]).get('k1')?.map((person) => person.name)).toEqual([
      'Priya',
      'Sam',
    ]);
  });

  it('credits a person once, however many spaces they put it in', () => {
    const upgrade = addMark(createSpace('Upgrade'), 'k1', priya);
    const docker = addMark(createSpace('Docker'), 'k1', priya);
    expect(whoFound([upgrade, docker]).get('k1')).toHaveLength(1);
  });

  it('says nothing about a highlight nobody put a name to', () => {
    expect(whoFound([addMark(createSpace('Upgrade'), 'k1')]).size).toBe(0);
  });
});

describe('a reply that has been reworded', () => {
  const priya = makePerson('Priya', 'p1');
  const gathered = () => addMark(createSpace('Upgrade', 'When?'), 'k1', priya);

  it('says when it was changed', () => {
    let space = addComment(gathered(), 'k1', 'Thsi was 13.', priya, 100);
    const id = space.comments?.[0]?.id ?? '';
    space = editComment(space, id, 'This was 13.', 200);
    expect(commentsOn(space, 'k1')[0]?.body).toBe('This was 13.');
    expect(commentsOn(space, 'k1')[0]?.editedAt).toBe(200);
  });

  it('is not called edited when the wording has not moved', () => {
    let space = addComment(gathered(), 'k1', 'This was 13.', priya, 100);
    const id = space.comments?.[0]?.id ?? '';
    space = editComment(space, id, '   This was 13.   ', 200);
    expect(commentsOn(space, 'k1')[0]?.editedAt).toBeUndefined();
  });

  it('starts out not edited', () => {
    const space = addComment(gathered(), 'k1', 'This was 13.', priya, 100);
    expect(commentsOn(space, 'k1')[0]?.editedAt).toBeUndefined();
  });
});
