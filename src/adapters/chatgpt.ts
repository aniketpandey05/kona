import type { Role } from '../core/types';
import type { MessageRef, SiteAdapter } from './types';

/**
 * ChatGPT rewrites its markup regularly, and a single hard-coded selector means
 * the extension dies silently when it does. So messages are looked for several
 * ways and the first that finds any wins. Add a new way at the top when the
 * markup moves again; leave the old ones, they cost nothing.
 */
interface Strategy {
  /** Elements that are whole messages, in document order. */
  find(): Element[];
  roleOf(el: Element): Role | null;
  idOf(el: Element): string | undefined;
}

const asRole = (value: string | null): Role | null =>
  value === 'user' || value === 'assistant' ? value : null;

const STRATEGIES: Strategy[] = [
  // Long-standing: every message carries its author and id as data attributes.
  {
    find: () => [...document.querySelectorAll('[data-message-author-role]')],
    roleOf: (el) => asRole(el.getAttribute('data-message-author-role')),
    idOf: (el) => el.getAttribute('data-message-id') ?? undefined,
  },
  // Turn-based markup: an <article> per turn, carrying the author instead.
  {
    find: () => [...document.querySelectorAll('[data-turn]')],
    roleOf: (el) => asRole(el.getAttribute('data-turn')),
    idOf: (el) => el.getAttribute('data-turn-id') ?? undefined,
  },
  // Last resort: conversation turns, with the author dug out of a descendant
  // or inferred from the turn's position, since they always alternate.
  {
    find: () => [...document.querySelectorAll('[data-testid^="conversation-turn"]')],
    roleOf: (el) => {
      const inner = el.querySelector('[data-message-author-role]');
      const stated = asRole(inner?.getAttribute('data-message-author-role') ?? null);
      if (stated) return stated;
      const index = Number(/(\d+)\s*$/.exec(el.getAttribute('data-testid') ?? '')?.[1]);
      return Number.isFinite(index) ? (index % 2 === 0 ? 'user' : 'assistant') : null;
    },
    idOf: (el) =>
      el.querySelector('[data-message-id]')?.getAttribute('data-message-id') ?? undefined,
  },
];

const CONTENT = '.markdown, .whitespace-pre-wrap, [data-message-content], .prose';
const STOPPED = '[data-testid="stop-button"], button[aria-label*="stop" i]';
/** Matches /c/<id> and project chats like /g/g-p-<project>/c/<id>. */
const CONVERSATION_PATH = /\/c\/([\w-]+)/;

export const chatgptAdapter: SiteAdapter = {
  site: 'chatgpt',

  getConversationId(url) {
    const known = url.pathname.match(CONVERSATION_PATH)?.[1];
    if (known) return known;
    // The path shape changed, or this is some other chat route. Key off the
    // path itself rather than giving up, which would hide the extension
    // completely; highlights still group per page and still come back.
    const path = url.pathname.replace(/\/+$/, '');
    return path && path !== '/' ? path : null;
  },

  getConversationTitle() {
    const title = document.title.replace(/\s*[-|]\s*ChatGPT$/i, '').trim();
    return title && title !== 'ChatGPT' ? title : 'Untitled chat';
  },

  getMessages() {
    for (const strategy of STRATEGIES) {
      const messages: MessageRef[] = [];
      for (const el of strategy.find()) {
        const role = strategy.roleOf(el);
        // System and tool messages aren't shown as chat bubbles.
        if (!role) continue;
        messages.push({ el, role, messageId: strategy.idOf(el), index: messages.length });
      }
      if (messages.length) return messages;
    }
    return [];
  },

  getContentRoot(message) {
    return message.el.querySelector(CONTENT) ?? message.el;
  },

  isStreaming(message) {
    // While a reply streams the composer shows a stop button, and only the
    // newest reply can be the one streaming.
    if (!document.querySelector(STOPPED)) return false;
    const replies = this.getMessages().filter((each) => each.role === 'assistant');
    return replies[replies.length - 1]?.el === message.el;
  },
};
