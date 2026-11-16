import { joinPeople, personIn, type Person } from './people';
import { pageId } from './pageUrl';
import { addTags, removeTag } from './tags';
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
 * browser, the same bargain the rest of `core` makes.
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
  /**
   * Proof that the person named in `by` really wrote this. Added when the
   * space is handed over, because that is the only moment it matters, and
   * absent on anything written before there was a key to sign with.
   */
  sig?: string;
}

export interface Decision {
  body: string;
  /** Who settled it. */
  by?: string;
  decidedAt: number;
  /**
   * Proof that the person named in `by` really wrote this. Added when the
   * space is handed over, because that is the only moment it matters, and
   * absent on anything written before there was a key to sign with.
   */
  sig?: string;
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
  /**
   * Proof that the person named in `by` really wrote this. Added when the
   * space is handed over, because that is the only moment it matters, and
   * absent on anything written before there was a key to sign with.
   */
  sig?: string;
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
  /**
   * Anything else worth saying about the space that is not the topic (1e).
   *
   * This is where a conclusion goes. 20 took the write-up out of the
   * definitions entirely: a space produces no document, because 3d already
   * puts the shared space on the web with every highlight linking to the exact
   * words, and that *is* the document.
   */
  note?: string;
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
  /** Pages put here to read, which are not highlights and never reach the library (20). */
  links?: SpaceLink[];
  /** Where you put this space in your own list (1e). Absent on spaces made before. */
  position?: number;
  /**
   * Its own short labels, working the way tags do on a highlight, for pulling
   * related spaces together (1e).
   *
   * Not the same list as a highlight's tags and never mixed with it: a tag
   * says something about a passage, a label says something about a project.
   * 1c settled that tags and spaces are independent axes, and this is the same
   * distinction one level up.
   */
  labels?: string[];
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
 * claim as though nothing had changed, see `sourcesFor`.
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
 * underneath, which is most of what a comment thread is for, and a great deal
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
        // The signature was over the old wording, so it is no longer true of
        // this reply. It is dropped here and made again when the space is
        // next handed over.
        entry.id === commentId
          ? { ...entry, body: text, editedAt: now, sig: undefined }
          : entry,
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
 * Whether this space has been worked on by more than one person, which is the
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

/** Gathered here but not yet behind any finding, what there is left to draw a conclusion from. */
export function unusedIn(space: Space, marks: readonly Mark[]): Mark[] {
  const cited = new Set(space.findings.flatMap((finding) => finding.markIds));
  return marksIn(space, marks).filter((mark) => !cited.has(mark.id));
}

/** Settled, still asking, or a shelf that never asked anything. */
export function statusOf(space: Space): 'settled' | 'open' | 'shelf' {
  if (!space.question) return 'shelf';
  return space.decision ? 'settled' : 'open';
}

/**
 * A page somebody put in a space without having read it yet (20).
 *
 * **Bare links live in spaces, never in the library.** The library is
 * passages: a bookmark put there is clutter nobody chose, which is why 14a
 * refuses to import bookmarks at all. A workspace is the other thing, and a
 * workspace may hold *I found this, I will read it*, which is a deliberate
 * act rather than a pile.
 *
 * It shows as what it is, an invitation to read, and it has nothing in common
 * with a highlight except that it names a page.
 */
export interface SpaceLink {
  /** The page, exactly as it was given. */
  url: string;
  /** What to call it. The page's own title where one was known, else the host. */
  title?: string;
  addedAt: number;
}

/** Labelling a space, by the same rules a highlight's tags follow. */
export function labelSpace(space: Space, input: string, now = Date.now()): Space {
  const labels = addTags(space.labels ?? [], input);
  return labels.length === (space.labels ?? []).length ? space : touched(space, { labels }, now);
}

export function unlabelSpace(space: Space, label: string, now = Date.now()): Space {
  const labels = removeTag(space.labels ?? [], label);
  return labels.length === (space.labels ?? []).length ? space : touched(space, { labels }, now);
}

/** Putting a page in a space to read later. Adding the same one twice is not an error. */
export function addLink(space: Space, url: string, title?: string, now = Date.now()): Space {
  const clean = url.trim();
  if (!clean) return space;
  const links = space.links ?? [];
  if (links.some((link) => samePage(link.url, clean))) return space;
  return touched(space, { links: [...links, { url: clean, title: title?.trim() || undefined, addedAt: now }] }, now);
}

export function removeLink(space: Space, url: string, now = Date.now()): Space {
  const links = space.links ?? [];
  if (!links.some((link) => samePage(link.url, url))) return space;
  return touched(space, { links: links.filter((link) => !samePage(link.url, url)) }, now);
}

/**
 * Whether two addresses are the same page, by the same rule the library files
 * highlights under, so a link added from a tweet and a highlight made from a
 * search result are not two different pages.
 */
export function samePage(a: string, b: string): boolean {
  try {
    return pageId(new URL(a)) === pageId(new URL(b));
  } catch {
    return a.trim() === b.trim();
  }
}

/**
 * The order you put your spaces in (1e).
 *
 * By hand, the way highlights already are in `order.ts`, because a list of
 * spaces is a list of what you are working on and the order of that is yours
 * rather than a date's. Spaces made before this have no position, and sort
 * after the ones that do, newest first, which is where they already were.
 */
export function inOrder(spaces: readonly Space[]): Space[] {
  return [...spaces].sort((a, b) => {
    if (a.position !== undefined && b.position !== undefined) return a.position - b.position;
    if (a.position !== undefined) return -1;
    if (b.position !== undefined) return 1;
    return b.updatedAt - a.updatedAt;
  });
}

/**
 * Moving one space up or down the list.
 *
 * Returns every space that has to be written, not just the one that moved:
 * ordering a list by hand means giving the whole list its positions, and
 * writing one of them would leave the rest disagreeing about where they are.
 */
export function moveSpace(spaces: readonly Space[], id: string, by: -1 | 1, now = Date.now()): Space[] {
  const ordered = inOrder(spaces);
  const at = ordered.findIndex((space) => space.id === id);
  const to = at + by;
  if (at < 0 || to < 0 || to >= ordered.length) return [];
  const moved = [...ordered];
  const [taken] = moved.splice(at, 1);
  moved.splice(to, 0, taken!);
  // Only the ones whose stored position differs from where they now are: a
  // space that has not moved does not need writing, and one that never had a
  // position does.
  return moved
    .map((space, position) => ({ space, position }))
    .filter(({ space, position }) => space.position !== position)
    .map(({ space, position }) => touched(space, { position }, now));
}
