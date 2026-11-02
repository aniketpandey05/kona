import { linkToMark } from './link';
import { nameIn } from './people';
import { siteLabel } from './sites';
import { gathererOf, isShared, marksIn, sourcesFor } from './spaces';
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
 *
 * It says "I" or "we" depending on whether more than one person has worked in
 * the space, and puts names against the parts that have one. A document two
 * people wrote and that claims a single author is a worse document.
 */

export interface Citation {
  n: number;
  mark: Mark;
  /** Empty when the highlight's URL is not one a link can be built from. */
  href: string;
}

export interface MemoLine {
  claim: string;
  contradicts: boolean;
  cites: number[];
  /** Sources the space no longer holds, so a thinner claim is not published whole. */
  withdrawn: number;
  /** Who concluded it, where the space can name them. */
  by?: string;
}

export interface MemoHighlight {
  n: number;
  mark: Mark;
  /** Who found it. */
  by?: string;
}

export interface Memo {
  title: string;
  /** True once more than one person has worked here; the document says "we". */
  shared: boolean;
  decision?: string;
  decidedBy?: string;
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
  const shared = isShared(space);
  const who = (id: string | undefined): string | undefined =>
    (shared ? nameIn(space.people, id) : null) ?? undefined;

  const lines = space.findings.map((finding) => {
    const { present, withdrawn } = sourcesFor(space, finding, marks);
    return {
      claim: finding.claim,
      contradicts: finding.stance === 'contradicts',
      cites: present.map(cite),
      withdrawn,
      ...(who(finding.by) ? { by: who(finding.by) } : {}),
    };
  });

  const highlights = marksIn(space, marks).map((mark) => {
    const found = shared ? gathererOf(space, mark.id)?.name : undefined;
    return { n: cite(mark), mark, ...(found ? { by: found } : {}) };
  });

  return {
    title: space.question ?? space.name,
    shared,
    decision: space.decision?.body,
    ...(who(space.decision?.by) ? { decidedBy: who(space.decision?.by) } : {}),
    lines,
    highlights,
    open: [...space.openQuestions],
    citations,
  };
}

/** The same thing as Markdown, for pasting into wherever you actually write. */
export function memoMarkdown(memo: Memo): string {
  const out: string[] = [`# ${memo.title}`, ''];
  const us = memo.shared ? 'we' : 'I';

  if (memo.decision) {
    out.push(`## What ${us} decided`, '', memo.decision, '');
    if (memo.decidedBy) out.push(`— ${memo.decidedBy}`, '');
  }

  if (memo.lines.length > 0) {
    out.push(`## What ${us} concluded`, '');
    for (const line of memo.lines) {
      const marks = line.cites.map((n) => `[^${n}]`).join('');
      // Say it, rather than quietly publishing a claim with less behind it.
      const gone = line.withdrawn
        ? ` _(${line.withdrawn} source${line.withdrawn > 1 ? 's' : ''} no longer here)_`
        : '';
      const by = line.by ? ` (${line.by})` : '';
      out.push(
        `- ${line.contradicts ? 'Against: ' : ''}${line.claim} ${marks}${gone}${by}`.trimEnd(),
      );
    }
    out.push('');
  }

  if (memo.highlights.length > 0) {
    out.push(`## What ${us} kept`, '');
    for (const { n, mark, by } of memo.highlights) {
      out.push(`> ${mark.snapshot}`);
      if (mark.note) out.push('>', `> ${mark.note}`);
      out.push('', `— ${siteLabel(mark)}[^${n}]${by ? `, found by ${by}` : ''}`, '');
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
      const where = `${siteLabel(citation.mark)}, ${citation.mark.conversationTitle}`;
      // Still cite it when there is no link to give: saying where a passage came
      // from is worth something on its own.
      out.push(citation.href ? `[^${citation.n}]: ${where}. <${citation.href}>` : `[^${citation.n}]: ${where}.`);
    }
    out.push('');
  }

  return out.join('\n');
}
