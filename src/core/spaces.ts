import type { Mark } from './types';

/**
 * A space is one question and the highlights that answer it.
 *
 * The library holds everything you ever marked, in the order you marked it. A
 * space is the other thing you need: the handful of passages that bear on one
 * question, what you concluded from them, and what you still do not know. It
 * is what a literature review is, and what working out a migration is, and the
 * reason the notes outlive the reading.
 *
 * Everything here is pure and free of the DOM, so it can be tested without a
 * browser — the same bargain the rest of `core` makes.
 */

/** Where a claim sits relative to the question. Marking the ones that disagree is the point. */
export type Stance = 'supports' | 'contradicts' | 'open';

export interface Finding {
  id: string;
  claim: string;
  stance: Stance;
  /** Ids of the highlights this rests on. */
  markIds: string[];
  createdAt: number;
}

export interface Decision {
  body: string;
  decidedAt: number;
}

export interface Space {
  id: string;
  name: string;
  /** What this space is trying to settle. Without one it is a shelf, which is a fine thing to be. */
  question?: string;
  /** Highlights gathered here, by id. The highlight itself stays in the library. */
  markIds: string[];
  findings: Finding[];
  /** What is still not known. The reason to come back to a space. */
  openQuestions: string[];
  decision?: Decision;
  createdAt: number;
  updatedAt: number;
}

const newId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function createSpace(name: string, question?: string, now = Date.now()): Space {
  const trimmed = question?.trim();
  return {
    id: newId(),
    name: name.trim() || 'Untitled space',
    question: trimmed || undefined,
    markIds: [],
    findings: [],
    openQuestions: [],
    createdAt: now,
    updatedAt: now,
  };
}

function touched(space: Space, change: Partial<Space>, now = Date.now()): Space {
  return { ...space, ...change, updatedAt: now };
}

export function rename(space: Space, name: string, question?: string, now = Date.now()): Space {
  const trimmed = question?.trim();
  return touched(
    space,
    { name: name.trim() || space.name, question: trimmed || undefined },
    now,
  );
}

/** Gathering a highlight into a space. Adding one twice is not an error. */
export function addMark(space: Space, markId: string, now = Date.now()): Space {
  if (space.markIds.includes(markId)) return space;
  return touched(space, { markIds: [...space.markIds, markId] }, now);
}

/**
 * Taking a highlight back out. Any finding resting on it keeps the id, so the
 * space can say it is short a source rather than quietly presenting a thinner
 * claim as though nothing had changed — see `sourcesFor`.
 */
export function removeMark(space: Space, markId: string, now = Date.now()): Space {
  if (!space.markIds.includes(markId)) return space;
  return touched(space, { markIds: space.markIds.filter((id) => id !== markId) }, now);
}

export function addFinding(
  space: Space,
  claim: string,
  stance: Stance,
  markIds: readonly string[],
  now = Date.now(),
): Space {
  const body = claim.trim();
  if (!body) return space;
  const finding: Finding = {
    id: newId(),
    claim: body,
    stance,
    markIds: [...markIds],
    createdAt: now,
  };
  return touched(space, { findings: [...space.findings, finding] }, now);
}

export function editFinding(space: Space, findingId: string, claim: string, now = Date.now()): Space {
  const body = claim.trim();
  if (!body) return space;
  return touched(
    space,
    {
      findings: space.findings.map((finding) =>
        finding.id === findingId ? { ...finding, claim: body } : finding,
      ),
    },
    now,
  );
}

export function removeFinding(space: Space, findingId: string, now = Date.now()): Space {
  return touched(
    space,
    { findings: space.findings.filter((finding) => finding.id !== findingId) },
    now,
  );
}

export function addQuestion(space: Space, text: string, now = Date.now()): Space {
  const body = text.trim();
  if (!body || space.openQuestions.includes(body)) return space;
  return touched(space, { openQuestions: [...space.openQuestions, body] }, now);
}

export function closeQuestion(space: Space, index: number, now = Date.now()): Space {
  if (index < 0 || index >= space.openQuestions.length) return space;
  return touched(
    space,
    { openQuestions: space.openQuestions.filter((_, i) => i !== index) },
    now,
  );
}

export function recordDecision(space: Space, body: string, now = Date.now()): Space {
  const text = body.trim();
  if (!text) return space;
  return touched(space, { decision: { body: text, decidedAt: now } }, now);
}

export function reopen(space: Space, now = Date.now()): Space {
  if (!space.decision) return space;
  return touched(space, { decision: undefined }, now);
}

/**
 * The highlights a finding rests on that are *still in this space*, and how
 * many have gone.
 *
 * A finding holds ids, and an id outlives the gathering: take a cited
 * highlight out of the space, or delete it from the library, and the id still
 * reads perfectly well. Resolving it anyway would show a passage the space no
 * longer holds. So this is the only way a space should look its sources up.
 */
export function sourcesFor(
  space: Space,
  finding: Finding,
  marks: readonly Mark[],
): { present: Mark[]; withdrawn: number } {
  const inSpace = new Set(space.markIds);
  const byId = new Map(marks.map((mark) => [mark.id, mark]));
  const present = finding.markIds
    .filter((id) => inSpace.has(id))
    .map((id) => byId.get(id))
    .filter((mark): mark is Mark => mark !== undefined);
  return { present, withdrawn: finding.markIds.length - present.length };
}

/** The highlights gathered here, in the order the library would show them. */
export function marksIn(space: Space, marks: readonly Mark[]): Mark[] {
  const inSpace = new Set(space.markIds);
  return marks.filter((mark) => inSpace.has(mark.id)).sort((a, b) => b.createdAt - a.createdAt);
}

/** Gathered here but not yet behind any finding — what there is left to draw a conclusion from. */
export function unusedIn(space: Space, marks: readonly Mark[]): Mark[] {
  const cited = new Set(space.findings.flatMap((finding) => finding.markIds));
  return marksIn(space, marks).filter((mark) => !cited.has(mark.id));
}

/** Settled, still asking, or a shelf that never asked anything. */
export function statusOf(space: Space): 'settled' | 'open' | 'shelf' {
  if (!space.question) return 'shelf';
  return space.decision ? 'settled' : 'open';
}
