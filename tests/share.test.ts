import { describe, expect, it } from 'vitest';
import { ADOPTION_WINDOW_MS, markFromShare, planShare, readShare } from '../app/src/share';
import type { Mark } from '../src/core/types';

const NOW = 1_700_000_000_000;

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

  // What a share sheet hands over is rarely clean, and this text is not just
  // matched against the page — it is what the library shows and what Markdown
  // export writes out.
  it('tidies the quote marks and ellipsis an app wrapped around the selection', () => {
    const mark = markFromShare({
      text: '“Antlers are shed and regrown each year…”',
      url: 'https://e.com/p',
    })!;
    expect(mark.snapshot).toBe('Antlers are shed and regrown each year');
    expect(mark.quote?.exact).toBe('Antlers are shed and regrown each year');
  });

  it('strips the invisible characters a selection drags along', () => {
    const zwsp = String.fromCharCode(0x200b);
    const nbsp = String.fromCharCode(0x00a0);
    const mark = markFromShare({ text: `one${zwsp} two${nbsp}three`, url: 'https://e.com/p' })!;
    expect(mark.snapshot).toBe('one two three');
  });

  it('refuses a share with neither text nor link', () => {
    expect(markFromShare({ title: 'just a title' })).toBeNull();
  });
});

describe('planShare', () => {
  const kept = (over: Partial<Mark> = {}): Mark => ({
    id: crypto.randomUUID(),
    site: 'web',
    conversationId: 'unsorted',
    conversationTitle: 'Saved text',
    url: '',
    label: '',
    color: 'yellow',
    snapshot: 'something kept',
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  });

  it('keeps an ordinary capture', () => {
    const plan = planShare({ text: 'a passage', url: 'https://e.com/p' }, [], NOW);
    expect(plan.kind).toBe('keep');
  });

  it('has nothing to do with an empty share', () => {
    expect(planShare({ title: 'just a title' }, [], NOW).kind).toBe('nothing');
  });

  // The point of the whole thing: a link shared on its own, straight after the
  // passages it belongs to.
  it('offers a bare link to the captures that have none', () => {
    const orphans = [kept(), kept()];
    const plan = planShare({ url: 'https://g.co/gemini/share/x' }, orphans, NOW);
    expect(plan).toMatchObject({ kind: 'adopt', url: 'https://g.co/gemini/share/x' });
    expect(plan.kind === 'adopt' && plan.orphans).toHaveLength(2);
  });

  it('keeps a bare link on its own when nothing is waiting for it', () => {
    expect(planShare({ url: 'https://e.com/p' }, [], NOW).kind).toBe('keep');
  });

  it('leaves captures that already have a link alone', () => {
    const plan = planShare({ url: 'https://e.com/p' }, [kept({ url: 'https://other.com' })], NOW);
    expect(plan.kind).toBe('keep');
  });

  // Anything older was a different conversation; adopting it would be wrong.
  it('does not reach back past a day', () => {
    const old = kept({ createdAt: NOW - ADOPTION_WINDOW_MS - 1 });
    expect(planShare({ url: 'https://e.com/p' }, [old], NOW).kind).toBe('keep');
  });

  it('does reach back within a day', () => {
    const recent = kept({ createdAt: NOW - ADOPTION_WINDOW_MS + 1000 });
    expect(planShare({ url: 'https://e.com/p' }, [recent], NOW).kind).toBe('adopt');
  });

  // A share carrying both is a normal capture, not a link looking for a home.
  it('treats a share with text and a link as an ordinary capture', () => {
    const plan = planShare({ text: 'a passage', url: 'https://e.com/p' }, [kept()], NOW);
    expect(plan.kind).toBe('keep');
  });
});
