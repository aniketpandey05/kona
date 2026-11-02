/**
 * The only way between the window and the disk.
 *
 * Deliberately a handful of verbs and no paths. The renderer cannot name a
 * file, so the worst a mistake in the UI can do is read or write the one file
 * in the folder the person chose, and `contextIsolation` means the page
 * cannot reach past this to Node either.
 */

import { contextBridge, ipcRenderer } from 'electron';

export interface Bridge {
  pickFolder(): Promise<{ name: string; path: string } | null>;
  savedFolder(): Promise<{ name: string; path: string } | null>;
  forgetFolder(): Promise<void>;
  readFile(): Promise<string | null>;
  writeFile(text: string): Promise<void>;
  getScope(): Promise<unknown>;
  setScope(scope: unknown): Promise<void>;
  /** The tray's "sync now". */
  onSyncNow(run: () => void): void;
}

const bridge: Bridge = {
  pickFolder: () => ipcRenderer.invoke('folder:pick'),
  savedFolder: () => ipcRenderer.invoke('folder:saved'),
  forgetFolder: () => ipcRenderer.invoke('folder:forget'),
  readFile: () => ipcRenderer.invoke('folder:read'),
  writeFile: (text) => ipcRenderer.invoke('folder:write', text),
  getScope: () => ipcRenderer.invoke('scope:get'),
  setScope: (scope) => ipcRenderer.invoke('scope:set', scope),
  onSyncNow: (run) => {
    ipcRenderer.on('sync:now', () => run());
  },
};

contextBridge.exposeInMainWorld('kona', bridge);
