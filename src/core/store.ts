import { browser, storage } from '#imports';
import type { Space } from './spaces';
import type { Mark, SiteId } from './types';

// Prototype storage: one array per conversation in chrome.storage.local.
// If the library ever gets slow, this is what moves to IndexedDB.
const MARKS_PREFIX = 'marks:';
const marksKey = (site: SiteId, conversationId: string) =>
  `local:${MARKS_PREFIX}${site}:${conversationId}` as const;

// Every write reads, changes and rewrites a whole array, so writes run one at a time;
// otherwise a quick color change right after creating a highlight could be lost.
let writeQueue: Promise<unknown> = Promise.resolve();
function serialized<T>(write: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(write, write);
  writeQueue = result.catch(() => undefined);
  return result;
}

export async function loadMarks(site: SiteId, conversationId: string): Promise<Mark[]> {
  return (await storage.getItem<Mark[]>(marksKey(site, conversationId))) ?? [];
}

/** Every highlight from every chat, for the library and its search. */
export async function loadAllMarks(): Promise<Mark[]> {
  const everything = await browser.storage.local.get(null);
  return Object.entries(everything)
    .filter(([key]) => key.startsWith(MARKS_PREFIX))
    .flatMap(([, value]) => (Array.isArray(value) ? (value as Mark[]) : []));
}

export function upsertMark(mark: Mark): Promise<void> {
  return serialized(async () => {
    const marks = await loadMarks(mark.site, mark.conversationId);
    const next = marks.some((m) => m.id === mark.id)
      ? marks.map((m) => (m.id === mark.id ? mark : m))
      : [...marks, mark];
    await storage.setItem(marksKey(mark.site, mark.conversationId), next);
  });
}

export function removeMark(site: SiteId, conversationId: string, id: string): Promise<void> {
  return serialized(async () => {
    const marks = await loadMarks(site, conversationId);
    await storage.setItem(
      marksKey(site, conversationId),
      marks.filter((m) => m.id !== id),
    );
  });
}

/** Saves the user's order for a chat in one write, so positions can't get out of step. */
export function saveOrder(site: SiteId, conversationId: string, orderedIds: string[]): Promise<void> {
  return serialized(async () => {
    const position = new Map(orderedIds.map((id, index) => [id, index]));
    const marks = await loadMarks(site, conversationId);
    await storage.setItem(
      marksKey(site, conversationId),
      marks.map((m) => ({ ...m, order: position.get(m.id) ?? m.order })),
    );
  });
}

/** Adds highlights from a backup file, keeping whichever copy was changed last. */
export function importMarks(incoming: readonly Mark[]): Promise<{ added: number; updated: number }> {
  return serialized(async () => {
    const byChat = new Map<string, Mark[]>();
    for (const mark of incoming) {
      const key = `${mark.site}\u0000${mark.conversationId}`;
      byChat.set(key, [...(byChat.get(key) ?? []), mark]);
    }

    let added = 0;
    let updated = 0;
    for (const [key, marks] of byChat) {
      const [site, conversationId] = key.split('\u0000') as [SiteId, string];
      const merged = new Map((await loadMarks(site, conversationId)).map((m) => [m.id, m]));
      for (const mark of marks) {
        const current = merged.get(mark.id);
        if (!current) {
          merged.set(mark.id, mark);
          added++;
        } else if ((mark.updatedAt ?? 0) > (current.updatedAt ?? 0)) {
          merged.set(mark.id, mark);
          updated++;
        }
      }
      await storage.setItem(marksKey(site, conversationId), [...merged.values()]);
    }
    return { added, updated };
  });
}

/** Keeps other tabs showing the same chat in sync. */
export function watchMarks(
  site: SiteId,
  conversationId: string,
  onChange: (marks: Mark[]) => void,
): () => void {
  return storage.watch<Mark[]>(marksKey(site, conversationId), (marks) => onChange(marks ?? []));
}

/** Keeps the library in sync with highlights made or deleted in any chat. */
export function watchAllMarks(onChange: () => void): () => void {
  const listener = (changes: Record<string, unknown>, area: string) => {
    if (area === 'local' && Object.keys(changes).some((key) => key.startsWith(MARKS_PREFIX))) {
      onChange();
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

// ---- spaces ----

// There are a handful of spaces, not thousands, so one array under one key is
// enough — and it keeps a space's parts from ever being written out of step.
const SPACES_KEY = 'local:spaces' as const;

export async function loadSpaces(): Promise<Space[]> {
  const spaces = (await storage.getItem<Space[]>(SPACES_KEY)) ?? [];
  return [...spaces].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Writes a space, adding it if it is new. */
export function saveSpace(space: Space): Promise<void> {
  return serialized(async () => {
    const spaces = (await storage.getItem<Space[]>(SPACES_KEY)) ?? [];
    const next = spaces.some((entry) => entry.id === space.id)
      ? spaces.map((entry) => (entry.id === space.id ? space : entry))
      : [...spaces, space];
    await storage.setItem(SPACES_KEY, next);
  });
}

export function removeSpace(id: string): Promise<void> {
  return serialized(async () => {
    const spaces = (await storage.getItem<Space[]>(SPACES_KEY)) ?? [];
    await storage.setItem(
      SPACES_KEY,
      spaces.filter((space) => space.id !== id),
    );
  });
}

/** Keeps another tab's view of the spaces in step with this one. */
export function watchSpaces(onChange: (spaces: Space[]) => void): () => void {
  return storage.watch<Space[]>(SPACES_KEY, (spaces) =>
    onChange([...(spaces ?? [])].sort((a, b) => b.updatedAt - a.updatedAt)),
  );
}
