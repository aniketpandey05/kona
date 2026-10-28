import { siteLabel } from '../../src/core/sites';
import type { TeamMark } from './types';

/**
 * Search that matches on meaning rather than spelling.
 *
 * **What this is.** The shipped version embeds each highlight once and compares
 * vectors, which is why client-side encryption is a design constraint for us and
 * not an afterthought — docs/enterprise.md §7. A demo cannot carry a model, so
 * this does the honest small version: it widens each word of the query to the
 * words that mean the same thing here, and tells you on screen which ones it
 * added. Nothing is inferred that is not listed below.
 *
 * It is a real improvement even at this size — searching "database risk" finds
 * a highlight that says "pg_upgrade" and "unusable" and neither of those words
 * — and it is the shape of the thing without pretending to be the thing.
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

export interface SemanticResult {
  marks: TeamMark[];
  /** The words the search added on its own, for saying so on screen. */
  added: string[];
}

function fieldsOf(mark: TeamMark): string[] {
  return [
    mark.snapshot,
    mark.note ?? '',
    (mark.tags ?? []).join(' '),
    mark.conversationTitle,
    siteLabel(mark),
  ].map((field) => field.toLowerCase());
}

export function semanticSearch(marks: readonly TeamMark[], query: string): SemanticResult {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { marks: [...marks], added: [] };

  const expansions = words.map(relatives);
  const added = [...new Set(expansions.flat())].filter((word) => !words.includes(word));

  const hits: Array<{ mark: TeamMark; score: number }> = [];
  for (const mark of marks) {
    const fields = fieldsOf(mark);
    let score = 0;
    for (const alternatives of expansions) {
      // Any one of the related words satisfies this part of the query, but the
      // word the person actually typed is worth more than one we supplied.
      let best = 0;
      for (const alternative of alternatives) {
        const exact = words.includes(alternative);
        for (let i = 0; i < fields.length; i++) {
          if (fields[i]?.includes(alternative)) {
            best = Math.max(best, (FIELD_WEIGHTS[i] ?? 1) * (exact ? 1 : 0.6));
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

  return {
    marks: hits
      .sort((a, b) => b.score - a.score || b.mark.createdAt - a.mark.createdAt)
      .map((hit) => hit.mark),
    added,
  };
}

/** Which of the added words actually earned their place in these results. */
export function wordsThatHelped(results: readonly TeamMark[], added: readonly string[]): string[] {
  const haystack = results.map(fieldsOf).flat().join(' ');
  return added.filter((word) => haystack.includes(word));
}
