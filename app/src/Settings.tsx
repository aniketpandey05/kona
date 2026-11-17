import { useEffect, useRef, useState } from 'preact/hooks';
import { createBackup, readBackup } from '../../src/core/backup';
import { toMarkdown } from '../../src/core/markdown';
import type { Space } from '../../src/core/spaces';
import type { Theme } from '../../src/core/theme';
import type { Mark } from '../../src/core/types';
import type { FolderSyncControls } from '../../src/ui/useFolderSync';
import {
  identityForBackup,
  importMarks,
  importSpaces,
  loadMe,
  restoreIdentity,
  saveMe,
} from './storage';
import { loadScope } from './storage';
import { applyTheme, loadTheme, saveTheme } from './theme';

/**
 * Settings: what you keep, where it goes, and who you are.
 *
 * **Export is the part that matters most, and 6 is why.** If the server cannot
 * read your library, and you lose every device and the recovery phrase, then
 * the data is genuinely gone, Kona says so plainly rather than pretending
 * otherwise. A file you keep is therefore *the only backup that exists*.
 * End-to-end encryption turns export from a courtesy into a safety feature,
 * and nothing that is a safety feature goes behind a tier. So it is free, on
 * every tier, always reachable, and in two formats because they answer two
 * different fears:
 *
 * - **A backup**, which can be read back in, so a library survives a lost
 *   phrase.
 * - **Something readable**, for *I want my work even if Kona dies*.
 *
 * Folder sync is the other half of the same thought. There is no server yet,
 * so a folder you already sync is how a library reaches a second device, and
 * it is driven by hand rather than pretending to be the real thing.
 */
interface Props {
  marks: Mark[];
  spaces: Space[];
  onChanged: () => void;
  /**
   * The one folder sync, made by the library and handed down.
   *
   * Not made here: the hook runs a pass on a timer and allows one at a time,
   * so a second copy would mean two passes writing what the other had not
   * read. The account row needs the same state to say that a sync stopped.
   */
  sync: FolderSyncControls;
  /** The desktop tray's "sync now", handed a function to call. */
  syncOnDemand?: (run: () => void) => void;
}

