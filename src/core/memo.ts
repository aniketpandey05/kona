import { linkToMark } from './link';
import { siteLabel } from './sites';
import { sourcesFor } from './spaces';
import type { Space } from './spaces';
import type { Mark } from './types';

/**
 * A space, written out as something you could hand someone.
 *
 * The reason this is worth doing here rather than in a document editor: every
 * claim already knows which highlights it rests on, and every highlight
 * already carries a link that lands on the exact sentence it came from. So the
 * write-up comes out cited, and each citation can be checked in one click by
 * somebody who has never installed Kona.
 */

export interface Citation {
  n: number;
  mark: Mark;
  href: string;
}

export interface MemoLine {
  claim: string;
  contradicts: boolean;
  cites: number[];
  /** Sources the space no longer holds, so a thinner claim is not published as a whole one. */
  withdrawn: number;
}

export interface Memo {
  title: string;
  decision?: string;
  lines: MemoLine[];
  open: string[];
  citations: Citation[];
}

export function buildMemo(space: Space, marks: readonly Mark[]): Memo {
  const citations: Citation[] = [];
  const numberOf = new Map<string, number>();

  const cite = (mark: Mark): number => {
    const seen = numberOf.get(mark.id);
    if (seen !== undefined) return seen;
    const n = citations.length + 1;
    numberOf.set(mark.id, n);
    citations.push({ n, mark, href: linkToMark(mark) });
    return n;
  };

  const lines = space.findings.map((finding) => {
    const { present, withdrawn } = sourcesFor(space, finding, marks);
    return {
      claim: finding.claim,
      contradicts: finding.stance === 'contradicts',
      cites: present.map(cite),
      withdrawn,
    };
  });

  return {
    title: space.question ?? space.name,
    decision: space.decision?.body,
    lines,
    open: [...space.openQuestions],
    citations,
  };
}

/** The same thing as Markdown, for pasting into wherever you actually write. */
export function memoMarkdown(memo: Memo): string {
  const out: string[] = [`# ${memo.title}`, ''];

  if (memo.decision) {
    out.push('## Decision', '', memo.decision, '');
  }

  if (memo.lines.length > 0) {
    out.push('## What I found', '');
    for (const line of memo.lines) {
      const marks = line.cites.map((n) => `[^${n}]`).join('');
      // Say it, rather than quietly publishing a claim with less behind it.
      const gone = line.withdrawn
        ? ` _(${line.withdrawn} source${line.withdrawn > 1 ? 's' : ''} no longer here)_`
        : '';
      out.push(`- ${line.contradicts ? 'Against: ' : ''}${line.claim} ${marks}${gone}`.trimEnd());
    }
    out.push('');
  }

  if (memo.open.length > 0) {
    out.push('## Still open', '');
    for (const question of memo.open) out.push(`- ${question}`);
    out.push('');
  }

  if (memo.citations.length > 0) {
    out.push('## Sources', '');
    for (const citation of memo.citations) {
      const where = `${siteLabel(citation.mark)} — ${citation.mark.conversationTitle}`;
      out.push(`[^${citation.n}]: ${where}. <${citation.href}>`);
    }
    out.push('');
  }

  return out.join('\n');
}
