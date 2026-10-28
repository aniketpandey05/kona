import type { TextQuote } from './quote';
import { cleanPassage } from './text';
import type { Finding, Space, Stance } from './spaces';
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
  space: Space;
  marks: Mark[];
}

/** A file that has been read and vouched for, plus what reading it cost. */
export interface IncomingSpace extends SharedSpace {
  /** Entries in the file that nothing could be made of. */
  dropped: number;
}

/** What came in, and what it cost to take it. */
export interface Adopted {
  space: Space;
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
export function packSpace(space: Space, marks: readonly Mark[]): string {
  const held = space.markIds
    .map((id) => marks.find((mark) => mark.id === id))
    .filter((mark): mark is Mark => !!mark);

  const payload: SharedSpace = {
    app: 'kona',
    kind: 'space',
    version: SHARE_VERSION,
    exportedAt: Date.now(),
    space,
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

  return {
    app: 'kona',
    kind: 'space',
    version: typeof raw.version === 'number' ? raw.version : SHARE_VERSION,
    exportedAt: typeof raw.exportedAt === 'number' ? raw.exportedAt : Date.now(),
    space,
    marks,
    dropped: offered.length - marks.length,
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

  const space: Space = {
    ...shared.space,
    // A fresh id. Importing the same file twice leaves you with two spaces,
    // which you can delete — rather than silently overwriting the one you have
    // been working in, which you cannot undo.
    id: newId(),
    markIds: mapped(shared.space.markIds),
    findings: shared.space.findings.map((finding) => ({
      ...finding,
      markIds: mapped(finding.markIds),
    })),
    updatedAt: now,
  };

  return {
    space,
    added,
    updated,
    reused,
    dropped: shared.dropped,
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

function cleanSpace(value: unknown, haveMarks: ReadonlySet<string>): Space | null {
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
            createdAt: num(finding.createdAt, Date.now()),
          };
        })
        .filter((finding): finding is Finding => !!finding)
    : [];

  const createdAt = num(raw.createdAt, Date.now());
  const decision = raw.decision as Partial<Space['decision']> | undefined;
  const body = str(decision?.body);

  return {
    id: str(raw.id) ?? newId(),
    name: raw.name.trim() || 'Untitled space',
    ...(str(raw.question) ? { question: raw.question } : {}),
    markIds: held,
    findings,
    openQuestions: strings(raw.openQuestions).filter((entry) => entry.trim()),
    ...(body ? { decision: { body, decidedAt: num(decision?.decidedAt, createdAt) } } : {}),
    createdAt,
    updatedAt: num(raw.updatedAt, createdAt),
  };
}
