import { describe, expect, it } from 'vitest';
import { markFromShare, readShare } from '../app/src/share';

describe('readShare', () => {
  it('reads what Android puts in the query string', () => {
    expect(readShare('?title=A%20post&text=a%20quote&url=https%3A%2F%2Fe.com%2Fp')).toEqual({
      title: 'A post',
      text: 'a quote',
      url: 'https://e.com/p',
    });
  });

  it('is nothing when the app was opened normally', () => {
    expect(readShare('')).toBeNull();
  });
});

describe('markFromShare', () => {
  it('keeps the quoted text as the record', () => {
    const mark = markFromShare({ text: 'the quick brown fox', url: 'https://e.com/p', title: 'A post' })!;
    expect(mark.snapshot).toBe('the quick brown fox');
    expect(mark.quote?.exact).toBe('the quick brown fox');
    expect(mark.conversationTitle).toBe('A post');
  });

  it('has no message anchor, because there is no message', () => {
    expect(markFromShare({ text: 'hi', url: 'https://e.com/p' })!.message).toBeUndefined();
  });

  it('digs the url out of the text when the app did not pass one', () => {
    const mark = markFromShare({ text: 'something worth keeping https://e.com/p' })!;
    expect(mark.url).toBe('https://e.com/p');
    expect(mark.snapshot).toBe('something worth keeping');
  });

  it('groups by page, ignoring the query string', () => {
    const a = markFromShare({ text: 'one', url: 'https://e.com/p?utm=x' })!;
    const b = markFromShare({ text: 'two', url: 'https://e.com/p?utm=y' })!;
    expect(a.conversationId).toBe(b.conversationId);
  });

  it('falls back to the host when nothing supplied a title', () => {
    expect(markFromShare({ text: 'hi', url: 'https://www.e.com/p' })!.conversationTitle).toBe('e.com');
  });

  it('collapses the whitespace a selection drags along', () => {
    expect(markFromShare({ text: '  a\n\n  b  ', url: 'https://e.com' })!.snapshot).toBe('a b');
  });

  it('refuses a share with neither text nor link', () => {
    expect(markFromShare({ title: 'just a title' })).toBeNull();
  });
});
