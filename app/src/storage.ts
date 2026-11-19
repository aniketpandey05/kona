import type { Identity } from '../../src/core/backup';
import { mergeGone, prune, type Gone } from '../../src/core/gone';
import { makeKeypair } from '../../src/core/identity';
import { makePerson, type Person } from '../../src/core/people';
import type { Space } from '../../src/core/spaces';
import { EVERYTHING, type Scope, type SyncStore } from '../../src/core/sync';
import { DEFAULT_PENS } from '../../src/core/pens';
import { paged, type AsStored, type Mark, type PenId } from '../../src/core/types';

/**
 * The app has no chrome.storage, so highlights live in IndexedDB. One object
 * store keyed by id, with an index on when it was captured, the library is
 * almost always "newest first", and sorting in the database beats sorting a
 * few thousand records in JavaScript every time the list redraws.
 *
 * Spaces are a second store rather than rows in the first: there are a handful
 * of them against thousands of highlights, they are read all at once, and
 * keeping them apart means a space can never be mistaken for a highlight by
 * anything reading the library.
 */
const DB_NAME = 'kona';
const DB_VERSION = 2;
const MARKS = 'marks';
const SPACES = 'spaces';

let open: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  open ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      // Guarded, because this runs again on an upgrade from a version that
      // already made the first store, and creating it twice throws.
      if (!database.objectStoreNames.contains(MARKS)) {
        const store = database.createObjectStore(MARKS, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
      if (!database.objectStoreNames.contains(SPACES)) {
        database.createObjectStore(SPACES, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return open;
}

function run<T>(
  name: string,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return db().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(name, mode);
        const request = work(transaction.objectStore(name));
        request.onsuccess = () => resolve(request.result);
        // Report the transaction's error too: a failed write often surfaces there.
        request.onerror = () => reject(request.error);
        transaction.onerror = () => reject(transaction.error);
      }),
  );
}

export async function loadAll(): Promise<Mark[]> {
  // The web library's door. A highlight saved here before the rename, or one
  // handed over by an extension the store has not finished reviewing, arrives
  // wearing `conversationId`; `paged` is where it stops being that.
  const marks = await run<AsStored[]>(MARKS, 'readonly', (store) => store.getAll());
  return marks.map(paged).sort((a, b) => b.createdAt - a.createdAt);
}

export async function save(mark: Mark): Promise<void> {
  // Both names on the way out as well, so this library and an older extension
  // reading the same backup file still agree about what a page is.
  await run(MARKS, 'readwrite', (store) => store.put(paged(mark)));
  notify();
}

export async function remove(id: string): Promise<void> {
  await run(MARKS, 'readwrite', (store) => store.delete(id));
  // Written down, or the next folder sync hands it straight back (gone.ts).
  rememberGone(id);
  notify();
}

const GONE = 'kona:gone';

/** What this device has deleted, forgetting what is too old to matter. */
export function loadGone(now = Date.now()): Gone[] {
  try {
    const raw = localStorage.getItem(GONE);
    return prune(raw ? (JSON.parse(raw) as Gone[]) : [], now);
  } catch {
    // An unreadable list is the same as none: the sync falls back to handing
    // things back, which is where it was before any of this.
    return [];
  }
}

export function rememberGone(id: string, at = Date.now()): void {
  try {
    localStorage.setItem(GONE, JSON.stringify(mergeGone(loadGone(at), [{ id, at }], at)));
  } catch {
    // No room left. The highlight is still deleted here; it may come back on
    // the next sync, which is survivable and not worth failing the delete for.
  }
}

/** Import keeps whichever copy was edited most recently, as the extension does. */
export async function importMarks(incoming: Mark[]): Promise<{ added: number; updated: number }> {
  const existing = new Map((await loadAll()).map((mark) => [mark.id, mark]));
  let added = 0;
  let updated = 0;

  for (const mark of incoming) {
    const current = existing.get(mark.id);
    if (!current) {
      await run(MARKS, 'readwrite', (store) => store.put(mark));
      added++;
    } else if (mark.updatedAt > current.updatedAt) {
      await run(MARKS, 'readwrite', (store) => store.put(mark));
      updated++;
    }
  }
  if (added || updated) notify();
  return { added, updated };
}

export async function loadSpaces(): Promise<Space[]> {
  const spaces = await run<Space[]>(SPACES, 'readonly', (store) => store.getAll());
  return spaces.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveSpace(space: Space): Promise<void> {
  await run(SPACES, 'readwrite', (store) => store.put(space));
  notify();
}

export async function removeSpace(id: string): Promise<void> {
  await run(SPACES, 'readwrite', (store) => store.delete(id));
  notify();
}

/**
 * Spaces out of a backup, added where this phone has not got one already.
 * Adding rather than overwriting, for the same reason the extension does: a
 * restore is somebody recovering work, and burying a space they have been
 * using under an older copy is the one mistake there is no way back from.
 */
export async function importSpaces(
  incoming: readonly Space[],
): Promise<{ added: number; kept: number }> {
  const have = new Set((await loadSpaces()).map((space) => space.id));
  let added = 0;
  for (const space of incoming) {
    if (have.has(space.id)) continue;
    await run(SPACES, 'readwrite', (store) => store.put(space));
    added++;
  }
  if (added) notify();
  return { added, kept: incoming.length - added };
}

/*
 * Who you are. Small and read on every render, so localStorage rather than a
 * database round trip, and the private key is kept under its own name, apart
 * from the person record, so nothing that walks a space can reach it.
 */
const ME = 'kona:me';
const SIGNING_KEY = 'kona:signing-key';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A phone with no room left still works; it just will not remember you.
  }
}

