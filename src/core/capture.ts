import { pageId } from './pageUrl';
import type { Mark, PenId } from './types';

/**
 * Keeping a passage from a page Kona cannot run inside (16).
 *
 * The browser's own PDF viewer is privileged in both engines: a content script
 * cannot run there, so nothing of Kona can paint a mark on a PDF or land you
 * back on it. That was nearly the end of PDFs, and the way through is a
 * documented exception rather than a workaround: **a context menu item can
 * read the selection on a privileged page**. A right-click hands over the
 * selected text and the page's URL, which is everything a highlight is made
 * of.
 *
 * So on a PDF: select, right-click, keep. The passage and the source are
 * saved, and the landing is not. That is not a new kind of object, which is
 * the part worth noticing: it is exactly the state decision 13 already
 * defines, a highlight that has its quote and has lost its landing. PDFs
 * arrive in a state the product already understands.
 *
 * Two limits, stated rather than discovered:
 *
 * - **Desktop only.** A context menu needs a right-click and a phone has not
 *   got one. The inverse of 2g, which chose a tap over a modifier key for the
 *   same reason.
 * - **No page number.** A text selection does not carry one, so the source is
 *   the PDF, not a place inside it.
 *
 * Reading a PDF *inside* Kona, in a viewer Kona ships, works normally. That is
 * not the default and it is not nothing.
 */

/** What the browser hands over when a context menu item is used. */
export interface Captured {
  /** The selected text, exactly as the browser reported it. */
  text: string;
  /** The page it was selected on. */
  url: string;
  /** The tab's title, where there is one. A PDF usually has the filename. */
  title?: string;
  color: PenId;
  now?: number;
}

/** A tab title worth keeping, or the file's own name, or the host. */
export function titleFor(url: string, title?: string): string {
  const trimmed = title?.trim();
  if (trimmed) return trimmed;
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split('/').filter(Boolean).pop();
    return last ? decodeURIComponent(last) : parsed.hostname;
  } catch {
    return url;
  }
}

/** Whether a URL is a PDF, as far as its address can say. */
export function looksLikePdf(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith('.pdf');
  } catch {
    return false;
  }
}

/**
 * A highlight made from a selection the browser handed over, with no page of
 * Kona's own behind it.
 *
 * `landing: 'lost'` from the start, and it is set here rather than worked out
 * later because this is the one case where Kona *knows*: there is no content
 * script, so there was never a chance to find the passage again, and saying so
 * on day one is the honest version of 13 rather than a guess made afterwards.
 *
 * No `quote` and no `message`: both describe where a passage sits inside a
 * document Kona could read, and it could not read this one.
 */
export function captureSelection({ text, url, title, color, now = Date.now() }: Captured): Mark {
  const snapshot = text.replace(/\s+/g, ' ').trim();
  return {
    id: crypto.randomUUID(),
    site: 'web',
    conversationId: pageId(new URL(url)),
    conversationTitle: titleFor(url, title),
    url,
    label: '',
    color,
    snapshot,
    landing: 'lost',
    createdAt: now,
    updatedAt: now,
  } as Mark;
}
