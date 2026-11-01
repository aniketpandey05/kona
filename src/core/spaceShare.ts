import { mergePeople, personIn, type Person } from './people';
import type { TextQuote } from './quote';
import { cleanPassage } from './text';
import { originOf } from './spaces';
import type { Comment, Finding, Space, Stance } from './spaces';
import type { HighlightColor, Mark, SiteId } from './types';

/**
 * Handing a space to somebody else.
 *
 * Two people cannot work inside one space at the same moment without a server
 * to sit between them, and Kona has no server. What it can do is make a space
 * a thing you hand over whole: the question, the passages, what you concluded,
 * what is still open, and a link under every passage that lands on the exact
 * sentence it came from.
 *
 * That turns out to cover most of how research actually moves between people.
 * You work a question for a day, send the space to whoever has to act on it,
 * and they open it with your evidence already gathered — then add a passage,
 * argue with a conclusion, and send it back. Nobody has to be online at the
 * same time, nothing leaves the two machines, and the write-up it produces is
 * checkable by a third person who has never installed anything.
 *
 * A file that arrives from someone else is not our data, so everything here is
 * rebuilt field by field rather than trusted: an unknown property cannot ride
 * into storage, a claim cannot cite a highlight that is not in the file, and a
 * highlight whose URL is not http(s) is dropped (see `linkToMark`).
 */

export const SHARE_VERSION = 1;

/** The file format itself. */
export interface SharedSpace {
  app: 'kona';
  kind: 'space';
  version: number;
  exportedAt: number;
  /**
   * Whoever pressed Share, as a person id in `space.people`. It is how the
   * other side can say who sent this back. Asserted and not verified — see
   * `core/people`.
   */
  by?: string;
  space: Space;
  marks: Mark[];
}

/** A file that has been read and vouched for, plus what reading it cost. */
export interface IncomingSpace extends SharedSpace {
  /** Entries in the file that nothing could be made of. */
  dropped: number;
  /** Who sent it, where the file names them. */
  from?: Person;
}

/** What came in, and what it cost to take it. */
/** What a space coming back brought with it that was not already here. */
export interface Gained {
  conclusions: number;
  replies: number;
  questions: number;
  people: number;
}

export interface Adopted {
  space: Space;
  /** True when this went into a space already here, rather than beside it. */
  merged: boolean;
  /** Who sent it, where the file names them. */
  from?: Person;
  /** On a merge, the work of theirs that was new to you. */
  gained: Gained;
  /** Highlights the library did not have. These need saving. */
  added: Mark[];
  /** Local highlights that gained the sender's note. These need saving too. */
  updated: Mark[];
  /** How many of the file's highlights the library already held. */
  reused: number;
  /** Highlights dropped because nothing could be made of them. */
  dropped: number;
}

const newId = (): string => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Only the highlights this space holds — never the whole library. Sharing one
 * question's evidence should not hand over everything else you have read.
 */
export function packSpace(space: Space, marks: readonly Mark[], me: Person | null = null): string {
  const held = space.markIds
    .map((id) => marks.find((mark) => mark.id === id))
    .filter((mark): mark is Mark => !!mark);

  const payload: SharedSpace = {
    app: 'kona',
    kind: 'space',
    version: SHARE_VERSION,
    exportedAt: Date.now(),
    ...(me ? { by: me.id } : {}),
    // Your own name goes with it even if you have not written anything here
    // yet, because the other side has to be able to say who sent it.
    space: me ? { ...space, people: mergePeople(space.people, [me]) } : space,
    marks: held,
  };
  return JSON.stringify(payload, null, 2);
}

/** A filename someone can find again in their downloads folder. */
export function shareFilename(space: Space): string {
  const stem =
    space.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'space';
  return `${stem}.kona-space.json`;
}

export function readSharedSpace(text: string): IncomingSpace {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't readable as a shared space.");
  }

  const raw = data as Partial<SharedSpace> | null;
  if (!raw || raw.app !== 'kona' || raw.kind !== 'space') {
    throw new Error("That doesn't look like a space shared from Kona.");
  }
  if (typeof raw.version === 'number' && raw.version > SHARE_VERSION) {
    throw new Error('That space was shared by a newer version of Kona. Update and try again.');
  }

  const offered = Array.isArray(raw.marks) ? raw.marks : [];
  const marks = offered.map(cleanMark).filter((mark): mark is Mark => !!mark);
  const space = cleanSpace(raw.space, new Set(marks.map((mark) => mark.id)));
  if (!space) throw new Error("That file doesn't contain a space.");

  const by = str(raw.by);
  const from = personIn(space.people, by);

  return {
    app: 'kona',
    kind: 'space',
    version: typeof raw.version === 'number' ? raw.version : SHARE_VERSION,
    exportedAt: typeof raw.exportedAt === 'number' ? raw.exportedAt : Date.now(),
    ...(by ? { by } : {}),
    space,
    marks,
    dropped: offered.length - marks.length,
    ...(from ? { from } : {}),
  };
}

