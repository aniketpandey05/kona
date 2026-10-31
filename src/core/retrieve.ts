/**
 * The index a search runs against, and the two ways of asking it something.
 *
 * The first way is words: what you typed, weighed by how unusual it is in your
 * own library, so a passage that says `pg_upgrade` twice beats one that says
 * `the` forty times. That is BM25, and it is the half everyone has.
 *
 * The second way is meaning, and here is the honest part. Meaning normally
 * comes from a model that has read the internet, which is a download and a
 * server. Kona has neither, so it uses the one corpus it does have: yours.
 * Words that keep turning up in the same passages you kept are treated as
 * being about the same thing, and a search for one of them will also look for
 * the others. Nobody wrote a list of synonyms; the list is a measurement of
 * what you read.
 *
 * That has a real limit, stated here rather than in a footnote: it can only
 * relate words you have actually seen together. It will learn that your
 * `cutover` means your `downtime`. It will never know that a Hapsburg is a
 * monarch if you have never highlighted both. A library of eight highlights
 * teaches it nothing, so below that it does not pretend to.
 */

import { siteLabel } from './sites';
import { STOP, stem, words } from './tokens';
import type { Mark } from './types';

/**
 * A word in the passage counts for more than one in the chat's name, because
 * what the passage says is what you were reading.
 */
const FIELDS: ReadonlyArray<{ weight: number; of: (mark: Mark) => string }> = [
  { weight: 3, of: (mark) => mark.snapshot },
  { weight: 2, of: (mark) => mark.note ?? '' },
  { weight: 2, of: (mark) => (mark.tags ?? []).join(' ') },
  { weight: 1, of: (mark) => mark.conversationTitle ?? '' },
  { weight: 1, of: (mark) => siteLabel(mark) },
];

export interface Index {
  marks: readonly Mark[];
  /** stem -> which highlights hold it -> how much, with the field weights in. */
  postings: Map<string, Map<number, number>>;
  /** The weighted length of each highlight, for the ranking to divide by. */
  lengths: number[];
  avgLength: number;
  /** A real spelling for each stem, since `migrat` is not a word to show anyone. */
  surface: Map<string, string>;
  /** Worked out on demand: most searches never need it. */
  related: Map<string, readonly string[]> | null;
}

export function buildIndex(marks: readonly Mark[]): Index {
  const postings = new Map<string, Map<number, number>>();
  const surface = new Map<string, string>();
  const lengths: number[] = [];

  marks.forEach((mark, doc) => {
    let length = 0;
    for (const field of FIELDS) {
      const text = field.of(mark);
      if (!text) continue;
      for (const word of words(text)) {
        const term = stem(word);
        if (!term) continue;
        length += field.weight;
        const posting = postings.get(term);
        if (posting) posting.set(doc, (posting.get(doc) ?? 0) + field.weight);
        else postings.set(term, new Map([[doc, field.weight]]));
        // The shortest spelling seen, which is nearly always the plain one:
        // `volume` rather than `volumes`. Alphabetical between equals, so the
        // same library always shows the same word back.
        const best = surface.get(term);
        if (!best || word.length < best.length || (word.length === best.length && word < best)) {
          surface.set(term, word);
        }
      }
    }
    lengths.push(length);
  });

  const total = lengths.reduce((sum, length) => sum + length, 0);
  return {
    marks,
    postings,
    lengths,
    avgLength: marks.length > 0 ? total / marks.length || 1 : 1,
    surface,
    related: null,
  };
}

/**
 * Indexing a few thousand highlights takes long enough to feel it, and a
 * search box asks on every keystroke, so an index is kept for as long as the
 * list it was built from is alive. A new list — highlights added, deleted,
 * reloaded — is a new index, with no stale entry to invalidate.
 */
const cached = new WeakMap<readonly Mark[], Index>();

export function indexOf(marks: readonly Mark[]): Index {
  const hit = cached.get(marks);
  if (hit) return hit;
  const built = buildIndex(marks);
  cached.set(marks, built);
  return built;
}

