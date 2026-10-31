import { joinPeople, personIn, type Person } from './people';
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
  /** Who concluded it, as a person id in the space's own `people`. */
  by?: string;
  createdAt: number;
}

export interface Decision {
  body: string;
  /** Who settled it. */
  by?: string;
  decidedAt: number;
}

/**
 * Something said about one highlight, in one space.
 *
 * A thread belongs to the space and not to the highlight, because the same
 * passage can be gathered under two questions and the argument about it in one
 * is not the argument about it in the other. It also means a space you hand
 * over carries its discussion with it and nothing else does.
 */
export interface Comment {
  id: string;
  /** The highlight this is about. */
  markId: string;
  body: string;
  by?: string;
  createdAt: number;
  /**
   * Set once the wording has moved since it was written. Somebody reading a
   * reply they have read before is entitled to know it is not the same reply,
   * and in a space that has been round to somebody else and back, quietly
   * rewriting what you said is the one edit that would actually mislead.
   */
  editedAt?: number;
}

export interface Space {
  id: string;
  /**
   * The id this space had when somebody first made it, carried through every
   * copy of it. Your copy of a space I sent you has its own local `id` but the
   * same origin, so when you send it back I recognise it as mine rather than
   * filing a second one beside it.
   *
   * Absent on spaces made before sharing existed; `originOf` falls back to the
   * id, which is what it would have been.
   */
  origin?: string;
  name: string;
  /** What this space is trying to settle. Without one it is a shelf, which is a fine thing to be. */
  question?: string;
  /** Highlights gathered here, by id. The highlight itself stays in the library. */
  markIds: string[];
  findings: Finding[];
  /** What is still not known. The reason to come back to a space. */
  openQuestions: string[];
  decision?: Decision;
  /**
   * Everybody who has worked in any copy of this space, so a `by` anywhere in
   * here can be turned into a name without asking a server. Absent until more
   * than nobody has put their name to anything.
   */
  people?: Person[];
  /** Who brought each highlight in, by highlight id. */
  gathered?: Record<string, string>;
  /** Discussion, one entry per thing said, each naming its highlight. */
  comments?: Comment[];
  /** Highlights whose thread somebody has called finished. */
  settled?: string[];
  createdAt: number;
  updatedAt: number;
}

const newId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Where a space came from, for spaces that predate the field. */
export function originOf(space: Space): string {
  return space.origin ?? space.id;
}

