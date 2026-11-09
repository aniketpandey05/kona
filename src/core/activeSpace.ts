import { storage } from '#imports';
import { addMark, removeMark, type Space } from './spaces';
import { loadSpaces, saveSpace } from './store';
import type { Person } from './people';

/**
 * The one space you are working in now.
 *
 * While a space is active a new highlight goes into it as well as into the
 * library, with nothing to file by hand. Researching one topic means marking
 * twenty things across five pages, and filing each one separately is twenty
 * interruptions in the middle of reading; setting the topic once is one.
 *
 * One at a time, and none is normal -- highlights then go to the library only.
 *
 * **It is per device, and it does not sync.** The id lives under `local:`
 * beside the palette and the disabled sites, not in the space itself. Two
 * reasons. It is a statement about what you are doing at this desk right now,
 * and a laptop and a phone can honestly be in the middle of different things;
 * and it is not a property of the space, so putting it there would mean a
 * space travelling between people carried one person's attention with it, and
 * opening a shared space would quietly redirect where your own highlights go.
 * That is the failure 25 calls the worst one available here.
 */
const KEY = 'local:active-space';

export async function loadActiveSpaceId(): Promise<string | null> {
  return (await storage.getItem<string>(KEY)) ?? null;
}

export async function setActiveSpaceId(id: string | null): Promise<void> {
  if (id === null) await storage.removeItem(KEY);
  else await storage.setItem(KEY, id);
}

export function watchActiveSpaceId(onChange: (id: string | null) => void): () => void {
  return storage.watch<string>(KEY, (id) => onChange(id ?? null));
}

/**
 * The active space itself, or null when none is set.
 *
 * Also null when the id names a space that is no longer there, and the id is
 * cleared when that happens: a deleted space must not leave highlights being
 * filed into nothing, and it must not leave the panel saying they are going
 * somewhere they are not (2e).
 */
export async function loadActiveSpace(): Promise<Space | null> {
  const id = await loadActiveSpaceId();
  if (!id) return null;
  const space = (await loadSpaces()).find((each) => each.id === id);
  if (!space) {
    await setActiveSpaceId(null);
    return null;
  }
  return space;
}

/**
 * Put a new highlight into the active space as well as the library.
 *
 * Returns the space it went to, so whatever called this can say so -- which is
 * 2e's requirement, and the only reason this returns anything.
 */
export async function fileIntoActiveSpace(markId: string, me: Person | null = null): Promise<Space | null> {
  const space = await loadActiveSpace();
  if (!space) return null;
  const next = addMark(space, markId, me);
  if (next === space) return space;
  await saveSpace(next);
  return next;
}

/**
 * 2g's escape hatch: you marked something while a space was active and it does
 * not belong there. Taking it out leaves it in the library, which is where
 * every highlight always is.
 *
 * Deliberately not a second gesture at the moment of marking. Kona runs on
 * Safari on an iPhone, where there is no right-click and no modifier key, so a
 * design resting on one works on a laptop and not on a phone.
 */
export async function keepOutOfActiveSpace(markId: string): Promise<Space | null> {
  const space = await loadActiveSpace();
  if (!space) return null;
  const next = removeMark(space, markId);
  if (next === space) return space;
  await saveSpace(next);
  return next;
}
