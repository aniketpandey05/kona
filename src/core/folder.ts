/**
 * The folder itself: picking one, remembering it, reading and writing the file.
 *
 * `sync.ts` holds the part worth testing and knows nothing about browsers.
 * This is the part that cannot be tested without one, a directory the person
 * chose, a permission they granted, and a handle that has to survive the page
 * being closed.
 *
 * It is the File System Access API, which means Chrome, Edge and Brave on a
 * desktop and nothing else: Firefox and Safari have not shipped it, and Chrome
 * on Android does not offer the picker. `canPickFolder` is the honest answer to
 * that, and everywhere it says no the backup file is still the way across.
 */

import {
  EVERYTHING,
  SYNC_FILE,
  type Chosen,
  type Folder,
  type FolderSource,
  type Scope,
} from './sync';

export type { Chosen };

/** A directory handle is a live object, so it cannot live in JSON storage. */
const DB_NAME = 'kona-folder';
const STORE = 'handle';
const KEY = 'sync';
/** What the folder is allowed to carry, kept beside the handle it belongs to. */
const SCOPE_KEY = 'scope';

declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: 'read' | 'readwrite';
      startIn?: string;
    }) => Promise<FileSystemDirectoryHandle>;
  }
}

export function canPickFolder(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

function handles(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return handles().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE, mode);
        const request = work(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.onerror = () => reject(transaction.error);
      }),
  );
}

async function remember(handle: FileSystemDirectoryHandle): Promise<void> {
  await withStore('readwrite', (store) => store.put(handle, KEY));
}

export async function forgetFolder(): Promise<void> {
  await withStore('readwrite', (store) => store.delete(KEY));
  await withStore('readwrite', (store) => store.delete(SCOPE_KEY));
}

/**
 * What this folder carries. Everything, unless somebody has said otherwise,
 * but a folder is only ever created through the picker, and the picker asks.
 */
export async function savedScope(): Promise<Scope> {
  try {
    const scope = await withStore<Scope | undefined>('readonly', (store) => store.get(SCOPE_KEY));
    if (scope?.kind === 'spaces' && Array.isArray(scope.origins)) return scope;
    return EVERYTHING;
  } catch {
    return EVERYTHING;
  }
}

export async function setScope(scope: Scope): Promise<void> {
  await withStore('readwrite', (store) => store.put(scope, SCOPE_KEY));
}

async function stored(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return (await withStore<FileSystemDirectoryHandle | undefined>('readonly', (store) =>
      store.get(KEY),
    )) ?? null;
  } catch {
    return null;
  }
}

type Permissible = FileSystemDirectoryHandle & {
  queryPermission?: (options: { mode: 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (options: { mode: 'readwrite' }) => Promise<PermissionState>;
};

/**
 * Whether we may still write here. A handle outlives the permission that came
 * with it, so this is asked every time rather than assumed, and asking again
 * needs a click, which is why `ask` is only true when there has been one.
 */
async function allowed(handle: FileSystemDirectoryHandle, ask: boolean): Promise<boolean> {
  const permissible = handle as Permissible;
  if (!permissible.queryPermission) return true;
  if ((await permissible.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
  if (!ask || !permissible.requestPermission) return false;
  return (await permissible.requestPermission({ mode: 'readwrite' })) === 'granted';
}

function folderFrom(handle: FileSystemDirectoryHandle): Folder {
  return {
    async read() {
      try {
        const file = await handle.getFileHandle(SYNC_FILE);
        return await (await file.getFile()).text();
      } catch {
        // Not there yet is the ordinary case on the first run, and a folder
        // that has gone away is not a reason to lose what is here.
        return null;
      }
    },
    async write(text) {
      const file = await handle.getFileHandle(SYNC_FILE, { create: true });
      const writable = await file.createWritable();
      await writable.write(text);
      await writable.close();
    },
  };
}

/** Asks for a folder. Must be called from a click, or the browser refuses. */
export async function pickFolder(): Promise<Chosen | null> {
  if (!canPickFolder()) return null;
  try {
    const handle = await window.showDirectoryPicker!({ id: 'kona-sync', mode: 'readwrite' });
    if (!(await allowed(handle, true))) return null;
    await remember(handle);
    return { name: handle.name, folder: folderFrom(handle) };
  } catch {
    // Cancelling the picker throws, and cancelling is not an error.
    return null;
  }
}

/**
 * The folder from last time, if it is still there and still ours to write to.
 * `ask` is for the case where the person has just clicked something, since
 * re-granting permission cannot happen on its own.
 */
export async function savedFolder(ask = false): Promise<Chosen | null> {
  const handle = await stored();
  if (!handle) return null;
  // Nothing rather than a folder that cannot be written to: a handle that
  // silently fails every write is worse than admitting there isn't one.
  if (!(await allowed(handle, ask))) return null;
  return { name: handle.name, folder: folderFrom(handle) };
}

/** What we remember calling it, whether or not it can be written to yet. */
export async function savedFolderName(): Promise<string | null> {
  return (await stored())?.name ?? null;
}

/** Whether the saved folder can be written to right now without asking again. */
export async function folderReady(): Promise<boolean> {
  const handle = await stored();
  return handle ? allowed(handle, false) : false;
}

/** All of the above, as the one thing the sync UI asks for a folder. */
export const browserFolders: FolderSource = {
  canPick: canPickFolder,
  pick: pickFolder,
  saved: savedFolder,
  savedName: savedFolderName,
  ready: folderReady,
  forget: forgetFolder,
  scope: savedScope,
  setScope,
};
