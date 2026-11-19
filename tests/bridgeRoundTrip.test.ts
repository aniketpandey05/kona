import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  extensionPresent,
  loadExtensionMarks,
  loadExtensionPens,
  removeExtensionMark,
  saveExtensionMark,
  saveExtensionPens,
  watchExtension,
} from '../app/src/bridge';
import { BRIDGE, fromThisPage, isEnvelope, type BridgeReply } from '../src/core/bridge';
import type { Mark, PenId } from '../src/core/types';

/**
 * happy-dom delivers a `message` event whose `source` is an EventTarget rather
 * than the window that sent it, which no browser does: the spec says a
 * same-window `postMessage` arrives with `source === window`. The bridge's
 * first refusal rests on exactly that, so without this the round trip cannot
 * be exercised here at all.
 *
 * This restores the one thing the environment gets wrong. It is not a relaxed
 * check: the real `fromThisPage` still runs, and still decides. Weakening
 * the check to make a test pass would be the wrong way round: the check is the
 * reason a framed Kona cannot be made to hand over the library.
 */
beforeAll(() => {
  window.postMessage = ((data: unknown, targetOrigin?: string) => {
    const event = new MessageEvent('message', {
      data,
      origin: targetOrigin && targetOrigin !== '*' ? targetOrigin : location.origin,
    });
    // happy-dom ignores `source` in the init dict, so it is set directly.
    Object.defineProperty(event, 'source', { value: window, configurable: true });
    window.dispatchEvent(event);
  }) as typeof window.postMessage;
});

/**
 * The extension's half, standing in for the content script.
 *
 * It is the same listener `bridge.content.ts` installs: the same refusals,
 * from the same function, with the storage replaced by a list. What is being
 * checked here is that the two halves talk: that an id comes back on its own
 * reply, that a page with no extension behind it finds out rather than hanging,
 * and that a message from somewhere else is never answered.
 */
function fakeExtension(marks: Mark[] = [], pens: PenId[] = ['yellow', 'green', 'blue', 'pink']) {
  const listener = (event: MessageEvent) => {
    if (!fromThisPage(event)) return;
    if (!isEnvelope(event.data)) return;
    const { id, request } = event.data;
    let reply: BridgeReply;
    switch (request.kind) {
      case 'hello':
        reply = { kind: 'hello', version: '1.2.0' };
        break;
      case 'marks':
        reply = { kind: 'marks', marks };
        break;
      case 'saveMark':
        marks.push(request.mark);
        reply = { kind: 'ok' };
        break;
      case 'removeMark': {
        const at = marks.findIndex((each) => each.id === request.id);
        if (at >= 0) marks.splice(at, 1);
        reply = { kind: 'ok' };
        break;
      }
      case 'pens':
        reply = { kind: 'pens', pens };
        break;
      case 'savePens':
        pens.splice(0, pens.length, ...request.pens);
        reply = { kind: 'ok' };
        break;
      default:
        reply = { kind: 'error', message: 'no' };
    }
    window.postMessage({ source: BRIDGE, id, reply }, location.origin);
  };
  window.addEventListener('message', listener);
  return { marks, pens, stop: () => window.removeEventListener('message', listener) };
}

const mark = (id: string): Mark =>
  ({
    id,
    site: 'web',
    pageId: 'p1',
    pageTitle: 'How an amoeba moves',
    url: 'https://example.org/a',
    label: '',
    color: 'yellow',
    snapshot: 'An amoeba moves by extending a pseudopod',
    createdAt: 0,
    updatedAt: 0,
  }) as Mark;

let stop: (() => void) | undefined;
afterEach(() => {
  stop?.();
  stop = undefined;
});

describe('the bridge, end to end', () => {
  it('finds the extension when it is there', async () => {
    ({ stop } = fakeExtension());
    await expect(extensionPresent()).resolves.toBe(true);
  });

  it('says there is none rather than hanging, when there is none', async () => {
    // The ordinary case: everyone opening the web app on a phone, or on a
    // machine they have never installed Kona on.
    await expect(extensionPresent()).resolves.toBe(false);
  });

  it('reads what the extension has', async () => {
    ({ stop } = fakeExtension([mark('m1'), mark('m2')]));
    expect((await loadExtensionMarks()).map((each) => each.id)).toEqual(['m1', 'm2']);
  });

  it('writes back, because the library is where you organise', async () => {
    const fake = fakeExtension([]);
    stop = fake.stop;
    await saveExtensionMark(mark('m1'));
    expect(fake.marks.map((each) => each.id)).toEqual(['m1']);
    await removeExtensionMark('web', 'p1', 'm1');
    expect(fake.marks).toEqual([]);
  });

  it('reads and writes the pens, because the palette belongs to the extension', async () => {
    // Where the extension is installed, the bar in the page marks with *its*
    // palette (12, rule 7). A library editing a second list would offer pens
    // you could not then mark with, which is worse than not offering them.
    const fake = fakeExtension([]);
    stop = fake.stop;
    expect(await loadExtensionPens()).toEqual(['yellow', 'green', 'blue', 'pink']);
    await saveExtensionPens(['yellow', '#14b8a6@45']);
    expect(fake.pens).toEqual(['yellow', '#14b8a6@45']);
    expect(await loadExtensionPens()).toEqual(['yellow', '#14b8a6@45']);
  });

  it('answers each question with its own answer', async () => {
    // Two in flight at once must not collect each other's reply: the id is the
    // only thing keeping them apart.
    ({ stop } = fakeExtension([mark('m1')]));
    const [present, marks] = await Promise.all([extensionPresent(), loadExtensionMarks()]);
    expect(present).toBe(true);
    expect(marks.map((each) => each.id)).toEqual(['m1']);
  });

  it('hears that storage changed, without being told what changed', async () => {
    let told = 0;
    const unwatch = watchExtension(() => (told += 1));
    window.postMessage({ source: BRIDGE, changed: true }, location.origin);
    await new Promise((resolve) => setTimeout(resolve, 0));
    unwatch();
    window.postMessage({ source: BRIDGE, changed: true }, location.origin);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(told).toBe(1);
  });

  it('ignores a reply to an id it never issued', async () => {
    // A page cannot be made to accept an answer it did not ask for.
    ({ stop } = fakeExtension());
    window.postMessage(
      { source: BRIDGE, id: 'not-ours', reply: { kind: 'marks', marks: [mark('planted')] } },
      location.origin,
    );
    expect(await loadExtensionMarks()).toEqual([]);
  });
});
