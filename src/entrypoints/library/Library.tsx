import { browser } from '#imports';
import type { JSX } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { createBackup, readBackup } from '../../core/backup';
import { linkToMark } from '../../core/link';
import { toMarkdown } from '../../core/markdown';
import type { RuntimeMessage } from '../../core/messages';
import { sortByOrder } from '../../core/order';
import { HIGHLIGHT_COLORS, UI_COLORS } from '../../core/painter';
import { prime, searchLibrary } from '../../core/search';
import { siteLabel } from '../../core/sites';
import type { Person } from '../../core/people';
import {
  identityForBackup,
  importMarks,
  importSpaces,
  loadAllMarks,
  loadMe,
  loadSpaces,
  removeMark,
  restoreIdentity,
  saveSpace,
  upsertMark,
  watchAllMarks,
  watchMe,
  watchSpaces,
} from '../../core/store';
import { addMark as addToSpace, createSpace, originOf, whoFound, type Space } from '../../core/spaces';
import { addTags, countTags, removeTag, sameTag } from '../../core/tags';
import { applyTheme, loadTheme, saveTheme, watchTheme, type Theme } from '../../core/theme';
import { KonaMark } from '../../ui/KonaMark';
import { useFolderSync } from '../../ui/useFolderSync';
import { browserFolders, savedScope, setScope } from '../../core/folder';
import { syncStore } from '../../core/store';
import { EVERYTHING, SYNC_FILE, syncByHand, type Scope } from '../../core/sync';
import type { Mark } from '../../core/types';

const THEMES: Array<{ value: Theme; label: string; icon: () => JSX.Element }> = [
  { value: 'system', label: 'Match system', icon: MonitorIcon },
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
];

interface ChatGroup {
  key: string;
  title: string;
  site: string;
  marks: Mark[];
  newest: number;
}

