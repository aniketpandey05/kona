import type { Mark } from './types';

/**
 * Putting something out of the way without losing it.
 *
 * **Archived is a filter on one list, not a place.** That is the whole of
 * decision 10 and everything else follows from it. A *place* has to be known
 * about by everything — search has to decide whether to look there, counts
 * whether to count it, spaces whether to show it, export whether to include
 * it — and each of those is a chance for two surfaces to disagree about where
 * something is. A *filter* is known about by one list.
 *
 * So exhaustively, and this is the list to check any new surface against:
 *
 * | | |
 * | --- | --- |
 * | In the library's default view | **No.** The only thing archiving changes |
 * | Found by search | **Yes**, always, marked as archived |
 * | Still painted on its page | **Yes.** The mark is the thing you made |
 * | In the panel for that page | **Yes.** The panel is about this page |
 * | Still in its spaces | **Yes.** A space is deliberate; the library is the firehose |
 * | Deleted by archiving | **No**, and you can still delete it yourself |
 *
 * **Search must never lose it.** Kona promises one thing: that you can find it
 * again. An archive that hides things from search is a bin with extra steps,
 * and it turns archiving into a decision rather than tidying — which is how
 * people end up deleting instead, because at least deleting is honest.
 */

/**
 * How many a Free library may have put away at once.
 *
 * **A working set, not a quota.** Un-archiving hands the slot straight back,
 * so this limits how many can be out of the way at a time rather than how many
 * ever can be. Reaching it never deletes or un-archives anything on its own.
 *
 * Per device, because Free has no sync and its counts are local (10a) — the
 * cap is enforced on the machine it happens on, by code that needs to know
 * nothing at all about you.
 */
export const FREE_ARCHIVE_LIMIT = 15;

/** Free's spaces, a hard five: archiving a space is Pro, so nothing defeats it. */
export const FREE_SPACE_LIMIT = 5;

export function isArchived(mark: Mark): boolean {
  return mark.archivedAt !== undefined;
}

/** Everything the library's default view shows, which is the only list this changes. */
export function notArchived(marks: readonly Mark[]): Mark[] {
  return marks.filter((mark) => !isArchived(mark));
}

export function archivedOnly(marks: readonly Mark[]): Mark[] {
  return marks.filter(isArchived);
}

export function countArchived(marks: readonly Mark[]): number {
  return marks.reduce((n, mark) => n + (isArchived(mark) ? 1 : 0), 0);
}

/**
 * Whether this library may put more away, and how many.
 *
 * Answered before anything is archived rather than discovered partway through
 * a bulk gesture: archiving two hundred highlights one at a time is a
 * punishment, so the bulk case has to know its own answer up front.
 */
export function roomToArchive(marks: readonly Mark[], pro: boolean): number {
  if (pro) return Number.POSITIVE_INFINITY;
  return Math.max(0, FREE_ARCHIVE_LIMIT - countArchived(marks));
}

/**
 * Archive these, or as many as there is room for.
 *
 * Returns what changed and what did not, so the caller can say *fifteen is
 * the limit, here is what went* rather than silently doing less than asked.
 * Nothing is ever removed or un-archived to make room (7).
 */
export function archive(
  marks: readonly Mark[],
  ids: readonly string[],
  pro: boolean,
  now = Date.now(),
): { changed: Mark[]; refused: string[] } {
  const wanted = new Set(ids);
  let room = roomToArchive(marks, pro);
  const changed: Mark[] = [];
  const refused: string[] = [];

  for (const mark of marks) {
    if (!wanted.has(mark.id) || isArchived(mark)) continue;
    if (room <= 0) {
      refused.push(mark.id);
      continue;
    }
    room -= 1;
    changed.push({ ...mark, archivedAt: now, updatedAt: now });
  }
  return { changed, refused };
}

/** Bringing one back, which hands its slot straight back to the working set. */
export function unarchive(marks: readonly Mark[], ids: readonly string[], now = Date.now()): Mark[] {
  const wanted = new Set(ids);
  const changed: Mark[] = [];
  for (const mark of marks) {
    if (!wanted.has(mark.id) || !isArchived(mark)) continue;
    const { archivedAt: _gone, ...rest } = mark;
    changed.push({ ...rest, updatedAt: now });
  }
  return changed;
}

/** Whether a Free library may make another space. A hard five (11). */
export function roomForSpace(spaceCount: number, pro: boolean): boolean {
  return pro || spaceCount < FREE_SPACE_LIMIT;
}
