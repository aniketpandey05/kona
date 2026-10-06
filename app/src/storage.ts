import type { Mark } from '../../src/core/types';

/**
 * The app has no chrome.storage, so highlights live in IndexedDB. One object
 * store keyed by id, with an index on when it was captured — the library is
 * almost always "newest first", and sorting in the database beats sorting a
 * few thousand records in JavaScript every time the list redraws.
 */
const DB_NAME = 'kona';
const DB_VERSION = 1;
const STORE = 'marks';

let open: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  open ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('createdAt', 'createdAt');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return open;
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE, mode);
        const request = work(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        // Report the transaction's error too: a failed write often surfaces there.
        request.onerror = () => reject(request.error);
        transaction.onerror = () => reject(transaction.error);
      }),
  );
}

export async function loadAll(): Promise<Mark[]> {
  const marks = await run<Mark[]>('readonly', (store) => store.getAll());
  return marks.sort((a, b) => b.createdAt - a.createdAt);
}

export async function save(mark: Mark): Promise<void> {
  await run('readwrite', (store) => store.put(mark));
  notify();
}

export async function remove(id: string): Promise<void> {
  await run('readwrite', (store) => store.delete(id));
  notify();
}

/** Import keeps whichever copy was edited most recently, as the extension does. */
export async function importMarks(incoming: Mark[]): Promise<{ added: number; updated: number }> {
  const existing = new Map((await loadAll()).map((mark) => [mark.id, mark]));
  let added = 0;
  let updated = 0;

  for (const mark of incoming) {
    const current = existing.get(mark.id);
    if (!current) {
      await run('readwrite', (store) => store.put(mark));
      added++;
    } else if (mark.updatedAt > current.updatedAt) {
      await run('readwrite', (store) => store.put(mark));
      updated++;
    }
  }
  if (added || updated) notify();
  return { added, updated };
}

// The share route saves and then hands over to the library, which is a separate
// render; let anything listening know the store moved underneath it.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export function watch(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}
