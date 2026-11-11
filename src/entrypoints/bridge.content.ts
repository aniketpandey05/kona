import {
  BRIDGE,
  bridgeMatches,
  fromThisPage,
  isEnvelope,
  type BridgeReply,
  type BridgeRequest,
} from '../core/bridge';
import {
  loadAllMarks,
  loadSpaces,
  removeMark,
  removeSpace,
  saveSpace,
  upsertMark,
  watchAllMarks,
} from '../core/store';

/**
 * The extension's half of the bridge (3c, 3i).
 *
 * It runs only inside Kona's own page, where it can see both the extension's
 * storage and the page's `window`, and it hands the one to the other. That is
 * the whole job. It holds no logic about what a highlight is -- if it ever
 * needs to, something has been put on the wrong side of this line.
 *
 * `all_frames` is left off on purpose, so this is the top-level document or
 * nothing. A page that frames Kona gets no bridge inside the frame.
 */
export default defineContentScript({
  matches: bridgeMatches(import.meta.env.DEV),
  allFrames: false,
  runAt: 'document_start',
  main() {
    const reply = (id: string, body: BridgeReply) => {
      // Addressed, never '*'. A wildcard would hand the library to whatever
      // happened to be listening, and is one character shorter to write.
      window.postMessage({ source: BRIDGE, id, reply: body }, location.origin);
    };

    window.addEventListener('message', (event) => {
      // The refusals, in the order they are cheapest to make (3i). Shared with
      // the page side rather than written twice: two copies of a security
      // check are two chances for one of them to be relaxed alone.
      if (!fromThisPage(event)) return;
      if (!isEnvelope(event.data)) return;

      const { id, request } = event.data;
      void handle(request)
        .then((body) => reply(id, body))
        // The page is waiting on an id; a thrown error would leave it waiting
        // for good. It gets told instead.
        .catch((error: unknown) => reply(id, { kind: 'error', message: String(error) }));
    });

    // Storage changed under the page -- another tab, or the panel on an
    // article the user is reading in the next window. The page is told that
    // something moved and reads again; sending the change itself would mean
    // this file knowing what a change means.
    watchAllMarks(() => window.postMessage({ source: BRIDGE, changed: true }, location.origin));
  },
});

async function handle(request: BridgeRequest): Promise<BridgeReply> {
  switch (request.kind) {
    case 'hello':
      return { kind: 'hello', version: browser.runtime.getManifest().version };
    case 'marks':
      return { kind: 'marks', marks: await loadAllMarks() };
    case 'saveMark':
      await upsertMark(request.mark);
      return { kind: 'ok' };
    case 'removeMark':
      await removeMark(request.site, request.page, request.id);
      return { kind: 'ok' };
    case 'spaces':
      return { kind: 'spaces', spaces: await loadSpaces() };
    case 'saveSpace':
      await saveSpace(request.space);
      return { kind: 'ok' };
    case 'removeSpace':
      await removeSpace(request.id);
      return { kind: 'ok' };
    default:
      // A newer page talking to an older extension. Saying so is better than
      // silence, which is indistinguishable from the extension not being here.
      return { kind: 'error', message: `Unknown request: ${(request as { kind: string }).kind}` };
  }
}
