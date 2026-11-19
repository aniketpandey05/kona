/**
 * What was deleted, so that a deletion survives a sync.
 *
 * **The hole this fills.** The folder merge takes the union of both sides and
 * keeps the newer copy of anything they both hold, which is 21's *latest
 * change wins* and is right for an edit. A deletion is not an edit. It is an
 * absence, and an absence looks exactly like a record the other side has not
 * been given yet, so the merge did the only thing it could with it and handed
 * the highlight back. Delete something on the laptop, sync, and the desktop
 * returns it.
 *
 * A tombstone turns the absence into a fact with a time on it, which is the
 * one shape the merge already knows how to compare. *Deleted at* against
 * *updated at*, newer wins, and the same rule covers the case nobody enjoys
 * writing down: deleted on one machine and edited on another, where the edit
 * wins if it came later, because 21 chose the author's rule over mine.
 *
 * **Pure on purpose.** Where the list is kept is not the same question on both
 * sides of the bridge, the extension has WXT storage and the web app has
 * localStorage, so this holds the arithmetic and each side holds its own list,
 * the way `sync.ts` and `folder.ts` already divide.
 */

/** A highlight that was deleted, and when. */
export interface Gone {
  id: string;
  at: number;
}

/**
 * How long a deletion is remembered.
 *
 * It cannot be forever: the list only grows, and a library with years of
 * tidying behind it would carry every one of them into every sync file. Six
 * months is long enough that any folder in regular use has heard, and the
 * trade is worth stating rather than hiding: a folder nobody has opened in
 * six months will hand back what you deleted, because by then nothing left
 * knows you deleted it.
 */
export const FORGET_AFTER_MS = 180 * 24 * 60 * 60 * 1000;

/** Only what is still worth remembering, newest first. */
export function prune(gone: readonly Gone[], now = Date.now()): Gone[] {
  return gone
    .filter((one) => typeof one?.id === 'string' && Number.isFinite(one.at))
    .filter((one) => now - one.at < FORGET_AFTER_MS)
    .sort((a, b) => b.at - a.at);
}

/**
 * Both sides' tombstones, keeping the earliest time for anything in both.
 *
 * Earliest rather than latest, because the question a tombstone answers is
 * *was this deleted before that copy was written*, and the first machine to
 * delete it is the one that answers it. Taking the later time would let a
 * stale copy of the highlight slip back in between the two.
 */
export function mergeGone(
  mine: readonly Gone[],
  theirs: readonly Gone[],
  now = Date.now(),
): Gone[] {
  const all = new Map<string, number>();
  for (const one of [...mine, ...theirs]) {
    if (typeof one?.id !== 'string' || !Number.isFinite(one.at)) continue;
    const already = all.get(one.id);
    all.set(one.id, already === undefined ? one.at : Math.min(already, one.at));
  }
  return prune(
    [...all].map(([id, at]) => ({ id, at })),
    now,
  );
}

/** When this was deleted, if anybody still remembers it being deleted. */
export function deletedAt(gone: readonly Gone[], id: string): number | undefined {
  return gone.find((one) => one.id === id)?.at;
}

/** Whether a tombstone beats a copy of the highlight that claims this time. */
export function outlives(deleted: number | undefined, updatedAt: number): boolean {
  return deleted !== undefined && deleted > updatedAt;
}
