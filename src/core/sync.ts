/**
 * Keeping two copies of a library in step through a folder.
 *
 * Sync normally means a server: ours, holding your highlights, with an
 * account on each end. That is what Pro and Team were written down as, and it
 * is the part of both that would undo the thing Kona promises — that nothing
 * leaves your computer.
 *
 * It does not have to mean that. Nearly everybody already runs a sync client:
 * Drive, Dropbox, iCloud, OneDrive, Syncthing. Point Kona at a folder one of
 * those already keeps in step and the problem is solved by something the user
 * already trusts, already pays for, and can already see. Kona makes no network
 * request; it writes a file.
 *
 * The same mechanism answers two different wants, which is why it is one
 * thing and not two:
 *
 * - **Your own folder** keeps your own devices in step. That is Pro's sync.
 * - **A folder shared with somebody** keeps a space in step with them, with no
 *   file to send and replies arriving on their own. That is most of Team's
 *   shared space.
 *
 * Which makes what goes into the folder the whole safety question, because
 * everybody it is shared with can read all of it. So a folder has a **scope**:
 * a folder of your own carries everything, and a folder you share carries only
 * the spaces you put in it, and only the passages those spaces actually cite.
 * Nothing else of yours is written there, ever. Without a server to hold a
 * permission, that is the one that matters — what somebody else can see.
 *
 * What it does not do, stated here so nobody has to find out: it is as fast as
 * the sync client is, which is seconds rather than instant; there is no
 * presence and no cursors; taking access away again is the sharing folder's
 * job and not Kona's; and because a shared folder is readable by whoever it is
 * shared with, **the private signing key never goes in it**. Identity moves
 * only through a backup you make deliberately for yourself.
 *
 * It also never deletes. A highlight or a reply removed on one side comes back
 * from the other, exactly as the handover merge behaves, because two copies
 * that disagree about whether something exists cannot be told apart from one
 * copy that has not caught up.
 */

import { createBackup, readBackup } from './backup';
import { mergeSpace } from './spaceShare';
import { originOf, type Space } from './spaces';
import type { Mark } from './types';

/** The one file, in whatever folder the user pointed at. */
export const SYNC_FILE = 'kona-library.json';

/**
 * Somewhere a file can be read from and written to. Kept this narrow so the
 * engine can be tested against a folder that is only a variable, and so the
 * same engine works against anything else that can hold a file later.
 */
export interface Folder {
  read(): Promise<string | null>;
  write(text: string): Promise<void>;
}

/** A folder somebody has chosen, and what to call it on screen. */
export interface Chosen {
  /** The folder's own name, which is how the person recognises it. */
  name: string;
  folder: Folder;
}

/**
 * Where a folder comes from, and how it is remembered between runs.
 *
 * A browser and a desktop app answer this completely differently — one has a
 * directory handle and a permission that expires, the other has a path and no
 * permission at all — and neither answer belongs in the engine. So the engine
 * takes one of these and asks it, which is also what lets the same sync UI
 * run in the extension, the phone app and the desktop app without three
 * copies of it.
 */
export interface FolderSource {
  /** Whether this platform can hold a folder at all. */
  canPick(): boolean;
  /** Ask for one. In a browser this must come from a click. */
  pick(): Promise<Chosen | null>;
  /**
   * The folder from last time, if it is still ours to write to. `ask` is for
   * the case where the person has just clicked, since a browser will not
   * re-grant permission on its own.
   */
  saved(ask?: boolean): Promise<Chosen | null>;
  /** What we remember calling it, whether or not it can be written to yet. */
  savedName(): Promise<string | null>;
  /** Whether the saved folder can be written to right now without asking. */
  ready(): Promise<boolean>;
  forget(): Promise<void>;
  scope(): Promise<Scope>;
  setScope(scope: Scope): Promise<void>;
}

/** What the engine is allowed to do to the library it is syncing. */
export interface SyncStore {
  marks(): Promise<Mark[]>;
  spaces(): Promise<Space[]>;
  saveMark(mark: Mark): Promise<void>;
  saveSpace(space: Space): Promise<void>;
}

/**
 * What this folder is allowed to carry.
 *
 * `everything` is a folder of your own, keeping one of your machines in step
 * with another. `spaces` is a folder you share: only these spaces go into it,
 * and only the passages they cite go with them.
 */
export type Scope = { kind: 'everything' } | { kind: 'spaces'; origins: readonly string[] };

export const EVERYTHING: Scope = { kind: 'everything' };

export interface Synced {
  /** Highlights that were not here before. */
  added: number;
  /** Highlights the other side had a newer copy of. */
  updated: number;
  /** Spaces that were not here before. */
  spacesAdded: number;
  /** Spaces that were here and gained something. */
  spacesMerged: number;
  /** Whether this side had anything the folder did not. */
  wrote: boolean;
}

const nothing = (): Synced => ({
  added: 0,
  updated: 0,
  spacesAdded: 0,
  spacesMerged: 0,
  wrote: false,
});

/**
 * What a library amounts to, for the purpose of deciding whether it has
 * changed. Ids with the time each was last touched, in a fixed order — small,
 * cheap, and the same on both sides for the same content.
 *
 * Comparing the whole file would not work: it carries the moment it was
 * written, so two sides in perfect agreement would each see a difference,
 * write, and set the other writing again, forever.
 */
function signature(marks: readonly Mark[], spaces: readonly Space[]): string {
  const of = (entries: ReadonlyArray<{ id: string; updatedAt: number }>): string =>
    entries
      .map((entry) => `${entry.id}:${entry.updatedAt}`)
      .sort()
      .join(',');
  return `${of(marks)}|${of(spaces)}`;
}