/**
 * Fitting an incoming space into a library that already has its own ids.
 *
 * Two people who highlight the same sentence end up with different ids for it,
 * so highlights are matched on what they actually are — the passage, in the
 * conversation it came from. A match means the local copy is kept and the
 * incoming one is thrown away, because the note on it is the reader's own work
 * and should not be overwritten by a visitor. The one exception: if the local
 * copy has no note and the sender wrote one, the note is worth having.
 */
export function adoptSpace(
  shared: IncomingSpace,
  existing: readonly Mark[],
  spaces: readonly Space[] = [],
  now = Date.now(),
): Adopted {
  const byPassage = new Map<string, Mark>();
  for (const mark of existing) byPassage.set(passageKey(mark), mark);
  const takenIds = new Set(existing.map((mark) => mark.id));

  const idFor = new Map<string, string>();
  const added: Mark[] = [];
  const updated: Mark[] = [];
  let reused = 0;

  for (const incoming of shared.marks) {
    const mine = byPassage.get(passageKey(incoming));
    if (mine) {
      idFor.set(incoming.id, mine.id);
      reused += 1;
      if (!mine.note && incoming.note) {
        updated.push({ ...mine, note: incoming.note, updatedAt: now });
      }
      continue;
    }
    // Keep the sender's id where it is free, so a space passed back and forth
    // does not grow a fresh copy of the same passage on every trip.
    const id = takenIds.has(incoming.id) ? newId() : incoming.id;
    takenIds.add(id);
    idFor.set(incoming.id, id);
    added.push({ ...incoming, id });
  }

  const mapped = (ids: readonly string[]): string[] => {
    const out: string[] = [];
    for (const id of ids) {
      const local = idFor.get(id);
      if (local && !out.includes(local)) out.push(local);
    }
    return out;
  };

  const incomingMarkIds = mapped(shared.space.markIds);
  const incomingFindings = shared.space.findings.map((finding) => ({
    ...finding,
    markIds: mapped(finding.markIds),
  }));

  // Every id a thread or a credit points at has to be moved onto the local
  // copy of the same passage too, or the discussion arrives detached from what
  // it is about.
  const incomingComments: Comment[] = (shared.space.comments ?? [])
    .map((comment) => ({ ...comment, markId: idFor.get(comment.markId) ?? '' }))
    .filter((comment) => incomingMarkIds.includes(comment.markId));
  const incomingSettled = mapped(shared.space.settled ?? []);
  const incomingGathered: Record<string, string> = {};
  for (const [theirId, who] of Object.entries(shared.space.gathered ?? {})) {
    const local = idFor.get(theirId);
    if (local) incomingGathered[local] = who;
  }

  const theirs: Theirs = {
    markIds: incomingMarkIds,
    findings: incomingFindings,
    comments: incomingComments,
    settled: incomingSettled,
    gathered: incomingGathered,
  };

  // The copy of this space you already have, if this is one coming back to you.
  const origin = originOf(shared.space);
  const mine = spaces.find((candidate) => originOf(candidate) === origin);

  const taken = mine
    ? mergeInto(mine, theirs, shared.space, now)
    : {
        space: {
          ...shared.space,
          // A local id of its own, but the origin is kept: that is what makes
          // the next trip back a merge rather than a third copy.
          id: newId(),
          origin,
          markIds: incomingMarkIds,
          findings: incomingFindings,
          comments: incomingComments,
          settled: incomingSettled,
          gathered: incomingGathered,
          updatedAt: now,
        },
        gained: { conclusions: 0, replies: 0, questions: 0, people: 0 },
      };

  return {
    space: taken.space,
    merged: !!mine,
    ...(shared.from ? { from: shared.from } : {}),
    gained: taken.gained,
    added,
    updated,
    reused,
    dropped: shared.dropped,
  };
}

/** The incoming space with every highlight id already moved onto the local copies. */
interface Theirs {
  markIds: string[];
  findings: Finding[];
  comments: Comment[];
  settled: string[];
  gathered: Record<string, string>;
}

/**
 * A space coming back with somebody else's work in it.
 *
 * The merge only ever adds. Two people editing apart cannot be reconciled
 * without asking somebody, and the one thing worse than a duplicate space is
 * an import that quietly deletes the paragraph you wrote this morning. So a
 * highlight or a conclusion they removed stays in your copy, and you take it
 * out yourself if you agree. Everything they added arrives.
 */
