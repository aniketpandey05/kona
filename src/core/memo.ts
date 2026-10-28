import { linkToMark } from './link';
import { siteLabel } from './sites';
import { marksIn, sourcesFor } from './spaces';
import type { Space } from './spaces';
import type { Mark } from './types';

/**
 * A space, written out as something you could hand someone.
 *
 * It works from the first highlight. Gather three passages and you have a
 * document: the three passages, your notes on them, and a link under each that
 * lands on the exact sentence it came from. Write down what you concluded and
 * that goes on top, with the highlights it rests on cited. Neither half is the
 * price of the other.
 *
 * The reason this is worth doing here rather than in a document editor: every
 * highlight already carries a link that lands on the precise words, so the
 * write-up comes out checkable by somebody who has never installed Kona.
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
  /** Sources the space no longer holds, so a thinner claim is not published whole. */
  withdrawn: number;
}

export interface MemoHighlight {
  n: number;
  mark: Mark;
}

export interface Memo {
  title: string;
  decision?: string;
  /** What you concluded. Empty until you write something down, which is fine. */
  lines: MemoLine[];
  /** Everything gathered here. This is the document when there is nothing else. */
  highlights: MemoHighlight[];
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

  // Conclusions number their sources first, so the citations read in the order
  // the document does.
  const lines = space.findings.map((finding) => {
    const { present, withdrawn } = sourcesFor(space, finding, marks);
    return {
      claim: finding.claim,
      contradicts: finding.stance === 'contradicts',
      cites: present.map(cite),
      withdrawn,
    };
  });

  const highlights = marksIn(space, marks).map((mark) => ({ n: cite(mark), mark }));

  return {
    title: space.question ?? space.name,
    decision: space.decision?.body,
    lines,
    highlights,
    open: [...space.openQuestions],
    citations,
  };
}

/** The same thing as Markdown, for pasting into wherever you actually write. */
export function memoMarkdown(memo: Memo): string {
  const out: string[] = [`# ${memo.title}`, ''];

  if (memo.decision) {
    out.push('## What I decided', '', memo.decision, '');
  }

  if (memo.lines.length > 0) {
    out.push('## What I concluded', '');
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

  if (memo.highlights.length > 0) {
    out.push('## What I kept', '');
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
