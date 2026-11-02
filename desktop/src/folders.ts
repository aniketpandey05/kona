/**
 * The desktop app's answer to "where is the folder".
 *
 * Side by side with the browser's answer in `src/core/folder.ts`, this is
 * mostly things that are not here. No feature detection, because a desktop
 * always has a folder picker. No permission to query, re-request or lose on a
 * restart, because a path does not expire. No handle to keep alive in
 * IndexedDB, because the main process remembers the path in a settings file
 * next to the app.
 *
 * `ready` is therefore simply whether a folder has been chosen, and the
 * `needs-permission` state the sync UI can show never happens here. That gap
 * between the two implementations is the whole case for the desktop app.
 */

import type { Bridge } from './preload';
import { EVERYTHING, type Chosen, type FolderSource, type Scope } from '../../src/core/sync';

declare global {
  interface Window {
    kona?: Bridge;
  }
}

/** Only ever absent if this module is loaded in a plain browser tab. */
const bridge = (): Bridge | null => (typeof window === 'undefined' ? null : window.kona ?? null);

function folderNamed(name: string, kona: Bridge): Chosen {
  return {
    name,
    folder: {
      read: () => kona.readFile(),
      write: (text) => kona.writeFile(text),
    },
  };
}

export const diskFolders: FolderSource = {
  canPick: () => !!bridge(),

  async pick() {
    const kona = bridge();
    if (!kona) return null;
    const picked = await kona.pickFolder();
    return picked ? folderNamed(picked.name, kona) : null;
  },

  async saved() {
    const kona = bridge();
    if (!kona) return null;
    const saved = await kona.savedFolder();
    return saved ? folderNamed(saved.name, kona) : null;
  },

  async savedName() {
    return (await bridge()?.savedFolder())?.name ?? null;
  },

  // A path is a path. If one has been chosen, it can be written to, and if it
  // cannot, because the drive is unplugged or the sync client is mid-flight,
  // the pass itself says so rather than this guessing in advance.
  async ready() {
    return !!(await bridge()?.savedFolder());
  },

  async forget() {
    await bridge()?.forgetFolder();
  },

  async scope() {
    const scope = (await bridge()?.getScope()) as Scope | null | undefined;
    return scope?.kind === 'spaces' && Array.isArray(scope.origins) ? scope : EVERYTHING;
  },

  async setScope(scope) {
    await bridge()?.setScope(scope);
  },
};

/** The tray's "sync now", for the window to hang its own pass on. */
export function onSyncNow(run: () => void): void {
  bridge()?.onSyncNow(run);
}