function mergeInto(
  mine: Space,
  theirs: Theirs,
  incoming: Space,
  now: number,
): { space: Space; gained: Gained } {
  const markIds = [...mine.markIds];
  for (const id of theirs.markIds) if (!markIds.includes(id)) markIds.push(id);

  const findings = [...mine.findings];
  const haveFinding = new Set(findings.map((finding) => finding.id));
  let conclusions = 0;
  for (const finding of theirs.findings) {
    if (!haveFinding.has(finding.id)) {
      findings.push(finding);
      haveFinding.add(finding.id);
      conclusions += 1;
    }
  }

  const comments = [...(mine.comments ?? [])];
  const whereComment = new Map(comments.map((comment, at) => [comment.id, at]));
  let replies = 0;
  for (const comment of theirs.comments) {
    if (!markIds.includes(comment.markId)) continue;
    const at = whereComment.get(comment.id);
    if (at === undefined) {
      whereComment.set(comment.id, comments.length);
      comments.push(comment);
      replies += 1;
      continue;
    }
    // The same reply on both sides. Whoever reworded it last is the one who
    // decided what it says, and the body is the only thing that can differ, so
    // taking the later wording loses nothing and keeps the two copies agreeing.
    const ours = comments[at]!;
    if ((comment.editedAt ?? 0) > (ours.editedAt ?? 0)) comments[at] = comment;
  }

  // A thread either of you has called finished is finished. Settling is not a
  // deletion, so taking the more settled of the two states loses nothing.
  const settled = [...(mine.settled ?? [])];
  for (const id of theirs.settled) if (!settled.includes(id)) settled.push(id);

  // Who found a passage is a fact about the past, so the first answer stands.
  const gathered = { ...theirs.gathered, ...mine.gathered };

  const openQuestions = [...mine.openQuestions];
  let questions = 0;
  for (const question of incoming.openQuestions) {
    if (!openQuestions.includes(question)) {
      openQuestions.push(question);
      questions += 1;
    }
  }

  const people = mergePeople(mine.people, incoming.people);

  // Whoever decided last wins, because a decision is a point in time. A
  // decision never un-decides a space it arrives in.
  const decision =
    incoming.decision && (!mine.decision || incoming.decision.decidedAt > mine.decision.decidedAt)
      ? incoming.decision
      : mine.decision;

  return {
    space: {
      ...mine,
      // A question or a name they set is only taken where you have none.
      question: mine.question ?? incoming.question,
      markIds,
      findings,
      openQuestions,
      people,
      gathered,
      comments,
      settled,
      ...(decision ? { decision } : {}),
      updatedAt: now,
    },
    gained: {
      conclusions,
      replies,
      questions,
      people: people.length - (mine.people ?? []).length,
    },
  };
}

/** The same passage in the same conversation, however it was whitespaced. */
function passageKey(mark: Mark): string {
  return [mark.site, mark.conversationId, cleanPassage(mark.snapshot)].join('\u0000');
}

const SITES: readonly SiteId[] = ['chatgpt', 'claude', 'gemini', 'web'];
const COLORS: readonly HighlightColor[] = ['yellow', 'green', 'blue', 'pink'];
const STANCES: readonly Stance[] = ['supports', 'contradicts', 'open'];

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

/**
 * Rebuilt field by field. A highlight needs an id, its text, and somewhere it
 * came from; without a usable http(s) address there is no link to land on the
 * sentence, which is the whole reason to pass one of these around, so it goes.
 */
function cleanMark(value: unknown): Mark | null {
  const raw = value as Partial<Mark> | null;
  if (!raw) return null;

  const id = str(raw.id);
  const snapshot = typeof raw.snapshot === 'string' ? raw.snapshot : undefined;
  const url = str(raw.url);
  if (!id || !snapshot || !url || !isLinkable(url)) return null;

  const createdAt = num(raw.createdAt, Date.now());

  return {
    id,
    site: SITES.includes(raw.site as SiteId) ? (raw.site as SiteId) : 'web',
    conversationId: str(raw.conversationId) ?? id,
    conversationTitle: typeof raw.conversationTitle === 'string' ? raw.conversationTitle : '',
    url,
    label: typeof raw.label === 'string' ? raw.label : '',
    color: COLORS.includes(raw.color as HighlightColor) ? (raw.color as HighlightColor) : 'yellow',
    snapshot,
    ...(str(raw.note) ? { note: raw.note } : {}),
    ...(strings(raw.tags).length > 0 ? { tags: strings(raw.tags) } : {}),
    ...(cleanQuote(raw.quote) ? { quote: cleanQuote(raw.quote) as TextQuote } : {}),
    createdAt,
    updatedAt: num(raw.updatedAt, createdAt),
  };
}