export function Settings({ marks, spaces, onChanged, sync, syncOnDemand }: Props) {
  const [theme, setTheme] = useState<Theme>('system');
  const [name, setName] = useState('');
  const [said, setSaid] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = loadTheme();
    setTheme(stored);
    applyTheme(stored);
    setName(loadMe()?.name ?? '');
  }, []);

  const say = (message: string) => {
    setSaid(message);
    setTimeout(() => setSaid(null), 4000);
  };

  const download = (text: string, filename: string, type: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const today = new Date().toISOString().slice(0, 10);

  const exportBackup = () =>
    download(
      createBackup(marks, spaces, identityForBackup() ?? undefined),
      `kona-${today}.json`,
      'application/json',
    );

  const exportReadable = () => download(toMarkdown(marks), `kona-${today}.md`, 'text/markdown');

  const onImport = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const chosen = input.files?.[0];
    input.value = '';
    if (!chosen) return;
    try {
      const backup = readBackup(await chosen.text());
      const marksIn = await importMarks(backup.marks);
      const spacesIn = await importSpaces(backup.spaces ?? []);
      if (backup.identity) restoreIdentity(backup.identity);
      const parts = [];
      if (marksIn.added) parts.push(`${marksIn.added} highlights`);
      if (spacesIn.added) parts.push(`${spacesIn.added} spaces`);
      say(parts.length ? `Brought in ${parts.join(' and ')}.` : 'Everything was already here.');
      onChanged();
    } catch {
      // 14a: Kona reads its own export and says so plainly about anything else,
      // rather than half-importing a file it does not understand.
      say('That is not a Kona backup. Kona reads the file it wrote.');
    }
  };

  return (
    <>
      <div class="lib-head">
        <h1>Settings</h1>
        <p>What you keep, where it goes, and who you are.</p>
      </div>

      {said && (
        <p class="set-said" role="status">
          {said}
        </p>
      )}

      <section class="set-section">
        <h2>Your copy of everything</h2>
        <p class="lib-none">
          Kona cannot read your library, so if you lose every device the data is
          gone. A file you keep is the only backup there is. Free, always, on
          every tier.
        </p>
        <div class="set-row">
          <button type="button" class="sp-do" onClick={exportBackup}>
            Download a backup
          </button>
          <button type="button" class="sp-undo" onClick={exportReadable}>
            Download it readable
          </button>
          <button type="button" class="sp-undo" onClick={() => file.current?.click()}>
            Read a backup in
          </button>
        </div>
        <p class="set-quiet">
          The backup reads back in and restores everything. The readable one is
          Markdown, for keeping your work whether or not Kona is still here.
        </p>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => void onImport(event)}
        />
      </section>

      <section class="set-section">
        <h2>Appearance</h2>
        <div class="set-row">
          {(['system', 'light', 'dark'] as Theme[]).map((each) => (
            <button
              key={each}
              type="button"
              class={each === theme ? 'lib-chip lib-chip--on' : 'lib-chip'}
              aria-pressed={each === theme}
              onClick={() => {
                setTheme(each);
                saveTheme(each);
                applyTheme(each);
              }}
            >
              {each === 'system' ? 'Match the system' : each === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </section>

      <section class="set-section">
        <h2>Your name</h2>
        <p class="set-quiet">
          Only used to mark who gathered what inside a shared space. It never
          leaves this device on its own.
        </p>
        <div class="set-row">
          <input
            class="set-input"
            type="text"
            value={name}
            placeholder="Nobody yet"
            onInput={(event) => setName(event.currentTarget.value)}
          />
          <button
            type="button"
            class="sp-undo"
            onClick={() => {
              void saveMe(name).then(() => {
                say('Saved.');
                // The account row at the foot of the nav shows this name.
                onChanged();
              });
            }}
          >
            Save
          </button>
        </div>
      </section>

      <FolderSync onChanged={onChanged} say={say} sync={sync} syncOnDemand={syncOnDemand} />
    </>
  );
}

/**
 * Syncing through a folder you already sync.
 *
 * Not the sync of decision 6: that is hosted, encrypted and Pro, and it does
 * not exist yet. This is the other thing DEFINITIONS names and keeps separate:
 * *syncing through a folder you own, or a file you carry between machines, is
 * a different thing and is not this.* It is driven by hand and says so.
 *
 * Kept because it is how a Free library reaches a second device today, and
 * taking it away before the real one exists would leave nothing in its place.
 */
function FolderSync({
  onChanged,
  say,
  sync,
  syncOnDemand,
}: {
  onChanged: () => void;
  say: (m: string) => void;
  sync: FolderSyncControls;
  syncOnDemand?: (run: () => void) => void;
}) {
  const state = sync.state;

  // The tray asks for a pass; the screen is what knows how to do one.
  useEffect(() => {
    syncOnDemand?.(() => void sync.now().then(() => onChanged()));
  }, [syncOnDemand]);

  return (
    <section class="set-section">
      <h2>A folder you already sync</h2>
      <p class="set-quiet">
        Not the hosted sync, which does not exist yet. This writes your library
        into a folder on this machine, so anything that already keeps that
        folder in step, a drive or a shared folder, carries it to your other
        devices. You run it; it does not run itself.
      </p>

      {state.kind === 'unsupported' && (
        <p class="lib-none">
          This browser cannot pick a folder. Firefox and Safari have not shipped
          it, so on those the backup file is the way across.
        </p>
      )}

      {state.kind === 'off' && (
        <div class="set-row">
          <button
            type="button"
            class="sp-do"
            onClick={() => void sync.connect(loadScope()).then(() => onChanged())}
          >
            Choose a folder
          </button>
        </div>
      )}

      {state.kind === 'needs-permission' && (
        <div class="set-row">
          <p class="set-quiet">
            The browser has forgotten its permission for <strong>{state.name}</strong>.
          </p>
          <button type="button" class="sp-do" onClick={() => void sync.reconnect()}>
            Allow it again
          </button>
        </div>
      )}

      {state.kind === 'on' && (
        <>
          <p class="set-quiet">
            Using <strong>{state.name}</strong>
            {state.at ? ` · last run ${new Date(state.at).toLocaleString()}` : ' · not run yet'}
          </p>
          {/* 23: a sync that failed is the one thing Kona speaks up about. */}
          {state.trouble && (
            <p class="set-trouble" role="status">
              {state.trouble}
            </p>
          )}
          <div class="set-row">
            <button
              type="button"
              class="sp-do"
              disabled={state.busy}
              onClick={() => void sync.now().then(() => { onChanged(); say('Run.'); })}
            >
              {state.busy ? 'Running…' : 'Run it now'}
            </button>
            <button type="button" class="sp-undo" onClick={() => void sync.disconnect()}>
              Stop using it
            </button>
          </div>
        </>
      )}
    </section>
  );
}
