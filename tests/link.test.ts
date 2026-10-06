import { describe, expect, it } from 'vitest';
import { linkToMark } from '../src/core/link';
import type { Mark } from '../src/core/types';

function mark(over: Partial<Mark> = {}): Mark {
  return {
    id: 'a',
    site: 'web',
    conversationId: 'c',
    conversationTitle: 'An article',
    url: 'https://example.com/post',
    label: '',
    color: 'yellow',
    snapshot: 'the quick brown fox',
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

const quote = (over: Partial<NonNullable<Mark['quote']>> = {}) => ({
  exact: 'the quick brown fox',
  prefix: '',
  suffix: '',
  start: 0,
  ...over,
});

describe('linkToMark', () => {
  it('addresses the passage with a text fragment', () => {
    expect(linkToMark(mark({ quote: quote() }))).toBe(
      'https://example.com/post#:~:text=the%20quick%20brown%20fox',
    );
  });

  it('falls back to the snapshot when there is no quote', () => {
    expect(linkToMark(mark())).toContain('#:~:text=the%20quick%20brown%20fox');
  });

  it('carries context so a repeated phrase lands on the right one', () => {
    const link = linkToMark(
      mark({ quote: quote({ prefix: 'and then suddenly ', suffix: ' jumped over' }) }),
    );
    expect(link).toContain('text=and%20then%20suddenly-,');
    expect(link).toContain(',-jumped%20over');
  });

  it('keeps context to whole words, since a part-word prefix never matches', () => {
    const link = linkToMark(mark({ quote: quote({ prefix: 'one two three four five six ' }) }));
    expect(link).toContain('three%20four%20five%20six-,');
    expect(link).not.toContain('one%20two');
  });

  it('addresses a long passage by its ends so the middle can change', () => {
    const long = 'one two three four five six seven eight nine ten eleven twelve thirteen';
    const link = linkToMark(mark({ quote: quote({ exact: long }) }));
    expect(link).toContain('text=one%20two%20three%20four%20five%20six,eight%20nine%20ten%20eleven%20twelve%20thirteen');
  });

  it('escapes the characters that are syntax inside a fragment', () => {
    const link = linkToMark(mark({ quote: quote({ exact: 'well-known, and & true' }) }));
    expect(link).toContain('%2D');
    expect(link).toContain('%2C');
    expect(link).toContain('%26');
  });

  it('leaves the url alone when there is nothing to point at', () => {
    expect(linkToMark(mark({ snapshot: '   ' }))).toBe('https://example.com/post');
  });
});
