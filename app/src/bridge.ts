import {
  BRIDGE,
  fromThisPage,
  isChanged,
  isReply,
  type BridgeReply,
  type BridgeRequest,
} from '../../src/core/bridge';
import type { Space } from '../../src/core/spaces';
import type { Mark, PenId, SiteId } from '../../src/core/types';

/**
 * The page's half of the bridge (3c, 3i).
 *
 * The web app is where your highlights live, and on Free there is no sync --
 * so on the machine where the extension is installed, this is how the library
 * sees what was marked. It is the price of there being one library instead of
 * two that can come to disagree.
 *
 * Nothing here assumes the extension is present. Most people opening the web
 * app will not have it, and the only honest answer then is that there is
 * nothing on this machine to read.
 */

/**
 * How long to wait for the extension to answer `hello`.
 *
 * Only the first call waits this out. If the extension is there the content
 * script is already listening before the page's own scripts run, so the reply
 * is immediate; this is the budget for deciding it is *not* there, and a
 * person staring at a library waiting to find out is the thing being bought.
 */
const HELLO_MS = 300;

let nextId = 0;

function ask(request: BridgeRequest, timeoutMs: number): Promise<BridgeReply> {
  return new Promise((resolve, reject) => {
    const id = `${Date.now().toString(36)}-${nextId++}`;
    const timer = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error('The extension did not answer'));
    }, timeoutMs);

    function onMessage(event: MessageEvent) {
      // The same refusals the other side makes, from the same function.
      if (!fromThisPage(event)) return;
      // An id the page never issued, or one already answered, is dropped.
      if (!isReply(event.data) || event.data.id !== id) return;
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(event.data.reply);
    }

    window.addEventListener('message', onMessage);
    window.postMessage({ source: BRIDGE, id, request }, location.origin);
  });
}

async function expect<K extends BridgeReply['kind']>(
  request: BridgeRequest,
  kind: K,
  timeoutMs = 4000,
): Promise<Extract<BridgeReply, { kind: K }>> {
  const reply = await ask(request, timeoutMs);
  if (reply.kind === 'error') throw new Error(reply.message);
  if (reply.kind !== kind) throw new Error(`Expected ${kind}, got ${reply.kind}`);
  return reply as Extract<BridgeReply, { kind: K }>;
}

/**
 * Is the extension installed on this machine, and listening?
 *
 * Answers false rather than throwing, because "no extension here" is the
 * ordinary case and not a failure: it is what everyone opening the web app on
 * their phone, or on a machine they have never installed Kona on, will get.
 */
export async function extensionPresent(): Promise<boolean> {
  try {
    await expect({ kind: 'hello' }, 'hello', HELLO_MS);
    return true;
  } catch {
    return false;
  }
}

export async function bridgeVersion(): Promise<string | null> {
  try {
    return (await expect({ kind: 'hello' }, 'hello', HELLO_MS)).version;
  } catch {
    return null;
  }
}

export async function loadExtensionMarks(): Promise<Mark[]> {
  return (await expect({ kind: 'marks' }, 'marks')).marks;
}

export async function saveExtensionMark(mark: Mark): Promise<void> {
  await expect({ kind: 'saveMark', mark }, 'ok');
}

export async function removeExtensionMark(site: SiteId, page: string, id: string): Promise<void> {
  await expect({ kind: 'removeMark', site, page, id }, 'ok');
}

export async function loadExtensionSpaces(): Promise<Space[]> {
  return (await expect({ kind: 'spaces' }, 'spaces')).spaces;
}

export async function saveExtensionSpace(space: Space): Promise<void> {
  await expect({ kind: 'saveSpace', space }, 'ok');
}

export async function removeExtensionSpace(id: string): Promise<void> {
  await expect({ kind: 'removeSpace', id }, 'ok');
}

/**
 * The pens in the case on this machine.
 *
 * The extension's palette, because the bar in the page reads that one: a Pens
 * screen editing a second list would show you pens you could not mark with.
 */
export async function loadExtensionPens(): Promise<PenId[]> {
  return (await expect({ kind: 'pens' }, 'pens')).pens;
}

export async function saveExtensionPens(pens: readonly PenId[]): Promise<void> {
  await expect({ kind: 'savePens', pens: [...pens] }, 'ok');
}

/** The bytes of one kept picture, or null where the site would not let Kona copy it (18). */
export async function loadExtensionImage(markId: string): Promise<string | null> {
  return (await expect({ kind: 'image', markId }, 'image')).data;
}

/**
 * Something changed in the extension's storage: another tab, or the panel on
 * an article being read in the next window. What changed is not sent, only
 * that something did, so the page reads again rather than trying to apply a
 * diff it did not make.
 */
export function watchExtension(onChange: () => void): () => void {
  const onMessage = (event: MessageEvent) => {
    if (!fromThisPage(event)) return;
    if (isChanged(event.data)) onChange();
  };
  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
}
