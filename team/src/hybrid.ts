import { searchMarks } from '../../src/core/search';
import { siteLabel } from '../../src/core/sites';
import type { TeamMark } from './types';

/**
 * Hybrid search: the lexical ranking and the meaning-based one, fused.
 *
 * Keyword search alone misses the highlight that says the thing in other
 * words, and meaning-based search alone drifts off the thing you actually
 * typed. Running both and fusing the two rankings keeps an exact match at the
 * top while still surfacing the one that never uses your words — which is the
 * whole reason a team's search has to be better than Ctrl-F.
 *
 * **What is real here.** The lexical half is the extension's own `searchMarks`,
 * unchanged. The meaning half, in the shipped product, embeds each highlight
 * once and compares vectors — which is why client-side encryption is a design
 * constraint rather than an afterthought (docs/enterprise.md §7). A demo cannot
 * carry a model, so that half widens each word to the words that mean the same
 * thing here, from the list below and nowhere else. The fusion is the same
 * either way.
 */

const CONCEPTS: string[][] = [
  ['postgres', 'postgresql', 'pg_upgrade', 'pgbouncer', 'database', 'db', 'cluster', 'index'],
  ['migration', 'migrate', 'upgrade', 'cutover', 'rollback'],
  ['risk', 'danger', 'dangerous', 'unusable', 'failure', 'fails', 'safe', 'backup', 'gotcha'],
  ['downtime', 'outage', 'latency', 'errors', 'pause', 'drain', 'reconnect'],
  ['pricing', 'price', 'cost', 'charge', 'seat', 'seats', 'renewal', 'budget'],
  ['research', 'sizing', 'market', 'segment', 'interview', 'interviews', 'findings'],
  ['legal', 'dpa', 'sub-processor', 'retention', 'policy', 'compliance', 'audit', 'annex'],
  ['security', 'sso', 'scim', 'provisioning', 'offboarding', 'questionnaire', 'deprovisioning'],
  ['onboarding', 'runbook', 'deploy', 'deploys', 'deployment', 'on-call', 'hire'],
  ['prompt', 'prompts', 'review', 'post-mortem', 'blame', 'defects'],
  ['performance', 'slow', 'fast', 'faster', 'planner', 'query', 'queries'],
];

// A word found in the highlight itself counts for more than one found in the
// chat's name or site — the same weighting the extension's own search uses.
const FIELD_WEIGHTS = [3, 2, 2, 1, 1];

/** Reciprocal rank fusion. 60 is the constant the original paper settled on. */
const RRF_K = 60;

function fieldsOf(mark: TeamMark): string[] {
  return [
    mark.snapshot,
    mark.note ?? '',
    (mark.tags ?? []).join(' '),
    mark.conversationTitle,
    siteLabel(mark),
  ].map((field) => field.toLowerCase());
}

/** Every word that counts as the same idea as this one, including itself. */
function relatives(word: string): string[] {
  const found = new Set<string>([word]);
  for (const group of CONCEPTS) {
    if (group.some((entry) => entry === word || entry.startsWith(word) || word.startsWith(entry))) {
      for (const entry of group) found.add(entry);
    }
  }
  return [...found];
}

function byMeaning(marks: readonly TeamMark[], words: string[]): TeamMark[] {
  const expansions = words.map(relatives);
  const hits: Array<{ mark: TeamMark; score: number }> = [];

  for (const mark of marks) {
    const fields = fieldsOf(mark);
    let score = 0;
    for (const alternatives of expansions) {
      // Any one of the related words satisfies this part of the query, but the
      // word the person actually typed is worth more than one we supplied.
      let best = 0;
      for (const alternative of alternatives) {
        const typed = words.includes(alternative);
        for (let i = 0; i < fields.length; i++) {
          if (fields[i]?.includes(alternative)) {
            best = Math.max(best, (FIELD_WEIGHTS[i] ?? 1) * (typed ? 1 : 0.6));
          }
        }
      }
      if (best === 0) {
        score = 0;
        break;
      }
      score += best;
    }
    if (score > 0) hits.push({ mark, score });
  }

  return hits
    .sort((a, b) => b.score - a.score || b.mark.createdAt - a.mark.createdAt)
    .map((hit) => hit.mark);
}

export interface HybridResult {
  marks: TeamMark[];
  /**
   * Words nobody typed that earned a result its place — shown so a highlight
   * that uses none of the query's words does not look like a bug.
   */
  alsoMatched: string[];
}

export function hybridSearch(marks: readonly TeamMark[], query: string): HybridResult {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { marks: [...marks], alsoMatched: [] };

  // searchMarks returns the same objects it was given, so they are still TeamMarks.
  const lexical = searchMarks(marks, query) as TeamMark[];
  const semantic = byMeaning(marks, words);

  const fused = new Map<string, { mark: TeamMark; score: number }>();
  const add = (list: TeamMark[]): void =>
    list.forEach((mark, rank) => {
      const entry = fused.get(mark.id) ?? { mark, score: 0 };
      entry.score += 1 / (RRF_K + rank + 1);
      fused.set(mark.id, entry);
    });
  add(lexical);
  add(semantic);

  const ranked = [...fused.values()]
    .sort((a, b) => b.score - a.score || b.mark.createdAt - a.mark.createdAt)
    .map((entry) => entry.mark);

  // Only the words that actually pulled something in, and only when the
  // lexical half could not have found it on its own.
  const lexicalIds = new Set(lexical.map((mark) => mark.id));
  const onlyByMeaning = ranked.filter((mark) => !lexicalIds.has(mark.id));
  const haystack = onlyByMeaning.map(fieldsOf).flat().join(' ');
  const alsoMatched = [...new Set(words.flatMap(relatives))]
    .filter((word) => !words.includes(word) && haystack.includes(word))
    .slice(0, 8);

  return { marks: ranked, alsoMatched };
}
