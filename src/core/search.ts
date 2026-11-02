/**
 * Searching your highlights, by word and by meaning at once.
 *
 * Keyword search misses the passage that says your thing in other words.
 * Meaning-based search drifts off the thing you actually typed. Running both
 * and fusing the two orderings keeps an exact match at the top while still
 * surfacing the passage that uses none of your words, which is the only
 * reason to have a search here rather than Ctrl-F.
 *
 * Both halves are in `retrieve.ts`, along with the honest account of where the
 * meaning half gets its meaning from.
 */

import { ENOUGH_TO_LEARN, indexOf, parseQuery, rank, relatedTerms } from './retrieve';
import type { Mark } from './types';

/**
 * Reciprocal rank fusion: each ranking votes for a result with 1/(k + rank),
 * so being near the top of either list counts for a lot and being halfway down
 * both counts for little. 60 is the constant the original paper settled on.
 *
 * It fuses *positions*, not scores, which is the point, the two halves have no
 * common unit, and inventing one would be arithmetic dressed as judgement.
 */
const RRF_K = 60;

/** The words you typed are evidence. The ones the library inferred are a guess. */
const WORDS_VOTE = 1;
const MEANING_VOTE = 0.75;

/** The most inferred words worth naming before the explanation is longer than the results. */
const MAX_NAMED = 8;

export interface Found {
  /** Every highlight that answers the query, best first. */
  marks: Mark[];
  /**
   * Words nobody typed that earned a result its place, in a spelling a person
   * can read. Shown so a result that uses none of your words is not a bug.
   */
  alsoMatched: string[];
  /** The ids of the results your words alone would not have found. */
  byMeaning: Set<string>;
  /** Whether the library is big enough for the meaning half to have learned anything. */
  learned: boolean;
}

const NOTHING: Found = { marks: [], alsoMatched: [], byMeaning: new Set(), learned: false };

/**
 * Everything matching the query, best first, and what it took to match.
 */
export function searchLibrary(marks: readonly Mark[], query: string): Found {
  if (!query.trim()) return { ...NOTHING, marks: [...marks], learned: marks.length >= ENOUGH_TO_LEARN };
  if (marks.length === 0) return NOTHING;

  const index = indexOf(marks);
  const words = parseQuery(index, query);
  if (words.length === 0) {
    return { ...NOTHING, marks: [...marks], learned: marks.length >= ENOUGH_TO_LEARN };
  }

  const byWords = rank(index, words, false);
  const withMeaning = rank(index, words, true);

  const votes = new Map<number, number>();
  const count = (hits: typeof byWords, weight: number): void => {
    hits.forEach((hit, position) => {
      votes.set(hit.doc, (votes.get(hit.doc) ?? 0) + weight / (RRF_K + position + 1));
    });
  };
  count(byWords, WORDS_VOTE);
  count(withMeaning, MEANING_VOTE);

  const ranked = [...votes.entries()].sort(
    ([docA, voteA], [docB, voteB]) =>
      voteB - voteA ||
      (index.marks[docB]?.createdAt ?? 0) - (index.marks[docA]?.createdAt ?? 0),
  );

  const foundByWords = new Set(byWords.map((hit) => hit.doc));
  const named = new Set<string>();
  for (const hit of withMeaning) {
    if (foundByWords.has(hit.doc)) continue;
    for (const term of hit.inferred) {
      if (named.size < MAX_NAMED) named.add(index.surface.get(term) ?? term);
    }
  }

  const byMeaning = new Set<string>();
  const results: Mark[] = [];
  for (const [doc] of ranked) {
    const mark = index.marks[doc];
    if (!mark) continue;
    results.push(mark);
    if (!foundByWords.has(doc)) byMeaning.add(mark.id);
  }

  return {
    marks: results,
    alsoMatched: [...named],
    byMeaning,
    learned: marks.length >= ENOUGH_TO_LEARN,
  };
}

/**
 * Gets everything ready before anyone types.
 *
 * Indexing a few thousand highlights, and working out which of their words
 * belong together, costs a few hundred milliseconds. It only happens once per
 * library, but the first keystroke is the worst possible moment to spend it,
 * so a page that is about to be searched can pay it while nobody is waiting.
 * Both results are kept with the index, so this is only ever a head start.
 */
export function prime(marks: readonly Mark[]): void {
  if (marks.length === 0) return;
  relatedTerms(indexOf(marks));
}

/** Just the highlights, for the places that only want a list. */
export function searchMarks(marks: readonly Mark[], query: string): Mark[] {
  return searchLibrary(marks, query).marks;
}
