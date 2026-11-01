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
 * What it does not do, stated here so nobody has to find out: it is as fast as
 * the sync client is, which is seconds rather than instant; there is no
 * presence and no cursors; and because a shared folder is readable by whoever
 * it is shared with, **the private signing key never goes in it**. Identity
 * moves only through a backup you make deliberately for yourself.
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

/** What the engine is allowed to do to the library it is syncing. */
export interface SyncStore {
  marks(): Promise<Mark[]>;
  spaces(): Promise<Space[]>;
  saveMark(mark: Mark): Promise<void>;
  saveSpace(space: Space): Promise<void>;
}

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
  now = Date.now(),
): Promise<Synced> {
  const text = await folder.read();
  const found = nothing();
  // Read with the same validation a backup gets, because a file in a shared
  // folder is exactly as trustworthy as one somebody emailed. Once, because
  // validating a whole library is not free.
  const incoming = text ? readBackup(text) : null;

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

  const marks = await store.marks();
  const spaces = await store.spaces();
  const ours = signature(marks, spaces);
  const theirs = incoming ? signature(incoming.marks, incoming.spaces) : null;

  if (ours !== theirs) {
    // Never the identity: the same folder may be one somebody shares with a
    // colleague, and a signing key is not a thing to leave lying in it.
    await folder.write(createBackup(marks, spaces));
    found.wrote = true;
  }
  return found;
}

/** Whether a pass actually changed anything on this side. */
export function changedHere(synced: Synced): boolean {
  return synced.added + synced.updated + synced.spacesAdded + synced.spacesMerged > 0;
}
