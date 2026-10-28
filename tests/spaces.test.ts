import { describe, expect, it } from 'vitest';
import {
  addFinding,
  addMark,
  addQuestion,
  closeQuestion,
  createSpace,
  marksIn,
  recordDecision,
  removeMark,
  reopen,
  sourcesFor,
  statusOf,
  unusedIn,
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
});
