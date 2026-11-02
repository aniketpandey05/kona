/**
 * Which URLs count as the same page, and what happens to highlights that were
 * filed under the old answer.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { isTracking, meaningfulSearch, pageId } from '../src/core/pageUrl';
import { loadMarks, mergeDuplicatePages, upsertMark } from '../src/core/store';
import type { Mark } from '../src/core/types';

const id = (href: string) => pageId(new URL(href));

describe('pageId', () => {
  it('drops the parameter that only says where you came from', () => {
    expect(id('https://example.com/article?utm_source=twitter')).toBe(
      'https://example.com/article',
    );
    expect(id('https://example.com/article?fbclid=abc123')).toBe('https://example.com/article');
  });

  it('gives the same answer however you arrived', () => {
    const plain = id('https://example.com/article');
    expect(id('https://example.com/article?utm_source=x&utm_medium=social')).toBe(plain);
    expect(id('https://example.com/article?gclid=1&fbclid=2&igshid=3')).toBe(plain);
  });

  it('keeps a parameter that chooses what the page shows', () => {
    expect(id('https://example.com/list?page=2')).toBe('https://example.com/list?page=2');
    expect(id('https://youtube.com/watch?v=abc&si=track')).toBe('https://youtube.com/watch?v=abc');
    expect(id('https://example.com/search?q=postgres+upgrade')).toContain('q=postgres');
  });

  it('leaves alone the plain words a site may mean something by', () => {
    // `ref` is a branch on GitHub. Guessing here would merge two real pages.
    expect(isTracking('ref')).toBe(false);
    expect(isTracking('source')).toBe(false);
    expect(isTracking('s')).toBe(false);
    expect(id('https://github.com/a/b/blob/x?ref=main')).toContain('ref=main');
  });

  it('does not care what order the parameters were written in', () => {
    expect(id('https://example.com/x?b=2&a=1')).toBe(id('https://example.com/x?a=1&b=2'));
  });

  it('keeps the path and the origin exactly as they are', () => {
    expect(id('https://example.com/A/b/?utm_id=9')).toBe('https://example.com/A/b/');
    expect(id('http://localhost:3000/x')).toBe('http://localhost:3000/x');
  });

  it('matches on the name whatever its case, and survives an empty query', () => {
    expect(meaningfulSearch(new URL('https://example.com/x?UTM_Source=a'))).toBe('');
    expect(meaningfulSearch(new URL('https://example.com/x'))).toBe('');
  });
});

function markAt(page: string, markId: string, updatedAt = 1): Mark {
  return {
    id: markId,
    site: 'web',
    conversationId: page,
    conversationTitle: 'An article',
    url: page,
    label: '',
    color: 'yellow',
    snapshot: `kept by ${markId}`,
    createdAt: 0,
    updatedAt,
  };
}

describe('mergeDuplicatePages', () => {
  beforeEach(() => localStorage.clear());

  it('brings highlights filed under a tracked URL back to the page', async () => {
    const tracked = 'https://example.com/article?utm_source=twitter';
    await upsertMark(markAt(tracked, 'from-twitter'));

    expect(await mergeDuplicatePages()).toBe(1);

    const here = await loadMarks('web', 'https://example.com/article');
    expect(here.map((m) => m.id)).toEqual(['from-twitter']);
    // The highlight has to agree about where it lives, or the next write to it
    // would file it back under the URL it came from.
    expect(here[0]?.conversationId).toBe('https://example.com/article');
    expect(await loadMarks('web', tracked)).toEqual([]);
  });

  it('merges several arrivals at one page into one set', async () => {
    await upsertMark(markAt('https://example.com/a?utm_source=x', 'one'));
    await upsertMark(markAt('https://example.com/a?fbclid=y', 'two'));
    await upsertMark(markAt('https://example.com/a', 'three'));

    expect(await mergeDuplicatePages()).toBe(2);
    const here = await loadMarks('web', 'https://example.com/a');
    expect(here.map((m) => m.id).sort()).toEqual(['one', 'three', 'two']);
  });

  it('keeps whichever copy of a highlight was changed last', async () => {
    await upsertMark(markAt('https://example.com/a', 'same', 10));
    await upsertMark({ ...markAt('https://example.com/a?utm_source=x', 'same', 99), label: 'newer' });

    await mergeDuplicatePages();
    const here = await loadMarks('web', 'https://example.com/a');
    expect(here).toHaveLength(1);
    expect(here[0]?.label).toBe('newer');
  });

  it('leaves a page that was already canonical alone, however often it runs', async () => {
    await upsertMark(markAt('https://example.com/clean', 'one'));
    expect(await mergeDuplicatePages()).toBe(0);
    expect(await mergeDuplicatePages()).toBe(0);
    expect(await loadMarks('web', 'https://example.com/clean')).toHaveLength(1);
  });

  it('does not touch highlights made in a chat', async () => {
    await upsertMark({ ...markAt('https://chatgpt.com/c/abc', 'chat'), site: 'chatgpt' });
    expect(await mergeDuplicatePages()).toBe(0);
    expect(await loadMarks('chatgpt', 'https://chatgpt.com/c/abc')).toHaveLength(1);
  });

  it('steps over a key that is not a URL rather than failing', async () => {
    localStorage.setItem('marks:web:not a url at all', JSON.stringify([markAt('x', 'odd')]));
    await expect(mergeDuplicatePages()).resolves.toBe(0);
  });
});
