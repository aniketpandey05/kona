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
