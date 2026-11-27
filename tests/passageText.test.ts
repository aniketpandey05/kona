import { describe, expect, it } from 'vitest';
import { captureSelection } from '../src/core/capture';
import { toMarkdown } from '../src/core/markdown';
import { cleanPassage, collapseSpace } from '../src/core/text';
import type { Mark } from '../src/core/types';

/**
 * The copy Kona keeps of a passage, and the whitespace a page happened to
 * have in it.
 *
 * What somebody selects spans the source's line breaks and indentation, and
 * the browser hands those over exactly as they are. On screen it never shows,
 * because HTML collapses it. Everywhere the text is treated as text it does,
 * and a Markdown export is where it bites.
 */
describe('tidying the whitespace a page brought with it', () => {
  it('makes a run of spaces, tabs and newlines into one space', () => {
    expect(collapseSpace('Spatially separable\n        self-attention')).toBe(
      'Spatially separable self-attention',
    );
    expect(collapseSpace('  leading and trailing  ')).toBe('leading and trailing');
  });

  it('leaves quotation marks alone, unlike cleanPassage', () => {
    // If somebody drew the selection around the quotation marks, the marks
    // are part of what they kept. `cleanPassage` strips them because a share
    // sheet adds its own; this is for a passage selected here.
    expect(collapseSpace('"the outer layer stiffens"')).toBe('"the outer layer stiffens"');
    expect(cleanPassage('"the outer layer stiffens"')).toBe('the outer layer stiffens');
  });
});

describe('a passage that spanned a line break in the page', () => {
  const across = 'Spatially separable\n        self-attention splits the comparison';

  it('is exported as prose rather than as a code block', () => {
    // The bug this is here for. The export puts "> " in front of every line,
    // so the second line kept the page's eight spaces of indentation, and
    // four spaces inside a block quote is an indented code block: the passage
    // came out set in a monospace box in anything that renders Markdown.
    const file = toMarkdown(
      [
        {
          id: 'a',
          site: 'web',
          pageId: 'p',
          pageTitle: 'A page',
          url: 'https://example.org/a',
          snapshot: collapseSpace(across),
          createdAt: 1,
        } as Mark,
      ],
      new Date('2026-11-27T00:00:00Z'),
    );
    expect(file).toContain('> Spatially separable self-attention splits the comparison');
    expect(file).not.toMatch(/^>\s{4,}\S/m);
  });

  it('is stored the same way whichever path captured it', () => {
    // Two ways into the library: the bar in the page, and the right-click
    // menu for a site Kona cannot run in. They used to disagree, and the one
    // that did not tidy was the ordinary one.
    const byMenu = captureSelection({
      text: across,
      url: 'https://example.org/a',
      title: 'A page',
      color: 'yellow',
      now: 1,
    });
    expect(byMenu.snapshot).toBe(collapseSpace(across));
    expect(byMenu.snapshot).not.toContain('\n');
  });
});