export function createSpace(name: string, question?: string, now = Date.now()): Space {
  const id = newId();
  const trimmed = question?.trim();
  return {
    id,
    origin: id,
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
export function addMark(
  space: Space,
  markId: string,
  me: Person | null = null,
  now = Date.now(),
): Space {
  if (space.markIds.includes(markId)) return space;
  return touched(
    space,
    {
      markIds: [...space.markIds, markId],
      ...(me
        ? { people: joinPeople(space.people, me), gathered: { ...space.gathered, [markId]: me.id } }
        : {}),
    },
    now,
  );
}

/**
 * Taking a highlight back out. Any finding resting on it keeps the id, so the
 * space can say it is short a source rather than quietly presenting a thinner
 * claim as though nothing had changed — see `sourcesFor`.
 */
export function removeMark(space: Space, markId: string, now = Date.now()): Space {
  if (!space.markIds.includes(markId)) return space;
  const gathered = { ...space.gathered };
  delete gathered[markId];
  return touched(
    space,
    {
      markIds: space.markIds.filter((id) => id !== markId),
      gathered,
      // The argument about a passage goes out with the passage. Keeping it
      // would leave replies on screen with nothing above them to reply to.
      ...(space.comments ? { comments: space.comments.filter((entry) => entry.markId !== markId) } : {}),
      ...(space.settled ? { settled: space.settled.filter((id) => id !== markId) } : {}),
    },
    now,
  );
}

export function addFinding(
  space: Space,
  claim: string,
  stance: Stance,
  markIds: readonly string[],
  me: Person | null = null,
  now = Date.now(),
): Space {
  const body = claim.trim();
  if (!body) return space;
  const finding: Finding = {
    id: newId(),
    claim: body,
    stance,
    markIds: [...markIds],
    ...(me ? { by: me.id } : {}),
    createdAt: now,
  };
  return touched(
    space,
    {
      findings: [...space.findings, finding],
      ...(me ? { people: joinPeople(space.people, me) } : {}),
    },
    now,
  );
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

export function recordDecision(
  space: Space,
  body: string,
  me: Person | null = null,
  now = Date.now(),
): Space {
  const text = body.trim();
  if (!text) return space;
  return touched(
    space,
    {
      decision: { body: text, ...(me ? { by: me.id } : {}), decidedAt: now },
      ...(me ? { people: joinPeople(space.people, me) } : {}),
    },
    now,
  );
}

export function reopen(space: Space, now = Date.now()): Space {
  if (!space.decision) return space;
  return touched(space, { decision: undefined }, now);
}

// ---- discussion ----

/**
 * Saying something about a highlight.
 *
 * This is the part of working together that a file can actually carry. Nobody
 * is typing at the same moment as anybody else, but you can disagree with a
 * passage where the passage is, send the space back, and have the reply arrive
 * underneath — which is most of what a comment thread is for, and a great deal
 * better than the argument happening in a chat window where the quote is a
 * screenshot.
 */
export function addComment(
  space: Space,
  markId: string,
  body: string,
  me: Person | null = null,
  now = Date.now(),
): Space {
  const text = body.trim();
  // Only about a highlight this space actually holds, so a thread can never
  // outlive what it is about.
  if (!text || !space.markIds.includes(markId)) return space;
  const comment: Comment = {
    id: newId(),
    markId,
    body: text,
    ...(me ? { by: me.id } : {}),
    createdAt: now,
  };
  return touched(
    space,
    {
      comments: [...(space.comments ?? []), comment],
      ...(me ? { people: joinPeople(space.people, me) } : {}),
    },
    now,
  );
}

export function editComment(space: Space, commentId: string, body: string, now = Date.now()): Space {
  const text = body.trim();
  if (!text || !space.comments) return space;
  // Saving a reply without having changed it is not an edit, and marking it as
  // one would be telling a reader something happened that did not.
  const before = space.comments.find((entry) => entry.id === commentId);
  if (!before || before.body === text) return space;
  return touched(
    space,
    {
      comments: space.comments.map((entry) =>
        entry.id === commentId ? { ...entry, body: text, editedAt: now } : entry,
      ),
    },
    now,
  );
}

export function removeComment(space: Space, commentId: string, now = Date.now()): Space {
  if (!space.comments) return space;
  return touched(
    space,
    { comments: space.comments.filter((entry) => entry.id !== commentId) },
    now,
  );
}

/**
 * Calling a thread finished, or opening it again. The replies stay either way;
 * settling collapses the argument rather than deleting it, because the reason
 * a passage was contested is part of why the conclusion reads as it does.
 */
export function setSettled(space: Space, markId: string, settled: boolean, now = Date.now()): Space {
  const current = space.settled ?? [];
  if (settled === current.includes(markId)) return space;
  return touched(
    space,
    { settled: settled ? [...current, markId] : current.filter((id) => id !== markId) },
    now,
  );
}

/** Everything said about one highlight, oldest first. */
export function commentsOn(space: Space, markId: string): Comment[] {
  return (space.comments ?? [])
    .filter((entry) => entry.markId === markId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function isSettled(space: Space, markId: string): boolean {
  return (space.settled ?? []).includes(markId);
}

export function peopleOf(space: Space): Person[] {
  return space.people ?? [];
}

/** Who brought this highlight in, where that is known and the space can name them. */
export function gathererOf(space: Space, markId: string): Person | null {
  return personIn(space.people, space.gathered?.[markId]);
}

/**
 * Who brought each highlight in, across every space at once.
 *
 * The library holds highlights, not spaces, so the credit it wants is not
 * "who put this in that space" but "who found this at all". A highlight can
 * sit in two spaces and have been gathered into each by a different person,
 * so it maps to everyone credited rather than to one name.
 */
export function whoFound(spaces: readonly Space[]): Map<string, Person[]> {
  const found = new Map<string, Person[]>();
  for (const space of spaces) {
    for (const [markId, personId] of Object.entries(space.gathered ?? {})) {
      const person = personIn(space.people, personId);
      if (!person) continue;
      const credited = found.get(markId) ?? [];
      if (!credited.some((entry) => entry.id === person.id)) credited.push(person);
      found.set(markId, credited);
    }
  }
  return found;
}

/**
 * Whether this space has been worked on by more than one person — which is the
 * only thing that decides whether the page says "I" or "we", and whether there
 * is any point showing a name against anything.
 */
export function isShared(space: Space): boolean {
  return (space.people ?? []).length > 1;
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