/** The context either side of a passage is what re-anchors it, so it is kept — as strings. */
function cleanQuote(value: unknown): TextQuote | null {
  const raw = value as Partial<TextQuote> | null;
  if (!raw || typeof raw.exact !== 'string' || !raw.exact) return null;
  return {
    exact: raw.exact,
    prefix: typeof raw.prefix === 'string' ? raw.prefix : '',
    suffix: typeof raw.suffix === 'string' ? raw.suffix : '',
    start: num(raw.start, 0),
  };
}

function isLinkable(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * A space rebuilt field by field from whatever a file claims, keeping nothing
 * it did not have to. Exported because a backup is just as untrusted as a
 * space somebody sent, and deserves exactly this and not a second, laxer copy
 * of it.
 */
export function cleanSpace(value: unknown, haveMarks: ReadonlySet<string>): Space | null {
  const raw = value as Partial<Space> | null;
  if (!raw || typeof raw.name !== 'string') return null;

  // A claim may only cite highlights that came in the same file. Otherwise an
  // imported claim could point at an id that happens to exist in this library
  // and quietly cite a passage its author never saw.
  const held = strings(raw.markIds).filter((id) => haveMarks.has(id));
  const keep = new Set(held);

  const findings: Finding[] = Array.isArray(raw.findings)
    ? raw.findings
        .map((entry): Finding | null => {
          const finding = entry as Partial<Finding> | null;
          const claim = str(finding?.claim);
          if (!finding || !claim) return null;
          return {
            id: str(finding.id) ?? newId(),
            claim,
            stance: STANCES.includes(finding.stance as Stance) ? (finding.stance as Stance) : 'open',
            markIds: strings(finding.markIds).filter((id) => keep.has(id)),
            ...(str(finding.by) ? { by: finding.by } : {}),
            createdAt: num(finding.createdAt, Date.now()),
            ...(str(finding.sig) ? { sig: finding.sig } : {}),
          };
        })
        .filter((finding): finding is Finding => !!finding)
    : [];

  const createdAt = num(raw.createdAt, Date.now());
  const decision = raw.decision as Partial<Space['decision']> | undefined;
  const body = str(decision?.body);

  const id = str(raw.id) ?? newId();
  return {
    id,
    origin: str(raw.origin) ?? id,
    name: raw.name.trim() || 'Untitled space',
    ...(str(raw.question) ? { question: raw.question } : {}),
    markIds: held,
    findings,
    openQuestions: strings(raw.openQuestions).filter((entry) => entry.trim()),
    people: cleanPeople(raw.people),
    gathered: cleanGathered(raw.gathered, keep),
    comments: cleanComments(raw.comments, keep),
    settled: strings(raw.settled).filter((entry) => keep.has(entry)),
    ...(body
      ? {
          decision: {
            body,
            ...(str(decision?.by) ? { by: decision?.by } : {}),
            decidedAt: num(decision?.decidedAt, createdAt),
            ...(str(decision?.sig) ? { sig: decision?.sig } : {}),
          },
        }
      : {}),
    createdAt,
    updatedAt: num(raw.updatedAt, createdAt),
  };
}

/** A person is a name and an id, and nothing else is taken from the file. */
function cleanPeople(value: unknown): Person[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: Person[] = [];
  for (const entry of value) {
    const raw = entry as Partial<Person> | null;
    const id = str(raw?.id);
    const name = str(raw?.name);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    const key = str(raw?.key);
    out.push({ id, name: name.trim().slice(0, 60), ...(key ? { key } : {}) });
  }
  return out;
}

/**
 * Who found what, as a fresh object built from entries the file actually has.
 * A credit for a highlight that did not come in the same file is dropped, the
 * same rule the claims follow.
 */
function cleanGathered(value: unknown, keep: ReadonlySet<string>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [markId, who] of Object.entries(value as Record<string, unknown>)) {
    if (keep.has(markId) && typeof who === 'string' && who.trim()) out[markId] = who;
  }
  return out;
}

/** A reply needs something said and a highlight in this file to be said about. */
function cleanComments(value: unknown, keep: ReadonlySet<string>): Comment[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: Comment[] = [];
  for (const entry of value) {
    const raw = entry as Partial<Comment> | null;
    const markId = str(raw?.markId);
    const bodyText = str(raw?.body);
    if (!markId || !bodyText || !keep.has(markId)) continue;
    const commentId = str(raw?.id) ?? newId();
    if (seen.has(commentId)) continue;
    seen.add(commentId);
    out.push({
      id: commentId,
      markId,
      body: bodyText,
      ...(str(raw?.by) ? { by: raw?.by } : {}),
      createdAt: num(raw?.createdAt, Date.now()),
      ...(typeof raw?.editedAt === 'number' && Number.isFinite(raw.editedAt)
        ? { editedAt: raw.editedAt }
        : {}),
      ...(str(raw?.sig) ? { sig: raw?.sig } : {}),
    });
  }
  return out;
}