// Lucene's constants, and the ones the paper recommends: k1 how fast a repeated
// word stops helping, b how much a long passage is discounted for its length.
const K1 = 1.2;
const B = 0.75;

/** A word the library inferred counts, but never as much as one you typed. */
const INFERRED = 0.6;

/** Below this many highlights there is nothing to learn, so nothing is claimed. */
export const ENOUGH_TO_LEARN = 8;

/**
 * The most distinctive words of a passage, past which it is mostly filler.
 *
 * This is also the one number that decides what learning costs: every passage
 * pairs each of these with each of the others, so the work goes up with the
 * square of it. Twelve is comfortably more than a highlight-sized passage has
 * anything to say with.
 */
const SALIENT = 12;
/** Two words together once is a coincidence. */
const MIN_TOGETHER = 2;
/** How much of the time two words have to arrive together to count as one idea. */
const MIN_DICE = 0.34;
/** Past six, a word is being widened into vagueness. */
const MAX_RELATED = 6;

function idf(index: Index, term: string): number {
  const df = index.postings.get(term)?.size ?? 0;
  if (df === 0) return 0;
  return Math.log(1 + (index.marks.length - df + 0.5) / (df + 0.5));
}

function termScore(index: Index, term: string, doc: number): number {
  const tf = index.postings.get(term)?.get(doc) ?? 0;
  if (tf === 0) return 0;
  const length = index.lengths[doc] ?? 0;
  const norm = 1 - B + B * (length / index.avgLength);
  return idf(index, term) * ((tf * (K1 + 1)) / (tf + K1 * norm));
}

/**
 * Words that keep company with this one in your own library.
 *
 * Measured with the Dice coefficient — twice the passages holding both, over
 * the passages holding either — which asks the useful question: of the times I
 * see one of these words, how often is the other one there too. A word that is
 * everywhere is dropped before the counting starts, because something that
 * turns up beside everything is beside nothing.
 */
export function relatedTerms(index: Index): Map<string, readonly string[]> {
  if (index.related) return index.related;
  const related = new Map<string, readonly string[]>();
  if (index.marks.length < ENOUGH_TO_LEARN) {
    index.related = related;
    return related;
  }

  const everywhere = Math.max(MIN_TOGETHER, index.marks.length * 0.5);
  const dfs = new Map<string, number>();
  const perDoc: string[][] = index.marks.map(() => []);
  for (const [term, posting] of index.postings) {
    const df = posting.size;
    if (df < MIN_TOGETHER || df > everywhere) continue;
    if (term.length < 3) continue;
    if (STOP.has(term) || STOP.has(index.surface.get(term) ?? '')) continue;
    dfs.set(term, df);
    for (const doc of posting.keys()) perDoc[doc]?.push(term);
  }

  // Counted as a map of maps rather than one map of joined keys: a library of
  // a few thousand highlights is a few hundred thousand pairs, and building a
  // string for each of them is most of what that would cost.
  const together = new Map<string, Map<string, number>>();
  for (const terms of perDoc) {
    // The rarest words of the passage are the ones that say what it is about.
    const salient = terms.sort((a, b) => (dfs.get(a) ?? 0) - (dfs.get(b) ?? 0)).slice(0, SALIENT);
    salient.sort();
    for (let i = 0; i < salient.length; i++) {
      const a = salient[i]!;
      let row = together.get(a);
      if (!row) {
        row = new Map<string, number>();
        together.set(a, row);
      }
      for (let j = i + 1; j < salient.length; j++) {
        const b = salient[j]!;
        row.set(b, (row.get(b) ?? 0) + 1);
      }
    }
  }

  const scored = new Map<string, Array<{ term: string; dice: number }>>();
  for (const [a, row] of together) {
    for (const [b, count] of row) {
      if (count < MIN_TOGETHER) continue;
      const dice = (2 * count) / ((dfs.get(a) ?? 0) + (dfs.get(b) ?? 0));
      if (dice < MIN_DICE) continue;
      for (const [one, other] of [[a, b], [b, a]] as const) {
        const neighbours = scored.get(one) ?? [];
        neighbours.push({ term: other, dice });
        scored.set(one, neighbours);
      }
    }
  }
  for (const [term, neighbours] of scored) {
    related.set(
      term,
      neighbours
        .sort((x, y) => y.dice - x.dice || (x.term < y.term ? -1 : 1))
        .slice(0, MAX_RELATED)
        .map((neighbour) => neighbour.term),
    );
  }

  index.related = related;
  return related;
}