/**
 * One pass: take whatever the folder has, and leave it whatever we have.
 *
 * Both sides run this against the same file, so both converge on the union of
 * the two — and once they agree, neither writes, which is what stops them
 * talking past each other forever.
 */
export async function syncOnce(
  folder: Folder,
  store: SyncStore,
  scope: Scope = EVERYTHING,
  now = Date.now(),
): Promise<Synced> {
  const text = await folder.read();
  const found = nothing();
  // Read with the same validation a backup gets, because a file in a shared
  // folder is exactly as trustworthy as one somebody emailed. Once, because
  // validating a whole library is not free.
  const incoming = text ? readBackup(text, true) : null;

  if (incoming) {

    const mine = new Map((await store.marks()).map((mark) => [mark.id, mark]));
    for (const mark of incoming.marks) {
      const current = mine.get(mark.id);
      if (!current) {
        await store.saveMark(mark);
        found.added += 1;
      } else if (mark.updatedAt > current.updatedAt) {
        await store.saveMark(mark);
        found.updated += 1;
      }
    }

    const here = await store.spaces();
    const byOrigin = new Map(here.map((space) => [originOf(space), space]));
    for (const space of incoming.spaces) {
      const ours = byOrigin.get(originOf(space));
      if (!ours) {
        await store.saveSpace(space);
        found.spacesAdded += 1;
        continue;
      }
      const merged = mergeSpace(ours, space, now);
      const gained =
        merged.gained.conclusions + merged.gained.replies + merged.gained.questions + merged.gained.people;
      // Saving an unchanged space would move its updatedAt and set the other
      // side syncing again over nothing.
      if (gained > 0 || merged.space.markIds.length !== ours.markIds.length) {
        await store.saveSpace(merged.space);
        found.spacesMerged += 1;
      }
    }
  }

  const publish = await toPublish(store, scope, incoming);
  const ours = signature(publish.marks, publish.spaces);
  const theirs = incoming ? signature(incoming.marks, incoming.spaces) : null;

  if (ours !== theirs) {
    // Never the identity: the same folder may be one somebody shares with a
    // colleague, and a signing key is not a thing to leave lying in it.
    await folder.write(createBackup(publish.marks, publish.spaces));
    found.wrote = true;
  }
  return found;
}

/**
 * Exactly what this pass should leave in the folder.
 *
 * Whatever is already in the file stays, because dropping a space on the
 * grounds that this machine is not sharing it would delete somebody else's
 * work. On top of that goes whatever the scope says this machine contributes.
 * Both sides work the same answer out from the same inputs, which is what
 * lets them agree and stop writing.
 */
async function toPublish(
  store: SyncStore,
  scope: Scope,
  incoming: { marks: readonly Mark[]; spaces: readonly Space[] } | null,
): Promise<{ marks: Mark[]; spaces: Space[] }> {
  const here = await store.marks();
  const spaces = await store.spaces();
  if (scope.kind === 'everything') return { marks: here, spaces };

  const wanted = new Set(scope.origins);
  const keep = new Map<string, Space>();
  // The file's spaces first and mine second, so a space both sides hold ends
  // up being the merged copy this pass has just saved.
  for (const space of incoming?.spaces ?? []) keep.set(originOf(space), space);
  for (const space of spaces) {
    const origin = originOf(space);
    if (wanted.has(origin) || keep.has(origin)) keep.set(origin, space);
  }

  // Only the passages those spaces cite. The rest of the library is nobody
  // else's business, and this is the line that keeps it that way.
  const cited = new Set<string>();
  for (const space of keep.values()) for (const id of space.markIds) cited.add(id);
  const byId = new Map(here.map((mark) => [mark.id, mark]));
  const fromFile = new Map((incoming?.marks ?? []).map((mark) => [mark.id, mark]));
  const marks: Mark[] = [];
  for (const id of cited) {
    const mark = byId.get(id) ?? fromFile.get(id);
    if (mark) marks.push(mark);
  }

  return { marks, spaces: [...keep.values()] };
}

/** Whether a pass actually changed anything on this side. */
export function changedHere(synced: Synced): boolean {
  return synced.added + synced.updated + synced.spacesAdded + synced.spacesMerged > 0;
}

export interface ByHand {
  /** What the pass found and took. */
  synced: Synced;
  /**
   * The file as it should now be, or null when this side had nothing to add
   * and the one in the folder is already right.
   */
  give: string | null;
}

/**
 * The same pass, driven by hand, for the browsers that will not hold a folder.
 *
 * `showDirectoryPicker` is desktop Chromium and nothing else: Firefox and
 * Safari have not shipped it, and Chrome on Android does not offer it. That is
 * a platform fact and no amount of work here changes it — but it only stops
 * the *automatic* part. The file in the folder is an ordinary file, so anyone
 * can open it, take what is in it, and be handed back the version to put
 * where they got it.
 *
 * It is two taps instead of none, which is a real difference and a much
 * smaller one than being shut out of a workspace because of a browser. The
 * engine, the merge and the scope are all the same, so a colleague doing this
 * by hand and a colleague whose folder syncs itself are working on one file.
 */
export async function syncByHand(
  text: string | null,
  store: SyncStore,
  scope: Scope = EVERYTHING,
  now = Date.now(),
): Promise<ByHand> {
  let give: string | null = null;
  const folder: Folder = {
    read: async () => text,
    write: async (next) => {
      give = next;
    },
  };
  const synced = await syncOnce(folder, store, scope, now);
  return { synced, give };
}
