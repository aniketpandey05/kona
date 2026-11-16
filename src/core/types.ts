import type { TextQuote } from './quote';

/** 'web' is any ordinary page the user switched on from the toolbar. */
export type SiteId = 'chatgpt' | 'claude' | 'gemini' | 'web';
export type Role = 'user' | 'assistant';
/** The four Kona starts with. A highlight may carry one of your own instead. */
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

/**
 * The colour a highlight was made with (12).
 *
 * One of the four names, or a colour of your own as `#rrggbb@NN`. A value
 * rather than a reference to a palette slot, because a highlight keeps the
 * colour it was made with: swapping a pen in the case does not change the
 * marks already on the paper, so the mark has to carry the colour itself.
 * `src/core/pens.ts` reads it.
 */
export type PenId = string;

/** Several independent clues for finding a message again; any one of them may break. */
export interface MessageAnchor {
  messageId?: string;
  role: Role;
  index: number;
  fingerprint: string;
}

export interface Mark {
  id: string;
  site: SiteId;
  conversationId: string;
  conversationTitle: string;
  url: string;
  /**
   * Where in a conversation this was marked. Absent for anything captured
   * outside a page we were running in, a quote shared from a phone has no
   * message to anchor to, only its own text.
   */
  message?: MessageAnchor;
  /** The highlighted passage; absent when the whole message is marked. */
  quote?: TextQuote;
  label: string;
  color: PenId;
  /** Optional note the user wrote about the highlight. */
  note?: string;
  /** Position in the user's list for this chat. New highlights go last; the user can reorder. */
  order?: number;
  /** Free-form labels, for pulling related highlights together across chats and sites. */
  tags?: string[];
  /** Copy of the marked text, kept even if the chat is edited or deleted. */
  snapshot: string;
  /**
   * When this was put out of the way, if it has been (10).
   *
   * Archived is a filter on the library's default view and nothing else: the
   * highlight is still searchable, still painted on its page, still in the
   * panel for that page, and still in every space it was added to. Absent
   * means not archived, so every highlight ever saved is correct without a
   * migration.
   */
  archivedAt?: number;
  createdAt: number;
  updatedAt: number;
}
