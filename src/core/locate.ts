import type { MessageRef } from '../adapters/types';
import { fingerprint } from './fingerprint';
import { resolveQuote, type TextQuote } from './quote';
import { buildTextIndex, rangeFromSpan, type TextIndex } from './textIndex';
import type { Mark, MessageAnchor } from './types';

export interface ResolvedMark {
  mark: Mark;
  message: MessageRef;
  range: Range;
}

type ContentRootOf = (message: MessageRef) => Element;

// Upper bound on messages searched for a mark whose own message can't be identified.
const MAX_FALLBACK_CANDIDATES = 50;

export function describeMessage(message: MessageRef, text: string): MessageAnchor {
  return {
    messageId: message.messageId,
    role: message.role,
    index: message.index,
    fingerprint: fingerprint(text),
  };
}

export function resolveMarks(marks: Mark[], messages: MessageRef[], contentRootOf: ContentRootOf) {
  const indexes = new Map<Element, TextIndex>();
  const indexOf = (message: MessageRef) => {
    const root = contentRootOf(message);
    let index = indexes.get(root);
    if (!index) {
      index = buildTextIndex(root);
      indexes.set(root, index);
    }
    return index;
  };

  const resolved: ResolvedMark[] = [];
  const missing: Mark[] = [];
  for (const mark of marks) {
    const hit = resolveMark(mark, messages, indexOf);
    if (hit) resolved.push(hit);
    else missing.push(mark);
  }
  return { resolved, missing };
}

function resolveMark(
  mark: Mark,
  messages: MessageRef[],
  indexOf: (message: MessageRef) => TextIndex,
): ResolvedMark | null {
  const anchor = mark.message;
  // Nothing to place on this page if it was never anchored to a message.
  if (!anchor) return null;
  const byId = anchor.messageId
    ? messages.find((m) => m.messageId === anchor.messageId)
    : undefined;

  if (!mark.quote) {
    const message =
      byId ??
      messages.find((m) => m.role === anchor.role && fingerprint(indexOf(m).text) === anchor.fingerprint);
    return message ? { mark, message, range: wholeMessageRange(indexOf(message).root) } : null;
  }

  // Try the message the mark was made on first, then nearby messages by the same author
  // (covers regenerated replies and re-created message ids).
  const nearby = messages
    .filter((m) => m !== byId && m.role === anchor.role)
    .sort((a, b) => Math.abs(a.index - anchor.index) - Math.abs(b.index - anchor.index))
    .slice(0, MAX_FALLBACK_CANDIDATES);
  const candidates = byId ? [byId, ...nearby] : nearby;

  // Every candidate is asked for the passage exactly before any of them is
  // asked for something close to it. Both orders find the same highlights,
  // but this one does not pay for approximate matching on a page where the
  // passage is sitting there unchanged, which is nearly every page. It also
  // keeps an exact match on the fiftieth candidate ahead of a near miss on
  // the first, which is the right way round.
  const quote = mark.quote;
  return (
    place(mark, quote, candidates, indexOf, false) ??
    place(mark, quote, candidates, indexOf, true)
  );
}

function place(
  mark: Mark,
  quote: TextQuote,
  candidates: MessageRef[],
  indexOf: (message: MessageRef) => TextIndex,
  approximate: boolean,
): ResolvedMark | null {
  for (const message of candidates) {
    const index = indexOf(message);
    const span = resolveQuote(index.text, quote, { approximate });
    const range = span && rangeFromSpan(index, span);
    if (range) return { mark, message, range };
  }
  return null;
}

function wholeMessageRange(root: Element): Range {
  const range = root.ownerDocument.createRange();
  range.selectNodeContents(root);
  return range;
}
