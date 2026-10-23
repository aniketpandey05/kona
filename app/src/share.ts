import { cleanPassage } from '../../src/core/text';
import type { Mark } from '../../src/core/types';

/**
 * Android hands a share to the app as a GET with title, text and url. What
 * lands in each one varies by the app doing the sharing: Chrome puts the
 * selected text in `text` and the page in `url`, but plenty of apps put
 * everything in `text` and leave `url` empty, so the url is dug back out of
 * the text when it has to be.
 */
export interface SharedPayload {
  title?: string;
  text?: string;
  url?: string;
}

export function readShare(search: string): SharedPayload | null {
  const params = new URLSearchParams(search);
  const payload: SharedPayload = {
    title: params.get('title') ?? undefined,
    text: params.get('text') ?? undefined,
    url: params.get('url') ?? undefined,
  };
  if (!payload.title && !payload.text && !payload.url) return null;
  return payload;
}

/**
 * Turns a share into a Mark. There is no message anchor and no live page to
 * measure against, so the quoted text is the record: it goes in `snapshot`,
 * which is what the library shows and what Markdown export writes out.
 */
export function markFromShare(payload: SharedPayload, now = Date.now()): Mark | null {
  const text = (payload.text ?? '').trim();
  const url = payload.url?.trim() || firstUrl(text);
  // Strip a trailing url out of the quote; many apps append the link to the text.
  const quoted = url ? text.replace(url, '').trim() : text;
  const snapshot = cleanPassage(quoted);

  if (!snapshot && !url) return null;

  return {
    id: crypto.randomUUID(),
    site: 'web',
    conversationId: url ? pageKey(url) : 'unsorted',
    conversationTitle: (payload.title ?? '').trim() || (url ? hostOf(url) : 'Saved text'),
    url: url ?? '',
    quote: snapshot ? { exact: snapshot, prefix: '', suffix: '', start: 0 } : undefined,
    label: '',
    color: 'yellow',
    snapshot,
    createdAt: now,
    updatedAt: now,
  };
}

/** Group by page, the way the extension groups by conversation. */
function pageKey(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Saved text';
  }
}

/**
 * Apps rarely share a bare link. It arrives inside a sentence, wrapped in
 * quotes, or with a full stop behind it, and \S+ swallows all of that. A
 * trailing character is not harmless: Gemini answers a share id it cannot
 * resolve by redirecting to a blank chat, so a stray '.' looks exactly like
 * the highlight having gone missing.
 */
function firstUrl(text: string): string | undefined {
  const found = /https?:\/\/\S+/.exec(text)?.[0];
  return found === undefined ? undefined : trimPunctuation(found);
}

/** Sentence punctuation, and closing marks that never opened. */
function trimPunctuation(url: string): string {
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  let end = url.length;
  while (end > 0) {
    const last = url[end - 1]!;
    if (/[.,;:!?'"]/.test(last)) {
      end -= 1;
      continue;
    }
    const opener = pairs[last];
    const upTo = url.slice(0, end);
    if (opener && count(upTo, opener) < count(upTo, last)) {
      end -= 1;
      continue;
    }
    break;
  }
  return url.slice(0, end);
}

function count(text: string, char: string): number {
  return text.split(char).length - 1;
}


/**
 * How far back a bare link reaches when offering to adopt captures that have
 * none. A conversation gets read, shared from, and its link shared, all in one
 * sitting; anything older belonged to a different one, and silently attaching
 * the wrong link would be worse than asking again.
 */
export const ADOPTION_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * What to do with an incoming share. Kept apart from the component because the
 * interesting case — a link arriving on its own — is a decision, not a render.
 */
export type SharePlan =
  /** Nothing worth keeping arrived. */
  | { kind: 'nothing' }
  /** An ordinary capture: save it and open it for a note. */
  | { kind: 'keep'; mark: Mark }
  /**
   * A link and nothing else, with recent captures that have none. Almost
   * always the conversation those captures came from, shared from the app's
   * own share menu rather than copied and pasted.
   */
  | { kind: 'adopt'; url: string; orphans: Mark[] };

export function planShare(
  payload: SharedPayload,
  existing: readonly Mark[],
  now = Date.now(),
): SharePlan {
  const mark = markFromShare(payload, now);
  if (!mark) return { kind: 'nothing' };
  if (mark.snapshot || !mark.url) return { kind: 'keep', mark };

  const orphans = existing.filter(
    (each) => !each.url && now - each.createdAt < ADOPTION_WINDOW_MS,
  );
  return orphans.length ? { kind: 'adopt', url: mark.url, orphans } : { kind: 'keep', mark };
}
