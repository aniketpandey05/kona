/**
 * Holding on to the browser's install offer (24).
 *
 * Chrome fires `beforeinstallprompt` **once, early, at the page**, and left
 * alone it shows its own prompt whenever it feels like it. Holding the event
 * and firing it later from a control of your own is the documented trick, and
 * the whole of what makes *Install Kona* possible in the account menu.
 *
 * It is caught here, at the module, rather than inside the menu, and that is
 * the point of the file: the menu mounts when somebody opens it, which is long
 * after the event has been and gone. A listener that starts then never hears
 * anything, so the offer would never appear. Caught at import, it is waiting
 * whenever the menu asks.
 *
 * Safari fires nothing and has no API, so there it is told rather than
 * offered, which is the menu's business and not this file's.
 */
type InstallEvent = Event & { prompt(): Promise<void> };

let held: InstallEvent | null = null;
const waiting = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    held = event as InstallEvent;
    waiting.forEach((tell) => tell());
  });
  // Installed, by this offer or by the browser's own menu: there is nothing
  // left to offer, and an offer that outlived the thing is worse than none.
  window.addEventListener('appinstalled', () => {
    held = null;
    waiting.forEach((tell) => tell());
  });
}

/** Whether the browser has said Kona can be installed, and not since been. */
export function canInstall(): boolean {
  return held !== null;
}

/** Fire the held prompt. Does nothing where there is none, which is most places. */
export async function install(): Promise<void> {
  const offer = held;
  if (!offer) return;
  await offer.prompt();
}

/** Told when the answer to `canInstall` changes. */
export function watchInstall(onChange: () => void): () => void {
  waiting.add(onChange);
  return () => waiting.delete(onChange);
}

/** Already in its own window: Chrome and Edge say so one way, Safari another. */
export function inOwnWindow(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

/** Safari, which fires no event and has to be told how instead. */
export function isApple(): boolean {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
}
