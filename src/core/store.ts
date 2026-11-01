import { browser, storage } from '#imports';
import type { Identity } from './backup';
import { makeKeypair } from './identity';
import { makePerson, type Person } from './people';
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

/**
 * Spaces out of a backup, added where this computer has not got one already.
 *
 * Adding rather than overwriting, for the same reason the merge adds rather
 * than overwrites: a restore is somebody recovering work, and the one
 * unrecoverable mistake would be writing over a space they have been using
 * here with an older copy of it.
 */
export function importSpaces(
  incoming: readonly Space[],
): Promise<{ added: number; kept: number }> {
  return serialized(async () => {
    const spaces = (await storage.getItem<Space[]>(SPACES_KEY)) ?? [];
    const have = new Set(spaces.map((space) => space.id));
    const fresh = incoming.filter((space) => !have.has(space.id));
    if (fresh.length > 0) await storage.setItem(SPACES_KEY, [...spaces, ...fresh]);
    return { added: fresh.length, kept: incoming.length - fresh.length };
  });
}

/** Keeps another tab's view of the spaces in step with this one. */
export function watchSpaces(onChange: (spaces: Space[]) => void): () => void {
  return storage.watch<Space[]>(SPACES_KEY, (spaces) =>
    onChange([...(spaces ?? [])].sort((a, b) => b.updatedAt - a.updatedAt)),
  );
}

// ---- who you are ----

// One record, and it never leaves this computer on its own: it travels only
// inside a space you choose to hand over. There is nothing to sign in to.
const ME_KEY = 'local:me' as const;
/**
 * The private half of your signing key, kept apart from the person record so
 * that there is no path by which it could be spread into a space and handed
 * to somebody. Only the public half is ever part of a `Person`.
 */
const SIGNING_KEY = 'local:signing-key' as const;

export async function loadSigningKey(): Promise<JsonWebKey | null> {
  return (await storage.getItem<JsonWebKey>(SIGNING_KEY)) ?? null;
}

export async function loadMe(): Promise<Person | null> {
  const me = await storage.getItem<Person>(ME_KEY);
  return me && typeof me.id === 'string' && typeof me.name === 'string' ? me : null;
}

/**
 * Setting or changing your name. The id is made once and kept, so a space you
 * sent out still recognises your work when it comes back — renaming yourself
 * relabels it rather than splitting it in two.
 */
export async function saveMe(name: string): Promise<Person | null> {
  const current = await loadMe();
  if (!name.trim()) {
    // Clearing your name is starting over, so the key goes with it rather than
    // being paired with whatever id you are given next.
    await storage.removeItem(ME_KEY);
    await storage.removeItem(SIGNING_KEY);
    return null;
  }
  const me = { ...makePerson(name, current?.id), ...(current?.key ? { key: current.key } : {}) };
  await storage.setItem(ME_KEY, me);
  return withKey(me);
}

/**
 * You, with a key, making one if this is the first time.
 *
 * Separate from `saveMe` because somebody who named themselves before any of
 * this existed should get a key without having to retype their name, and
 * because making one is a trip through WebCrypto that nothing else should
 * have to wait for.
 */
export async function ensureSigningKey(): Promise<Person | null> {
  return withKey(await loadMe());
}

async function withKey(me: Person | null): Promise<Person | null> {
  if (!me || me.key) return me;
  const pair = await makeKeypair();
  if (!pair) return me;
  const keyed: Person = { ...me, key: pair.publicKey };
  await storage.setItem(SIGNING_KEY, pair.privateKey);
  await storage.setItem(ME_KEY, keyed);
  return keyed;
}

/**
 * You, as a backup should carry you: the person and the key that signs as
 * them. Only ever written into a file you are making for yourself.
 */
export async function identityForBackup(): Promise<Identity | null> {
  const me = await loadMe();
  if (!me) return null;
  const signingKey = await loadSigningKey();
  return { me, ...(signingKey ? { signingKey } : {}) };
}

/**
 * Who you were, taken from a backup — but only onto a computer that does not
 * already know who it belongs to. Nothing here silently replaces an identity
 * somebody is using, and a restore onto a machine already in use simply keeps
 * the one it has.
 */
export async function restoreIdentity(identity: Identity): Promise<Person | null> {
  if (await loadMe()) return null;
  await storage.setItem(ME_KEY, identity.me);
  if (identity.signingKey) await storage.setItem(SIGNING_KEY, identity.signingKey);
  return identity.me;
}

export function watchMe(onChange: (me: Person | null) => void): () => void {
  return storage.watch<Person>(ME_KEY, (me) => onChange(me ?? null));
}