export interface QueryWord {
  /** What was typed, for saying back which words did the work. */
  typed: string;
  /** Index terms that are this word: its stem, and its prefixes mid-typing. */
  own: readonly string[];
  /** Index terms the library puts beside it. */
  related: readonly string[];
}

/** The most prefix matches to take, so a two-letter query is not a scan. */
const MAX_PREFIX = 24;

function prefixMatches(index: Index, prefix: string): string[] {
  const found: string[] = [];
  for (const term of index.postings.keys()) if (term.startsWith(prefix)) found.push(term);
  // Shortest first: the closest thing to what is half-typed.
  return found.sort((a, b) => a.length - b.length || (a < b ? -1 : 1)).slice(0, MAX_PREFIX);
}

export function parseQuery(index: Index, query: string): QueryWord[] {
  const typed = words(query);
  if (typed.length === 0) return [];
  const learned = relatedTerms(index);
  const asked = new Set(typed.map(stem));

  return typed.map((word, at) => {
    const term = stem(word);
    const own = new Set<string>();
    if (index.postings.has(term)) own.add(term);
    // Only the last word is still being typed, so only it is matched by prefix.
    if (at === typed.length - 1 && term.length >= 3) {
      for (const match of prefixMatches(index, term)) own.add(match);
    }
    const related = (learned.get(term) ?? []).filter((other) => !asked.has(other));
    return { typed: word, own: [...own], related };
  });
}

export interface Hit {
  doc: number;
  score: number;
  /** Terms nobody typed that this result needed in order to match. */
  inferred: string[];
}

function candidates(index: Index, query: QueryWord[], withMeaning: boolean): number[] {
  // Every word has to be answered somehow, so the word answered by the fewest
  // highlights decides which handful is worth looking at.
  let fewest: Set<number> | null = null;
  for (const word of query) {
    const docs = new Set<number>();
    const terms = withMeaning ? [...word.own, ...word.related] : word.own;
    for (const term of terms) {
      for (const doc of index.postings.get(term)?.keys() ?? []) docs.add(doc);
    }
    if (docs.size === 0) return [];
    if (!fewest || docs.size < fewest.size) fewest = docs;
  }
  return fewest ? [...fewest] : [];
}

/**
 * Ranks the highlights that answer every word of the query, best first.
 *
 * Every word has to be answered by something — an exact match, a prefix of
 * what is still being typed, or, with `withMeaning`, a word the library puts
 * beside it. A highlight that only covers half of what you asked for is not a
 * worse answer, it is a different question, so it does not appear at all.
 */
export function rank(index: Index, query: QueryWord[], withMeaning: boolean): Hit[] {
  if (query.length === 0) return [];
  const hits: Hit[] = [];

  for (const doc of candidates(index, query, withMeaning)) {
    let score = 0;
    const inferred: string[] = [];
    let covered = true;

    for (const word of query) {
      let best = 0;
      let bestInferred: string | null = null;
      for (const term of word.own) {
        const found = termScore(index, term, doc);
        if (found > best) {
          best = found;
          bestInferred = null;
        }
      }
      if (withMeaning) {
        for (const term of word.related) {
          const found = termScore(index, term, doc) * INFERRED;
          if (found > best) {
            best = found;
            bestInferred = term;
          }
        }
      }
      if (best === 0) {
        covered = false;
        break;
      }
      score += best;
      if (bestInferred) inferred.push(bestInferred);
    }

    if (covered) hits.push({ doc, score, inferred });
  }

  return hits.sort(
    (a, b) =>
      b.score - a.score ||
      (index.marks[b.doc]?.createdAt ?? 0) - (index.marks[a.doc]?.createdAt ?? 0),
  );
}
