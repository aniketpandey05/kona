import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import {
  changedHere,
  EVERYTHING,
  syncOnce,
  type Chosen,
  type FolderSource,
  type Scope,
  type SyncStore,
} from '../core/sync';

/**
 * Keeping a library in step with the folder, for as long as this is running.
 *
 * In the extension that means while a Kona page is open and not otherwise. A
 * service worker that woke up to sync would be the better answer and
 * Manifest V3 does not really allow one; they are stopped after a few
 * seconds of quiet, so rather than pretend, this syncs when you are looking
 * at your highlights, which is when it matters and when you would notice it
 * had not.
 *
 * The desktop app is the same hook with nothing taken away: its window can be
 * shut to the tray and the renderer keeps running, so there the sync really is
 * always on. Which folder and which library it works on are both arguments,
 * because that is the entire difference between the three places this runs.
 */

/** Often enough to feel live, seldom enough to be invisible on a laptop. */
const EVERY = 12_000;

export type SyncState =
  | { kind: 'unsupported' }
  | { kind: 'off' }
  | { kind: 'needs-permission'; name: string }
  | {
      kind: 'on';
      name: string;
      at: number | null;
      busy: boolean;
      trouble: string | null;
      /** What this folder is allowed to carry. */
      scope: Scope;
    };

/** Everything the sync controls need, so one can be handed to a component. */
export interface FolderSyncControls {
  state: SyncState;
  /** Pick a folder, having first settled what it may carry. */
  connect: (scope: Scope) => Promise<void>;
  /** Ask again for a permission that has lapsed. Browsers only. */
  reconnect: () => Promise<void>;
  disconnect: () => Promise<void>;
  /** One pass, now. */
  now: () => Promise<void>;
  /** Change what the folder carries, and act on it. */
  carry: (scope: Scope) => Promise<void>;
}

export function useFolderSync(folders: FolderSource, store: SyncStore): FolderSyncControls {
  const [state, setState] = useState<SyncState>(
    folders.canPick() ? { kind: 'off' } : { kind: 'unsupported' },
  );
  const chosen = useRef<Chosen | null>(null);
  const scope = useRef<Scope>(EVERYTHING);
  // One pass at a time: two overlapping passes would each write what the
  // other had not read yet.
  const running = useRef(false);

  const pass = useCallback(async () => {
    const folder = chosen.current;
    if (!folder || running.current) return;
    running.current = true;
    setState((current) => (current.kind === 'on' ? { ...current, busy: true } : current));
    try {
      await syncOnce(folder.folder, store, scope.current);
      setState({
        kind: 'on',
        name: folder.name,
        at: Date.now(),
        busy: false,
        trouble: null,
        scope: scope.current,
      });
    } catch (error) {
      setState({
        kind: 'on',
        name: folder.name,
        at: null,
        busy: false,
        trouble: error instanceof Error ? error.message : 'That folder could not be read.',
        scope: scope.current,
      });
    } finally {
      running.current = false;
    }
  }, [store]);

  // Pick the folder back up on load, but never ask for permission without a
  // click, the browser refuses, and a silent refusal reads as a bug.
  useEffect(() => {
    if (!folders.canPick()) return;
    void (async () => {
      const name = await folders.savedName();
      if (!name) return;
      if (!(await folders.ready())) {
        setState({ kind: 'needs-permission', name });
        return;
      }
      scope.current = await folders.scope();
      chosen.current = await folders.saved();
      if (chosen.current) {
        setState({
          kind: 'on',
          name: chosen.current.name,
          at: null,
          busy: false,
          trouble: null,
          scope: scope.current,
        });
        await pass();
      }
    })();
  }, [folders, pass]);

  useEffect(() => {
    if (state.kind !== 'on') return;
    const timer = window.setInterval(() => void pass(), EVERY);
    return () => window.clearInterval(timer);
  }, [state.kind, pass]);

  const connect = useCallback(
    async (wanted: Scope) => {
      // The scope is settled before the folder is touched, so there is no
      // moment where a folder exists and nobody has said what may go in it.
      scope.current = wanted;
      await folders.setScope(wanted);
      const folder = await folders.pick();
      if (!folder) return;
      chosen.current = folder;
      setState({ kind: 'on', name: folder.name, at: null, busy: false, trouble: null, scope: wanted });
      await pass();
    },
    [folders, pass],
  );

  const reconnect = useCallback(async () => {
    const folder = await folders.saved(true);
    if (!folder) return;
    scope.current = await folders.scope();
    chosen.current = folder;
    setState({
      kind: 'on',
      name: folder.name,
      at: null,
      busy: false,
      trouble: null,
      scope: scope.current,
    });
    await pass();
  }, [folders, pass]);

  const carry = useCallback(
    async (wanted: Scope) => {
      scope.current = wanted;
      await folders.setScope(wanted);
      setState((current) => (current.kind === 'on' ? { ...current, scope: wanted } : current));
      await pass();
    },
    [folders, pass],
  );

  const disconnect = useCallback(async () => {
    chosen.current = null;
    await folders.forget();
    setState({ kind: 'off' });
  }, [folders]);

  return { state, connect, reconnect, disconnect, now: pass, carry };
}

export { changedHere };
