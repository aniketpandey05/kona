import { describe, expect, it } from 'vitest';
import { captureSelection, looksLikePdf, titleFor } from '../src/core/capture';

/**
 * Keeping a passage out of a page Kona cannot run inside (16).
 *
 * The whole route rests on one documented exception: a context menu item can
 * read the selection on a privileged page, and the browser's PDF viewer is
 * privileged in both engines. What arrives is text and a URL, which is
 * everything a highlight is made of except the way back.
 */
describe('a passage kept by right-click', () => {
  const captured = {
    text: '  An amoeba moves by extending   a pseudopod\n ',
    url: 'https://example.org/papers/motility.pdf?utm_source=twitter',
    title: 'motility.pdf',
    color: 'yellow',
  };

  it('keeps the passage, tidied of the selection’s own whitespace', () => {
    expect(captureSelection(captured).snapshot).toBe(
      'An amoeba moves by extending a pseudopod',
    );
  });

  it('says it has no landing, from the first second', () => {
    // Not worked out later and not guessed: there is no content script in that
    // viewer, so there was never a chance to find the passage again. Decision
    // 13 already has the state, and a PDF arrives in it.
    expect(captureSelection(captured).landing).toBe('lost');
  });

  it('carries no quote and no message, because it could read neither', () => {
    const mark = captureSelection(captured);
    expect(mark.quote).toBeUndefined();
    expect(mark.message).toBeUndefined();
  });

  it('files it under the page, with the tracking parameters off', () => {
    // The same page identity as everywhere else, or the same PDF opened from a
    // tweet and from a search would be two pages.
    const mark = captureSelection(captured);
    expect(mark.pageId).toBe('https://example.org/papers/motility.pdf');
    expect(mark.url).toBe(captured.url);
    expect(mark.site).toBe('web');
  });

  it('marks it with the pen it was given', () => {
    expect(captureSelection({ ...captured, color: '#14b8a6@45' }).color).toBe('#14b8a6@45');
  });

  it('falls back to the file name when the tab has no title', () => {
    expect(titleFor('https://example.org/papers/motility.pdf')).toBe('motility.pdf');
    expect(titleFor('https://example.org/')).toBe('example.org');
    expect(titleFor('https://example.org/a.pdf', '  ')).toBe('a.pdf');
    expect(titleFor('https://example.org/a.pdf', 'Cell motility')).toBe('Cell motility');
  });

  it('knows a PDF by its address, which is as far as an address goes', () => {
    expect(looksLikePdf('https://example.org/a.PDF')).toBe(true);
    expect(looksLikePdf('https://example.org/a.pdf?x=1')).toBe(true);
    expect(looksLikePdf('https://example.org/pdf/viewer')).toBe(false);
    expect(looksLikePdf('not a url')).toBe(false);
  });
});
