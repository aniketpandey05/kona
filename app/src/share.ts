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
  const snapshot = collapse(quoted);

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

function firstUrl(text: string): string | undefined {
  return /https?:\/\/\S+/.exec(text)?.[0];
}

const collapse = (text: string) => text.replace(/\s+/g, ' ').trim();
