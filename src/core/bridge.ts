import type { Mark, SiteId } from './types';
import type { Space } from './spaces';

/**
 * The bridge between Kona's web app and the extension's storage.
 *
 * A free user has no sync, so the library on the web has to read what the
 * extension saved on the same machine. A web page cannot reach into an
 * extension's storage and an extension cannot hand it over from the outside;
 * what it *can* do is run a content script inside Kona's own page, where it
 * has both the extension's storage and the page's `window`. The two then talk
 * by `postMessage`. See 3c for why this is worth building, and 3i for the
 * rules it runs under.
 *
 * `externally_connectable` is the tidier mechanism and is Chrome's alone.
 * Firefox has never implemented it, and Kona ships on Firefox and Safari.
 *
 * This file is the protocol and nothing else, so that the page side and the
 * extension side cannot come to disagree about it -- they import the same
 * names or they do not compile.
 */

/** Marks every message as ours, so the page's own traffic is left alone. */
export const BRIDGE = 'kona-bridge' as const;

/**
 * Where Kona's web app lives.
 *
 * **There is no real domain yet.** When there is one it is changed here, and
 * only here: the manifest, the content script and the page client all read
 * this. A placeholder copied into three files is how a domain gets missed at
 * launch.
 */
export const KONA_ORIGINS = ['https://kona.example'] as const;

/** The dev server the web app runs on, allowed only in a development build. */
export const KONA_DEV_ORIGINS = ['http://localhost:5179'] as const;

/** Manifest `matches` patterns for the origins the bridge is allowed on. */
export function bridgeMatches(includeDev: boolean): string[] {
  const origins = includeDev ? [...KONA_ORIGINS, ...KONA_DEV_ORIGINS] : [...KONA_ORIGINS];
  return origins.map((origin) => `${origin}/*`);
}

/**
 * Where the web app is served.
 *
 * 3c: the library leaves the extension entirely. The extension's library page
 * was already just a browser tab at a `chrome-extension://` address, and the
 * web app is a browser tab at an ordinary one -- to the person using it there
 * is no difference at all, same gesture, same place. So moving it costs
 * nothing anybody can perceive and removes a whole second implementation.
 *
 * The app builds under the landing page and is served at `/app/`.
 */
export function konaAppUrl(path = '', dev = false): string {
  const origin = dev ? KONA_DEV_ORIGINS[0] : KONA_ORIGINS[0];
  return `${origin}/app/${path}`;
}

export type BridgeRequest =
  /** Is the extension here at all, and which version. */
  | { kind: 'hello' }
  | { kind: 'marks' }
  | { kind: 'saveMark'; mark: Mark }
  | { kind: 'removeMark'; site: SiteId; page: string; id: string }
  | { kind: 'spaces' }
  | { kind: 'saveSpace'; space: Space }
  | { kind: 'removeSpace'; id: string };

export type BridgeReply =
  | { kind: 'hello'; version: string }
  | { kind: 'marks'; marks: Mark[] }
  | { kind: 'spaces'; spaces: Space[] }
  | { kind: 'ok' }
  | { kind: 'error'; message: string };

/** What the page sends. The id comes back on the reply and nowhere else. */
export interface BridgeEnvelope {
  source: typeof BRIDGE;
  id: string;
  request: BridgeRequest;
}

/** What the extension sends back, or pushes when storage changed under it. */
export type BridgeMessage =
  | { source: typeof BRIDGE; id: string; reply: BridgeReply }
  | { source: typeof BRIDGE; changed: true };

/**
 * Did this message come from the page itself?
 *
 * Both halves ask this, in the same words, because it is the check that
 * decides whether the library is private (3i) and two copies of it could come
 * to differ.
 *
 * The two halves of it catch different things, which is why neither is enough:
 *
 * - `origin` catches a *cross-origin* sender. Somebody else's page framing
 *   Kona and posting in arrives carrying their origin, not ours.
 * - `source` catches a *same-origin* one, which origin cannot see at all.
 *   Measured: a parent posting into a framed Kona page delivers an event whose
 *   `origin` is Kona's own -- identical to `location.origin` -- and whose
 *   `source` is the parent rather than the framed window. Only the source
 *   tells those apart.
 *
 * The content script is also top-level only, so a framed Kona has no bridge in
 * it to talk to. That is the belt; this is the braces.
 */
export function fromThisPage(
  event: Pick<MessageEvent, 'source' | 'origin'>,
  self: Window = window,
): boolean {
  return event.source === self && event.origin === self.location.origin;
}

/**
 * Is this something the bridge should even look at?
 *
 * Deliberately strict and deliberately boring. Everything that arrives on a
 * `window` message listener is somebody else's data until it has been through
 * here, including things shaped exactly like ours.
 */
export function isEnvelope(data: unknown): data is BridgeEnvelope {
  if (typeof data !== 'object' || data === null) return false;
  const value = data as Partial<BridgeEnvelope>;
  return (
    value.source === BRIDGE &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.request === 'object' &&
    value.request !== null &&
    typeof (value.request as BridgeRequest).kind === 'string'
  );
}

export function isReply(
  data: unknown,
): data is { source: typeof BRIDGE; id: string; reply: BridgeReply } {
  if (typeof data !== 'object' || data === null) return false;
  const value = data as { source?: unknown; id?: unknown; reply?: unknown };
  return (
    value.source === BRIDGE &&
    typeof value.id === 'string' &&
    typeof value.reply === 'object' &&
    value.reply !== null
  );
}

export function isChanged(data: unknown): data is { source: typeof BRIDGE; changed: true } {
  if (typeof data !== 'object' || data === null) return false;
  const value = data as { source?: unknown; changed?: unknown };
  return value.source === BRIDGE && value.changed === true;
}
