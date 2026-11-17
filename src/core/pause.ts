import { storage } from '#imports';

/**
 * Turning Kona off without taking anything back.
 *
 * **Why this exists.** Selecting text is not a request to highlight it. People
 * select to read, to copy, to search, to keep their place, and a bar that
 * appears every time is a product interrupting somebody who was not talking to
 * it. 2b already settled the equivalent for the panel, that one which is
 * always open is one that gets turned off for good, and the same is true of a
 * toolbar that cannot be made to stop.
 *
 * **Why it is one fact and not a list of sites.** 3e gave up the per-site soft
 * switch, and the reason was specific rather than general: `local:disabled-sites`
 * was a *second list* of sites beside the browser's own, and the two could
 * disagree. Revoke a site on the browser's extensions screen and Kona's copy
 * never heard, so the popup went on offering a switch for a site it could no
 * longer touch.
 *
 * One boolean has nothing to disagree with. *Allowed* stays the browser's
 * word, exactly as 3e left it, and this says only whether Kona is listening
 * on the sites it is already allowed on. The decision is untouched.
 *
 * **What off means.** Kona draws nothing and offers nothing: no bar on a
 * selection, no resting mark, no paint. It is `enabled: false` in the
 * controller, which already clears the view and keeps every highlight saved,
 * so turning it back on puts the page back exactly as it was. Nothing is
 * deleted, by Kona or by this, which is the same rule the cap follows (7).
 */
const KEY = 'local:paused';

export async function loadPaused(): Promise<boolean> {
  return (await storage.getItem<boolean>(KEY)) === true;
}

export async function savePaused(paused: boolean): Promise<void> {
  await storage.setItem(KEY, paused);
}

export function watchPaused(onChange: (paused: boolean) => void): () => void {
  return storage.watch<boolean>(KEY, (paused) => onChange(paused === true));
}