/**
 * The pens, on a device with no extension on it.
 *
 * Per device, like the extension's own palette, because Free does not sync
 * (12, rule 7). A phone that has never had the extension gets its own four to
 * begin with and its own additions, and that is the honest answer rather than
 * a palette that pretends to follow you.
 */
const PENS = 'kona:pens';

export function loadPens(): PenId[] {
  const kept = read<PenId[]>(PENS);
  return Array.isArray(kept) && kept.length > 0 ? kept : [...DEFAULT_PENS];
}

export function savePens(pens: readonly PenId[]): void {
  write(PENS, [...pens]);
  notify();
}

export function loadMe(): Person | null {
  const me = read<Person>(ME);
  return me && typeof me.id === 'string' && typeof me.name === 'string' ? me : null;
}

export function loadSigningKey(): JsonWebKey | null {
  return read<JsonWebKey>(SIGNING_KEY);
}

/**
 * Setting or changing your name. The id is kept across a rename, so a space
 * you sent out still recognises your work when it comes back.
 */
export async function saveMe(name: string): Promise<Person | null> {
  const current = loadMe();
  if (!name.trim()) {
    // Clearing your name is starting over, so the key goes with it rather
    // than being paired with whatever id you are given next.
    localStorage.removeItem(ME);
    localStorage.removeItem(SIGNING_KEY);
    notify();
    return null;
  }
  const me = { ...makePerson(name, current?.id), ...(current?.key ? { key: current.key } : {}) };
  write(ME, me);
  const keyed = await withKey(me);
  notify();
  return keyed;
}

/** You, with a key, making one the first time anybody asks. */
export async function ensureSigningKey(): Promise<Person | null> {
  const me = loadMe();
  return me ? withKey(me) : null;
}

async function withKey(me: Person): Promise<Person> {
  if (me.key) return me;
  const pair = await makeKeypair();
  if (!pair) return me;
  const keyed: Person = { ...me, key: pair.publicKey };
  write(SIGNING_KEY, pair.privateKey);
  write(ME, keyed);
  return keyed;
}

/** You, as a backup should carry you. Only ever written into a file for you. */
export function identityForBackup(): Identity | null {
  const me = loadMe();
  if (!me) return null;
  const signingKey = loadSigningKey();
  return { me, ...(signingKey ? { signingKey } : {}) };
}

/** Who you were, taken only onto a phone that does not already know. */
export function restoreIdentity(identity: Identity): Person | null {
  if (loadMe()) return null;
  write(ME, identity.me);
  if (identity.signingKey) write(SIGNING_KEY, identity.signingKey);
  notify();
  return identity.me;
}

// The share route saves and then hands over to the library, which is a separate
// render; let anything listening know the store moved underneath it.
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((listener) => listener());

/**
 * The same library, open in another tab.
 *
 * This set only ever reached the page it was declared on, so a second tab of
 * the library held a copy of the store from whenever it was opened and never
 * heard about anything after that: a name set in one tab still read *Your name
 * and your backups* in the other, and a space made in one never appeared in
 * the other. The same store, two tabs, two answers.
 *
 * Nothing the browser gives you covers both halves on its own. Highlights and
 * spaces are in IndexedDB, which fires no cross-tab event at all, so the
 * channel is what carries those. Identity is in localStorage, which fires
 * `storage` in the *other* tabs natively, and that is the half that still
 * works where a channel cannot be made. Neither fires in the tab that did the
 * writing, so this cannot loop.
 */
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('kona-store') : null;
if (channel) channel.onmessage = tell;
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    // A key of null is the whole store being cleared, which is also news.
    if (event.key === null || event.key.startsWith('kona')) tell();
  });
}

const notify = () => {
  tell();
  // Posting can throw where the channel has been closed by the page going
  // away. Telling this tab is the part that must not be lost.
  try {
    channel?.postMessage('changed');
  } catch {
    // Another tab will catch up on its next read.
  }
};

export function watch(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/**
 * The library, as the sync engine is allowed to see it. The phone has no
 * folder picker, Chrome on Android does not offer one, so this is only ever
 * driven by hand, over a file out of a folder the phone already syncs.
 */
export const syncStore: SyncStore = {
  marks: () => loadAll(),
  spaces: () => loadSpaces(),
  deleted: async () => loadGone(),
  removeMark: async (id, at) => {
    await run(MARKS, 'readwrite', (store) => store.delete(id));
    rememberGone(id, at);
    notify();
  },
  saveMark: (mark) => save(mark),
  saveSpace: (space) => saveSpace(space),
};

const SCOPE = 'kona:sync-scope';

export function loadScope(): Scope {
  const scope = read<Scope>(SCOPE);
  return scope?.kind === 'spaces' && Array.isArray(scope.origins) ? scope : EVERYTHING;
}

export function saveScope(scope: Scope): void {
  write(SCOPE, scope);
}
