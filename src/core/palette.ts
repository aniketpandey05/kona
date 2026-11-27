import { storage } from '#imports';
import { DEFAULT_PENS, type PenId } from './pens';

/**
 * The pens you have, kept on the device.
 *
 * **Free, and therefore per device** (DEFINITIONS, Palette), because Free does
 * not sync. The list is only ever the pens in the case: what you have already
 * marked with is in your library and is not affected by anything here, which
 * is rule 4 of decision 12 and the reason this can be a plain list of ids.
 */
const KEY = 'local:pens';

export async function loadPalette(): Promise<PenId[]> {
  const kept = await storage.getItem<PenId[]>(KEY);
  return Array.isArray(kept) && kept.length > 0 ? kept : [...DEFAULT_PENS];
}

export async function savePalette(pens: readonly PenId[]): Promise<void> {
  await storage.setItem(KEY, [...pens]);
}

/** Add a pen you made. Already there means nothing happens, not a duplicate. */
export async function addPen(id: PenId): Promise<PenId[]> {
  const pens = await loadPalette();
  if (pens.includes(id)) return pens;
  const next = [...pens, id];
  await savePalette(next);
  return next;
}

/**
 * Take a pen out of the case.
 *
 * It changes nothing you have already marked: those highlights keep the colour
 * they were made with, stay painted, and stay filterable. The last pen cannot
 * be removed, because a palette with nothing in it is a product that cannot
 * highlight.
 */
export async function removePen(id: PenId): Promise<PenId[]> {
  const pens = await loadPalette();
  if (pens.length <= 1) return pens;
  const next = pens.filter((each) => each !== id);
  await savePalette(next);
  return next;
}

export function watchPalette(onChange: (pens: PenId[]) => void): () => void {
  return storage.watch<PenId[]>(KEY, (pens) =>
    onChange(Array.isArray(pens) && pens.length > 0 ? pens : [...DEFAULT_PENS]),
  );
}

/**
 * The pen you marked with last.
 *
 * The bar's Note button has to make the highlight before it can open a note
 * on it, so it has to choose a colour, and it chose the first pen in the case
 * — which is yellow until somebody rearranges them. Mark nine things in blue
 * and the tenth, the one you had something to say about, still came out
 * yellow.
 *
 * Per device, like the case itself (12): Free does not sync, and which colour
 * you happen to be using is the most local thing in the product.
 */
const LAST = 'local:last-pen';

export async function loadLastPen(): Promise<PenId | null> {
  const kept = await storage.getItem<PenId>(LAST);
  return typeof kept === 'string' ? kept : null;
}

export async function rememberLastPen(id: PenId): Promise<void> {
  await storage.setItem(LAST, id);
}

export function watchLastPen(onChange: (id: PenId | null) => void): () => void {
  return storage.watch<PenId>(LAST, (id) => onChange(typeof id === 'string' ? id : null));
}

/**
 * Which pen the bar should offer, given what is in the case.
 *
 * A pen you retired is not an answer: 12 rule 4 says retiring one repaints
 * nothing, so the colour can outlive the case, and offering it here would put
 * a pen back in your hand that you deliberately put down.
 */
export function penToUse(pens: readonly PenId[], last: PenId | null): PenId {
  if (last && pens.includes(last)) return last;
  return pens[0] ?? 'yellow';
}
