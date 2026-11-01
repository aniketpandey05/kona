import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  canPickFolder,
  folderReady,
  forgetFolder,
  pickFolder,
  savedFolder,
  savedFolderName,
  type Chosen,
} from '../core/folder';
import { syncStore } from '../core/store';
import { changedHere, syncOnce } from '../core/sync';

/**
 * Keeping this page in step with the folder, for as long as it is open.
 *
 * It runs while a Kona page is open and not otherwise. A service worker that
 * woke up to sync would be the better answer and Manifest V3 does not really
 * allow one — they are stopped after a few seconds of quiet — so rather than
 * pretend, this syncs when you are looking at your highlights, which is when
 * it matters and when you would notice it had not.
 */

/** Often enough to feel live, seldom enough to be invisible on a laptop. */
const EVERY = 12_000;

export type SyncState =
  | { kind: 'unsupported' }
  | { kind: 'off' }
  | { kind: 'needs-permission'; name: string }
  | { kind: 'on'; name: string; at: number | null; busy: boolean; trouble: string | null };

export function useFolderSync(): {
  state: SyncState;
  connect: () => Promise<void>;
  reconnect: () => Promise<void>;
  disconnect: () => Promise<void>;
  now: () => Promise<void>;
} {
  const [state, setState] = useState<SyncState>(
    canPickFolder() ? { kind: 'off' } : { kind: 'unsupported' },
  );
  const chosen = useRef<Chosen | null>(null);
  // One pass at a time: two overlapping passes would each write what the
  // other had not read yet.
  const running = useRef(false);

  const pass = useCallback(async () => {
    const folder = chosen.current;
    if (!folder || running.current) return;
    running.current = true;
    setState((current) => (current.kind === 'on' ? { ...current, busy: true } : current));
    try {
      await syncOnce(folder.folder, syncStore);
      setState({ kind: 'on', name: folder.name, at: Date.now(), busy: false, trouble: null });
    } catch (error) {
      setState({
        kind: 'on',
        name: folder.name,
        at: null,
        busy: false,
        trouble: error instanceof Error ? error.message : 'That folder could not be read.',
      });
    } finally {
      running.current = false;
    }
  }, []);

  // Pick the folder back up on load, but never ask for permission without a
  // click — the browser refuses, and a silent refusal reads as a bug.
  useEffect(() => {
    if (!canPickFolder()) return;
    void (async () => {
      const name = await savedFolderName();
      if (!name) return;
      if (!(await folderReady())) {
        setState({ kind: 'needs-permission', name });
        return;
      }
      chosen.current = await savedFolder();
      if (chosen.current) {
        setState({ kind: 'on', name: chosen.current.name, at: null, busy: false, trouble: null });
        await pass();
      }
    })();
  }, [pass]);

  useEffect(() => {
    if (state.kind !== 'on') return;
    const timer = window.setInterval(() => void pass(), EVERY);
    return () => window.clearInterval(timer);
  }, [state.kind, pass]);

  const connect = useCallback(async () => {
    const folder = await pickFolder();
    if (!folder) return;
    chosen.current = folder;
    setState({ kind: 'on', name: folder.name, at: null, busy: false, trouble: null });
    await pass();
  }, [pass]);

  const reconnect = useCallback(async () => {
    const folder = await savedFolder(true);
    if (!folder) return;
    chosen.current = folder;
    setState({ kind: 'on', name: folder.name, at: null, busy: false, trouble: null });
    await pass();
  }, [pass]);

  const disconnect = useCallback(async () => {
    chosen.current = null;
    await forgetFolder();
    setState({ kind: 'off' });
  }, []);

  return { state, connect, reconnect, disconnect, now: pass };
}

export { changedHere };
