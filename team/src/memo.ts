import { linkToMark } from '../../src/core/link';
import { siteLabel } from '../../src/core/sites';
import type { Space, TeamMark } from './types';

/**
 * A space, written out as something you could send someone.
 *
 * It works from the first highlight, the same way the free extension does —
 * gather three passages and you have a document, and writing down what the
 * team concluded puts it on top with its sources cited. Neither half is the
 * price of the other. (The paid tier doing less than the free one is a bad
 * look for both.)
 *
 * The reason this is worth doing here rather than in a document editor: every
 * claim already knows which highlights it rests on, and every highlight already
 * carries a link that lands on the exact sentence it came from. So the write-up
 * comes out cited, and each citation can be checked in one click by someone who
 * has never installed Kona.
 */

export interface Citation {
  n: number;
  mark: TeamMark;
  href: string;
}

export interface MemoLine {
  claim: string;
  contradicts: boolean;
  cites: number[];
  /** Sources whose author has since taken them back out of the space. */
  withdrawn: number;
}

export interface MemoHighlight {
  n: number;
  mark: TeamMark;
}

export interface Memo {
  title: string;
  decision?: string;
  /** What the team concluded. Empty until somebody writes something down. */
  lines: MemoLine[];
  /** Everything gathered here. This is the document when there is nothing else. */
  highlights: MemoHighlight[];
  open: string[];
  citations: Citation[];
}

export function buildMemo(
  space: Space,
  lookup: (ids: readonly string[]) => { present: TeamMark[]; withdrawn: number },
  held: readonly TeamMark[] = [],
): Memo {
  const citations: Citation[] = [];
  const numberOf = new Map<string, number>();

  const cite = (mark: TeamMark): number => {
    const seen = numberOf.get(mark.id);
    if (seen !== undefined) return seen;
    const n = citations.length + 1;
    numberOf.set(mark.id, n);
    citations.push({ n, mark, href: linkToMark(mark) });
    return n;
  };

  const lines = space.findings.map((finding) => {
    const { present, withdrawn } = lookup(finding.markIds);
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
    highlights: held.map((mark) => ({ n: cite(mark), mark })),
    open: [...space.openQuestions],
    citations,
  };
}

/** The same thing as Markdown, for pasting into wherever the team actually writes. */
export function memoMarkdown(memo: Memo): string {
  const out: string[] = [`# ${memo.title}`, ''];

  if (memo.decision) {
    out.push('## Decision', '', memo.decision, '');
  }

  if (memo.lines.length > 0) {
    out.push('## What we concluded', '');
    for (const line of memo.lines) {
      const marks = line.cites.map((n) => `[^${n}]`).join('');
      // Say it rather than quietly publishing a claim with less behind it.
      const gone = line.withdrawn
        ? ` _(${line.withdrawn} source${line.withdrawn > 1 ? 's' : ''} withdrawn)_`
        : '';
      out.push(`- ${line.contradicts ? 'Against: ' : ''}${line.claim} ${marks}${gone}`.trimEnd());
    }
    out.push('');
  }

  if (memo.highlights.length > 0) {
    out.push('## What we kept', '');
    for (const { n, mark } of memo.highlights) {
      out.push(`> ${mark.snapshot}`);
      if (mark.note) out.push('>', `> ${mark.note}`);
      out.push('', `— ${siteLabel(mark)}[^${n}]`, '');
    }
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