export function Library() {
  const [marks, setMarks] = useState<Mark[] | null>(null);
  const [query, setQuery] = useState('');
  const [site, setSite] = useState<string | null>(siteFromUrl());
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<Mark | null>(null);
  const [theme, setTheme] = useState<Theme>('system');
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [me, setMe] = useState<Person | null>(null);
  // Which highlight is being filed, if any. One at a time keeps the list calm.
  const [filing, setFiling] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [inSpace, setInSpace] = useState<string | null>(null);
  const [foundBy, setFoundBy] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const reload = () => void loadAllMarks().then(setMarks);
    reload();
    return watchAllMarks(reload);
  }, []);

  useEffect(() => {
    void loadSpaces().then(setSpaces);
    return watchSpaces(setSpaces);
  }, []);

  useEffect(() => {
    void loadMe().then(setMe);
    return watchMe(setMe);
  }, []);

  useEffect(() => {
    const use = (next: Theme) => {
      setTheme(next);
      applyTheme(next);
    };
    void loadTheme().then(use);
    return watchTheme(use);
  }, []);

  const chooseTheme = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    void saveTheme(next);
  };

  const all = marks ?? [];

  // Opening the library is the moment to get the search index ready. It costs
  // a few hundred milliseconds on a few thousand highlights, once, and the
  // first keystroke is the worst possible moment to spend it.
  useEffect(() => {
    if (all.length === 0) return;
    const warm = () => prime(all);
    if (typeof requestIdleCallback === 'function') {
      const handle = requestIdleCallback(warm, { timeout: 2000 });
      return () => cancelIdleCallback(handle);
    }
    const timer = window.setTimeout(warm, 200);
    return () => window.clearTimeout(timer);
  }, [all]);

  const sites = countBySite(all);
  const tags = countTags(all);

  // Who found what, gathered from every space at once. A space you have never
  // handed to anyone credits only you, so there is one name and nothing worth
  // filtering by, the chips appear when a second person does.
  const credits = useMemo(() => whoFound(spaces), [spaces]);
  const people = useMemo(() => {
    const seen = new Map<string, Person>();
    for (const credited of credits.values()) {
      for (const person of credited) seen.set(person.id, person);
    }
    return [...seen.values()].sort((a, b) => (a.name < b.name ? -1 : 1));
  }, [credits]);
  const filled = useMemo(
    () => spaces.filter((space) => space.markIds.length > 0),
    [spaces],
  );
  // Searched before being filtered, for two reasons. The index is kept for as
  // long as the list it was built from, and `all` is the one list that does not
  // change as you click a site or a tag. And how unusual a word is should be
  // measured against everything you have kept, not against the corner of it
  // you happen to be looking at.
  const found = searchLibrary(all, query);
  const filtered = found.marks.filter(
    (mark) =>
      (!site || siteLabel(mark) === site) &&
      (!activeTag || (mark.tags ?? []).some((tag) => sameTag(tag, activeTag))) &&
      (!inSpace || spacesHolding(spaces, mark.id).some((space) => space.id === inSpace)) &&
      (!foundBy || (credits.get(mark.id) ?? []).some((person) => person.id === foundBy)),
  );
  const groups = groupByChat(filtered);
  const total = all.length;
  const shownMarks = groups.flatMap((group) => group.marks);
  const shown = shownMarks.length;

  const open = (mark: Mark) => {
    void browser.runtime.sendMessage({ type: 'open-mark', mark } satisfies RuntimeMessage);
  };

  const copyLink = async (mark: Mark) => {
    const link = linkToMark(mark);
    if (!link) {
      setMessage("This highlight has no address to link to.");
      return;
    }
    await navigator.clipboard.writeText(link);
    setCopiedId(mark.id);
    setTimeout(() => setCopiedId((id) => (id === mark.id ? null : id)), 1500);
  };

  const deleteMark = async (mark: Mark) => {
    setMessage(null);
    setDeleted(mark);
    setTimeout(() => setDeleted((current) => (current?.id === mark.id ? null : current)), 7000);
    await removeMark(mark.site, mark.conversationId, mark.id);
  };

  const undoDelete = async () => {
    const mark = deleted;
    if (!mark) return;
    setDeleted(null);
    await upsertMark(mark);
  };

  const download = (contents: string, type: string, extension: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([contents], { type }));
    link.download = `kona-${new Date().toISOString().slice(0, 10)}.${extension}`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportBackup = async () => {
    // Spaces and who you are, not just the highlights: with no sync, this
    // file is the only way any of it reaches another computer.
    const identity = await identityForBackup();
    download(createBackup(all, spaces, identity), 'application/json', 'json');
    const parts = [`${total} highlight${total === 1 ? '' : 's'}`];
    if (spaces.length) parts.push(`${spaces.length} space${spaces.length === 1 ? '' : 's'}`);
    setMessage(
      identity?.signingKey
        ? `Saved a backup of ${parts.join(' and ')}, and your signing key, keep it somewhere private.`
        : `Saved a backup of ${parts.join(' and ')}.`,
    );
  };

  const exportMarkdown = () => {
    download(toMarkdown(shownMarks), 'text/markdown', 'md');
    setMessage(`Saved ${shown} highlight${shown === 1 ? '' : 's'} as Markdown.`);
  };

  const importBackup = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // so the same file can be picked again
    if (!file) return;
    try {
      const backup = readBackup(await file.text());
      const { added, updated } = await importMarks(backup.marks);
      // Highlights first, so a space restored beside them finds the passages
      // it cites already here.
      const restoredSpaces = await importSpaces(backup.spaces);
      const name = backup.identity ? await restoreIdentity(backup.identity) : null;

      const parts = [];
      if (added) parts.push(`added ${added} highlight${added === 1 ? '' : 's'}`);
      if (updated) parts.push(`updated ${updated}`);
      if (restoredSpaces.added) {
        parts.push(`${restoredSpaces.added} space${restoredSpaces.added === 1 ? '' : 's'}`);
      }
      if (name) parts.push(`and you are ${name.name} again`);
      setMessage(
        parts.length ? `Imported: ${parts.join(', ')}.` : 'Everything in that file was already here.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'That file could not be imported.');
    }
  };

  return (
    <main class="lib">
      <header class="lib-header">
        <div class="lib-top">
          <KonaMark size={26} />
          <h1>Your highlights</h1>
          <a class="lib-go" href={browser.runtime.getURL('/spaces.html')}>
            Spaces
          </a>
          <div class="lib-theme" role="group" aria-label="Appearance">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                class={theme === value ? 'lib-theme-button lib-theme-on' : 'lib-theme-button'}
                onClick={() => chooseTheme(value)}
                aria-pressed={theme === value}
                aria-label={label}
                title={label}
              >
                <Icon />
              </button>
            ))}
          </div>
        </div>
        <input
          class="lib-search"
          type="search"
          value={query}
          placeholder="Search highlights, notes, titles and sites…"
          aria-label="Search highlights"
          autofocus
          onInput={(event) => setQuery(event.currentTarget.value)}
        />
        {found.alsoMatched.length > 0 && (
          <p class="lib-also">
            Also matched{' '}
            {found.alsoMatched.map((word, i) => (
              <span key={word}>
                {i > 0 && ' · '}
                <em>{word}</em>
              </span>
            ))}{' '}
           , words your own highlights keep beside what you typed.
          </p>
        )}
        {sites.length > 1 && (
          <div class="lib-filters" role="group" aria-label="Filter by site">
            <button class={site === null ? 'lib-chip lib-chip-on' : 'lib-chip'} onClick={() => setSite(null)}>
              All {total}
            </button>
            {sites.map(([label, count]) => (
              <button
                key={label}
                class={site === label ? 'lib-chip lib-chip-on' : 'lib-chip'}
                onClick={() => setSite(label)}
              >
                {label} {count}
              </button>
            ))}
          </div>
        )}
        {tags.length > 0 && (
          <div class="lib-filters" role="group" aria-label="Filter by tag">
            {tags.map(([label, count]) => (
              <button
                key={label}
                class={activeTag && sameTag(activeTag, label) ? 'lib-chip lib-chip-on' : 'lib-chip'}
                onClick={() => setActiveTag(activeTag && sameTag(activeTag, label) ? null : label)}
              >
                #{label} {count}
              </button>
            ))}
          </div>
        )}
        {filled.length > 0 && (
          <div class="lib-filters" role="group" aria-label="Filter by space">
            {filled.map((space) => (
              <button
                key={space.id}
                class={inSpace === space.id ? 'lib-chip lib-chip-on' : 'lib-chip'}
                onClick={() => setInSpace(inSpace === space.id ? null : space.id)}
              >
                In {space.name} {space.markIds.length}
              </button>
            ))}
          </div>
        )}
        {people.length > 1 && (
          <div class="lib-filters" role="group" aria-label="Filter by who found it">
            {people.map((person) => (
              <button
                key={person.id}
                class={foundBy === person.id ? 'lib-chip lib-chip-on' : 'lib-chip'}
                onClick={() => setFoundBy(foundBy === person.id ? null : person.id)}
              >
                Found by {person.name}
              </button>
            ))}
          </div>
        )}
        <div class="lib-tools">
          <p class="lib-count">
            {marks === null
              ? 'Loading…'
              : query || site || activeTag || inSpace || foundBy
                ? `${shown} of ${total} highlights`
                : `${total} highlights`}
          </p>
          <button class="lib-tool" onClick={exportMarkdown} disabled={shown === 0}>
            Export Markdown
          </button>
          <button class="lib-tool" onClick={() => void exportBackup()} disabled={total === 0}>
            Export backup
          </button>
          <FolderSync spaces={spaces} />
          <button class="lib-tool" onClick={() => fileInput.current?.click()}>
            Import backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => void importBackup(event)}
          />
        </div>
        {deleted ? (
          <p class="lib-message" role="status">
            Deleted “{deleted.snapshot.slice(0, 48)}
            {deleted.snapshot.length > 48 ? '…' : ''}”{' '}
            <button class="lib-undo" onClick={() => void undoDelete()}>
              Undo
            </button>
          </p>
        ) : (
          message && (
            <p class="lib-message" role="status">
              {message}
            </p>
          )
        )}
      </header>

      {marks !== null && total === 0 && (
        <p class="lib-empty">
          Nothing saved yet. Select some text anywhere you read, a paper, documentation,
          a chat, and pick a colour. ChatGPT, Claude and Gemini work straight away; switch
          on any other site from the Kona button in the toolbar.
        </p>
      )}
      {marks !== null && total > 0 && shown === 0 && (
        <p class="lib-empty">No highlights match what you're looking for.</p>
      )}

      {groups.map((group) => (
        <section class="lib-group" key={group.key}>
          <h2>
            <span class="lib-site">{group.site}</span>
            <span class="lib-title">{group.title}</span>
            <span class="lib-when">{formatWhen(group.newest)}</span>
          </h2>
          <ul>
            {group.marks.map((mark, index) => (
              <li key={mark.id} style={{ borderLeft: `3px solid ${UI_COLORS[mark.color]}` }}>
                <button class="lib-item" onClick={() => open(mark)} title="Open this page at the highlight">
                  <span class="lib-number" style={{ background: UI_COLORS[mark.color] }}>
                    {index + 1}
                  </span>
                  <span class="lib-body">
                    <span class="lib-text">{mark.snapshot}</span>
                    {mark.note && <span class="lib-note">{mark.note}</span>}
                    {found.byMeaning.has(mark.id) && (
                      <span class="lib-why">
                        Found by meaning; it uses none of your words
                      </span>
                    )}
                    {spacesHolding(spaces, mark.id).length > 0 && (
                      <span class="lib-in">
                        In{' '}
                        {spacesHolding(spaces, mark.id).map((space, i) => (
                          <span key={space.id}>
                            {i > 0 && ', '}
                            <a href={browser.runtime.getURL(`/spaces.html#/${space.id}`)}>
                              {space.name}
                            </a>
                          </span>
                        ))}
                      </span>
                    )}
                    {!!mark.tags?.length && (
                      <span class="lib-tags">
                        {mark.tags.map((tag) => (
                          <span class="lib-tag" key={tag}>
                            #{tag}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  class="lib-action"
                  onClick={() => {
                    setEditing(null);
                    setFiling(filing === mark.id ? null : mark.id);
                  }}
                  title="Put this highlight in a space"
                  aria-expanded={filing === mark.id}
                >
                  Add to space
                </button>
                <button
                  class="lib-action"
                  onClick={() => {
                    setFiling(null);
                    setEditing(editing === mark.id ? null : mark.id);
                  }}
                  title="Change the note and the tags"
                  aria-expanded={editing === mark.id}
                >
                  Edit
                </button>
                <button class="lib-action" onClick={() => void copyLink(mark)} title="Copy a link to this highlight">
                  {copiedId === mark.id ? 'Copied' : 'Copy link'}
                </button>
                <button
                  class="lib-action lib-danger"
                  onClick={() => void deleteMark(mark)}
                  title="Delete this highlight"
                >
                  Delete
                </button>
                {editing === mark.id && (
                  <EditMark
                    mark={mark}
                    onClose={(saved) => {
                      setEditing(null);
                      if (saved) setMessage('Saved.');
                    }}
                  />
                )}
                {filing === mark.id && (
                  <AddToSpace
                    mark={mark}
                    spaces={spaces}
                    me={me}
                    onDone={(name) => {
                      setFiling(null);
                      setMessage(`Added to ${name}.`);
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <footer class="lib-footer">
        <span>Free on this device. Nothing here leaves this computer.</span>
        <a class="lib-tool" href={browser.runtime.getURL('/plans.html')}>
          Plans
        </a>
      </footer>
    </main>
  );
}

/** A link that opens the page and jumps to the highlight; without the extension it just opens the page. */
function countBySite(marks: Mark[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const mark of marks) {
    const label = siteLabel(mark);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/** The panel can open the library already narrowed to the site being read. */
function siteFromUrl(): string | null {
  return new URLSearchParams(location.search).get('site');
}

function groupByChat(marks: Mark[]): ChatGroup[] {
  const groups = new Map<string, ChatGroup>();
  for (const mark of marks) {
    const key = `${mark.site}:${mark.conversationId}`;
    const group = groups.get(key);
    if (group) {
      group.marks.push(mark);
      group.newest = Math.max(group.newest, mark.createdAt);
    } else {
      groups.set(key, {
        key,
        title: mark.conversationTitle || 'Untitled',
        site: siteLabel(mark),
        marks: [mark],
        newest: mark.createdAt,
      });
    }
  }
  return [...groups.values()]
    .map((group) => ({ ...group, marks: sortByOrder(group.marks) }))
    .sort((a, b) => b.newest - a.newest);
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

function formatWhen(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Filing a highlight into a space from where you are reading it. The Spaces
 * page can gather from the whole library, but by the time you are looking at
 * one highlight and thinking "that belongs with the migration", walking over
 * to another page to search for it again is the wrong shape.
 */
/** Which spaces hold this highlight, so a row can say where it has been filed. */
function spacesHolding(spaces: Space[], markId: string): Space[] {
  return spaces.filter((space) => space.markIds.includes(markId));
}

/**
 * Sync, as much of it as there is to say.
 *
 * Off, this is one more tool in the row. On, it is a line that says where it
 * is going and when it last went, which is all anybody wants from sync until
 * it stops working, and then it is the only thing they want.
 */
/**
 * Which spaces a shared file carries. The same list whether the folder syncs
 * itself or is being worked by hand, because it is the same decision.
 */
function ScopePanel({
  spaces,
  where,
  shared,
  onToggle,
}: {
  spaces: Space[];
  where: string;
  shared: ReadonlySet<string>;
  onToggle: (origin: string) => void;
}) {
  return (
    <div class="lib-folder">
      <p class="lib-folder-why">
        Everyone you share <strong>{where}</strong> with can read these spaces and the
        passages they cite. Nothing else from this library goes in.
      </p>
      {spaces.length === 0 ? (
        <p class="lib-empty">No spaces to share yet.</p>
      ) : (
        spaces.map((space) => (
          <label key={space.id} class="lib-folder-space">
            <input
              type="checkbox"
              checked={shared.has(originOf(space))}
              onChange={() => onToggle(originOf(space))}
            />
            <span>
              {space.name}
              <small>
                {space.markIds.length} {space.markIds.length === 1 ? 'highlight' : 'highlights'}
              </small>
            </span>
          </label>
        ))
      )}
    </div>
  );
}

/**
 * Sync on a browser that will not hold a folder.
 *
 * Open the file out of the folder your machine already syncs, and Kona takes
 * what is in it and hands back the version to put where you found it. Two
 * taps rather than none, and the same file the automatic side maintains, so
 * a team is not split by somebody's choice of browser.
 */
function ByHandSync({ spaces }: { spaces: Space[] }) {
  const [scope, hold] = useState<Scope>(EVERYTHING);
  const [choosing, setChoosing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void savedScope().then(hold);
  }, []);

  const sharing = scope.kind === 'spaces' ? new Set(scope.origins) : null;

  const toggle = (origin: string) => {
    const next = new Set(sharing ?? []);
    if (next.has(origin)) next.delete(origin);
    else next.add(origin);
    const wanted: Scope = { kind: 'spaces', origins: [...next] };
    hold(wanted);
    void setScope(wanted);
  };

  const take = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const { synced, give } = await syncByHand(await file.text(), syncStore, scope);
      if (give) {
        const url = URL.createObjectURL(new Blob([give], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = SYNC_FILE;
        link.click();
        URL.revokeObjectURL(url);
      }
      const took = synced.added + synced.updated + synced.spacesAdded + synced.spacesMerged;
      setNote(
        give
          ? `Took ${took} and saved the file to put back.`
          : took
            ? `Took ${took}. Nothing to put back.`
            : 'Already in step.',
      );
    } catch (error) {
      setNote(error instanceof Error ? error.message : 'That file could not be read.');
    }
  };

  return (
    <>
      <button
        class="lib-tool"
        onClick={() => picker.current?.click()}
        title="Open the sync file out of a folder your computer already keeps in sync"
      >
        Sync through a file
      </button>
      <button class="lib-tool" onClick={() => setChoosing(!choosing)} aria-expanded={choosing}>
        {sharing ? `${sharing.size} shared` : 'Sharing everything'}
      </button>
      {note && <span class="lib-sync-where">{note}</span>}
      <input
        ref={picker}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => void take(event)}
      />
      {choosing && (
        <div class="lib-folder">
          <p class="lib-folder-why">
            This browser has no folder picker, Firefox, Safari and Chrome on Android do not
            offer one, so Kona cannot keep the folder in step by itself. Open the file from
            it and Kona will hand you back the one to put where you found it.
          </p>
          <label class="lib-folder-space">
            <input
              type="checkbox"
              checked={!sharing}
              onChange={() => {
                const wanted: Scope = sharing ? EVERYTHING : { kind: 'spaces', origins: [] };
                hold(wanted);
                void setScope(wanted);
              }}
            />
            <span>
              Everything
              <small>For a file only you see. Untick it to share a folder with people.</small>
            </span>
          </label>
          {sharing && (
            <ScopePanel spaces={spaces} where="that file" shared={sharing} onToggle={toggle} />
          )}
        </div>
      )}
    </>
  );
}

function FolderSync({ spaces }: { spaces: Space[] }) {
  const { state, connect, reconnect, disconnect, now, carry } = useFolderSync(
    browserFolders,
    syncStore,
  );
  const [asking, setAsking] = useState(false);
  const [choosing, setChoosing] = useState(false);

  // No picker here, so the same file by hand instead of nothing at all.
  if (state.kind === 'unsupported') return <ByHandSync spaces={spaces} />;

  if (state.kind === 'needs-permission') {
    return (
      <button class="lib-tool" onClick={() => void reconnect()}>
        Reconnect {state.name}
      </button>
    );
  }

  if (state.kind === 'off') {
    return (
      <>
        <button class="lib-tool" onClick={() => setAsking(!asking)} aria-expanded={asking}>
          Sync through a folder
        </button>
        {asking && (
          <div class="lib-folder">
            <p class="lib-folder-why">
              Kona writes one file into a folder your computer already keeps in sync, Drive,
              Dropbox, iCloud, OneDrive, Syncthing. It makes no network request of its own.
              Which folder you pick decides who can read what is in it, so it asks first.
            </p>
            <button
              class="lib-folder-pick"
              onClick={() => {
                setAsking(false);
                void connect({ kind: 'everything' });
              }}
            >
              A folder of my own
              <small>Everything, kept in step between my own computers.</small>
            </button>
            <button
              class="lib-folder-pick"
              onClick={() => {
                setAsking(false);
                setChoosing(true);
                void connect({ kind: 'spaces', origins: [] });
              }}
            >
              A folder I share with people
              <small>
                Only the spaces I choose, and only the passages those spaces cite. Nothing else
                in this library is written there.
              </small>
            </button>
          </div>
        )}
      </>
    );
  }

  const sharing = state.scope.kind === 'spaces' ? state.scope.origins : null;
  const shared = new Set(sharing ?? []);

  const toggle = (origin: string) => {
    const next = new Set(shared);
    if (next.has(origin)) next.delete(origin);
    else next.add(origin);
    void carry({ kind: 'spaces', origins: [...next] });
  };

  return (
    <>
      <span class="lib-sync">
        <button
          class="lib-tool"
          onClick={() => void now()}
          disabled={state.busy}
          title={state.trouble ?? `Syncing through ${state.name}`}
        >
          {state.busy ? 'Syncing…' : state.trouble ? 'Sync failed' : 'In sync'}
        </button>
        <span class={state.trouble ? 'lib-sync-bad' : 'lib-sync-where'}>
          {state.trouble ?? state.name}
        </span>
        {sharing && (
          <button class="lib-tool" onClick={() => setChoosing(!choosing)} aria-expanded={choosing}>
            {sharing.length === 0
              ? 'Nothing shared yet'
              : `${sharing.length} ${sharing.length === 1 ? 'space' : 'spaces'} shared`}
          </button>
        )}
        <button class="lib-tool" onClick={() => void disconnect()}>
          Stop
        </button>
      </span>

      {sharing && choosing && (
        <ScopePanel spaces={spaces} where={state.name} shared={shared} onToggle={toggle} />
      )}
    </>
  );
}

/**
 * Changing the note and the tags without going back to the page.
 *
 * The note is where a highlight stops being a quote and starts being yours,
 * and until now the only place to write one was the panel on the page it came
 * from, which is no use at all a week later, in the one view that holds
 * everything. The phone could already do this; the library could not.
 */
function EditMark({ mark, onClose }: { mark: Mark; onClose: (saved: boolean) => void }) {
  const [note, setNote] = useState(mark.note ?? '');
  const [tags, setTags] = useState<string[]>(mark.tags ?? []);
  const [draft, setDraft] = useState('');

  const save = () => {
    const written = note.trim();
    const next: Mark = { ...mark, updatedAt: Date.now() };
    // Deleted rather than set to undefined: these are optional, and a key
    // holding nothing is not the same as a key that is not there; it would
    // travel into a backup file and out the other side.
    if (written) next.note = written;
    else delete next.note;
    if (tags.length > 0) next.tags = tags;
    else delete next.tags;
    void upsertMark(next).then(() => onClose(true));
  };

  const addDraft = () => {
    if (!draft.trim()) return;
    setTags(addTags(tags, draft));
    setDraft('');
  };

  return (
    <div
      class="lib-editing"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose(false);
      }}
    >
      <label class="lib-edit-label" for={`note-${mark.id}`}>
        Note
      </label>
      <textarea
        id={`note-${mark.id}`}
        class="lib-edit-note"
        rows={3}
        value={note}
        autofocus
        placeholder="What made this worth keeping?"
        onInput={(event) => setNote((event.currentTarget as HTMLTextAreaElement).value)}
      />

      {tags.length > 0 && (
        <div class="lib-filing-row">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              class="lib-filing-chip"
              onClick={() => setTags(removeTag(tags, tag))}
              title={`Remove #${tag}`}
            >
              #{tag} ✕
            </button>
          ))}
        </div>
      )}

      <form
        class="lib-filing-row"
        onSubmit={(event) => {
          event.preventDefault();
          addDraft();
        }}
      >
        <input
          type="text"
          placeholder="Add a tag"
          aria-label="Add a tag"
          value={draft}
          onInput={(event) => setDraft((event.currentTarget as HTMLInputElement).value)}
        />
        <button type="submit" class="lib-action" disabled={!draft.trim()}>
          Add
        </button>
      </form>

      <div class="lib-filing-row">
        <button type="button" class="lib-action" onClick={save}>
          Save
        </button>
        <button type="button" class="lib-action" onClick={() => onClose(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function AddToSpace({
  mark,
  spaces,
  me,
  onDone,
}: {
  mark: Mark;
  spaces: Space[];
  me: Person | null;
  onDone: (spaceName: string) => void;
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  const already = spaces.filter((space) => space.markIds.includes(mark.id));
  const open = spaces.filter((space) => !space.markIds.includes(mark.id));

  const put = (space: Space) => {
    void saveSpace(addToSpace(space, mark.id, me)).then(() => onDone(space.name));
  };

  const make = () => {
    if (!name.trim()) return;
    const space = addToSpace(createSpace(name), mark.id, me);
    void saveSpace(space).then(() => onDone(space.name));
  };

  return (
    <div class="lib-filing">
      {already.length > 0 && (
        <p class="lib-filing-in">
          Already in {already.map((space) => space.name).join(', ')}.
        </p>
      )}

      {open.length > 0 && (
        <div class="lib-filing-row">
          {open.map((space) => (
            <button key={space.id} class="lib-filing-chip" onClick={() => put(space)}>
              {space.name}
            </button>
          ))}
        </div>
      )}

      {naming ? (
        <form
          class="lib-filing-row"
          onSubmit={(event) => {
            event.preventDefault();
            make();
          }}
        >
          <input
            type="text"
            placeholder="Name the space"
            value={name}
            autofocus
            onInput={(event) => setName((event.currentTarget as HTMLInputElement).value)}
          />
          <button type="submit" class="lib-action" disabled={!name.trim()}>
            Create and add
          </button>
        </form>
      ) : (
        <button class="lib-action" onClick={() => setNaming(true)}>
          {spaces.length === 0 ? 'Make your first space' : 'New space…'}
        </button>
      )}
    </div>
  );
}
