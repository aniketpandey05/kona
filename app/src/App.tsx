import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { createBackup, readBackup } from '../../src/core/backup';
import { linkToMark } from '../../src/core/link';
import { UI_COLORS } from '../../src/core/painter';
import { toMarkdown } from '../../src/core/markdown';
import { searchMarks } from '../../src/core/search';
import { countTags, sameTag, addTags, removeTag } from '../../src/core/tags';
import type { Theme } from '../../src/core/theme';
import type { HighlightColor, Mark } from '../../src/core/types';
import { KonaMark } from '../../src/ui/KonaMark';
import { markFromShare, planShare, readShare } from './share';
import { applyTheme, loadTheme, saveTheme } from './theme';
import { importMarks, loadAll, remove, save, watch } from './storage';

const UNDO_MS = 6000;

const COLOURS = Object.keys(UI_COLORS) as HighlightColor[];

/**
 * Captures from an app arrive with no link, and the fix is always the same
 * link — the one public share URL for the conversation they all came from.
 * Remembering the last one turns "paste it again" into one tap.
 */
const LAST_LINK = 'kona:last-link';


function readLastLink(): string {
  try {
    return localStorage.getItem(LAST_LINK) ?? '';
  } catch {
    return '';
  }
}

function rememberLink(url: string): void {
  try {
    localStorage.setItem(LAST_LINK, url);
  } catch {
    // Not remembering it only costs a paste.
  }
}

const THEMES: Array<{ value: Theme; label: string; glyph: string }> = [
  { value: 'system', label: 'Match system', glyph: '◐' },
  { value: 'light', label: 'Light', glyph: '☀' },
  { value: 'dark', label: 'Dark', glyph: '☾' },
];

export function App() {
  const [marks, setMarks] = useState<Mark[] | null>(null);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [colour, setColour] = useState<HighlightColor | null>(null);
  const [editing, setEditing] = useState<Mark | null>(null);
  const [deleted, setDeleted] = useState<Mark | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState<Theme>('system');
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingLink, setPendingLink] = useState<{ url: string; orphans: Mark[] } | null>(null);

  const refresh = () => void loadAll().then(setMarks);

  useEffect(() => {
    // A share arrives as a normal page load with the text in the query string.
    void (async () => {
      const shared = readShare(location.search);
      if (shared) {
        const plan = planShare(shared, await loadAll());
        if (plan.kind === 'nothing') {
          setNotice("That share didn't contain anything to keep.");
        } else if (plan.kind === 'adopt') {
          setPendingLink({ url: plan.url, orphans: plan.orphans });
        } else {
          await save(plan.mark);
          setNotice(plan.mark.snapshot ? 'Saved.' : 'Saved the link.');
          if (plan.mark.snapshot) setEditing(plan.mark);
        }
        // Drop the query string so a reload cannot save the same thing twice.
        history.replaceState(null, '', location.pathname);
      }
      refresh();
    })();
    const stored = loadTheme();
    setTheme(stored);
    applyTheme(stored);
    return watch(refresh);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  const tags = useMemo(() => countTags(marks ?? []), [marks]);

  /** Only the colours actually in use, commonest first. */
  const colours = useMemo(() => {
    const counts = new Map<HighlightColor, number>();
    for (const mark of marks ?? []) counts.set(mark.color, (counts.get(mark.color) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [marks]);

  const shown = useMemo(() => {
    let list = marks ?? [];
    if (colour) list = list.filter((mark) => mark.color === colour);
    if (tag) list = list.filter((mark) => mark.tags?.some((each) => sameTag(each, tag)));
    return query ? searchMarks(list, query) : list;
  }, [marks, query, tag, colour]);

  const groups = useMemo(() => groupByPage(shown), [shown]);

  const update = async (mark: Mark, patch: Partial<Mark>) => {
    const next = { ...mark, ...patch, updatedAt: Date.now() };
    await save(next);
    setEditing((current) => (current && current.id === mark.id ? next : current));
  };

  const drop = async (mark: Mark) => {
    await remove(mark.id);
    setEditing(null);
    setDeleted(mark);
    setTimeout(() => setDeleted((current) => (current?.id === mark.id ? null : current)), UNDO_MS);
  };

  const download = (contents: string, type: string, extension: string) => {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `kona-${new Date().toISOString().slice(0, 10)}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const { added, updated } = await importMarks(readBackup(await file.text()));
      setNotice(added || updated ? `Imported ${added} new, ${updated} updated.` : 'Everything was already here.');
      refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'That file could not be imported.');
    }
  };

  return (
    <main class="app">
      <header class="app-top">
        <KonaMark size={26} />
        <h1>Kona</h1>
        {marks !== null && marks.length > 0 && <span class="app-count">{marks.length} kept</span>}
        <button class="app-more" onClick={() => setMenuOpen(true)} aria-label="Settings and backups">
          &#8942;
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => void onImport(e)} />
      </header>

      <input
        class="app-search"
        type="search"
        value={query}
        placeholder="Search what you've kept…"
        aria-label="Search"
        autocapitalize="none"
        autocorrect="off"
        spellcheck={false}
        onInput={(event) => setQuery(event.currentTarget.value)}
      />

      {colours.length > 1 && (
        <div class="app-tags" role="group" aria-label="Filter by colour">
          {colours.map(([each, count]) => (
            <button
              key={each}
              class={colour === each ? 'app-chip app-chip-on' : 'app-chip'}
              aria-pressed={colour === each}
              aria-label={`${count} ${each}`}
              onClick={() => setColour(colour === each ? null : each)}
            >
              <span class="app-chip-dot" style={{ background: UI_COLORS[each] }} />
              {count}
            </button>
          ))}
        </div>
      )}

      {tags.length > 0 && (
        <div class="app-tags" role="group" aria-label="Filter by tag">
          {tags.map(([label, count]) => (
            <button
              key={label}
              class={tag && sameTag(tag, label) ? 'app-chip app-chip-on' : 'app-chip'}
              onClick={() => setTag(tag && sameTag(tag, label) ? null : label)}
            >
              #{label} {count}
            </button>
          ))}
        </div>
      )}

      {pendingLink && (
        <div class="app-adopt" role="status">
          <p>
            That's a link on its own. Attach it to the{' '}
            <strong>
              {pendingLink.orphans.length} capture{pendingLink.orphans.length === 1 ? '' : 's'}
            </strong>{' '}
            kept today without one?
          </p>
          <small>{pendingLink.url}</small>
          <div class="app-adopt-actions">
            <button
              class="app-tool"
              onClick={() => {
                void save(markFromShare({ url: pendingLink.url, text: '' })!).then(() => {
                  setNotice('Saved the link on its own.');
                  setPendingLink(null);
                  refresh();
                });
              }}
            >
              Keep separately
            </button>
            <button
              class="app-save"
              onClick={() => {
                void (async () => {
                  for (const each of pendingLink.orphans) {
                    await save({ ...each, url: pendingLink.url, updatedAt: Date.now() });
                  }
                  rememberLink(pendingLink.url);
                  setNotice(`Attached to ${pendingLink.orphans.length}.`);
                  setPendingLink(null);
                  refresh();
                })();
              }}
            >
              Attach to {pendingLink.orphans.length}
            </button>
          </div>
        </div>
      )}

      {notice && <p class="app-notice" role="status">{notice}</p>}

      {deleted && (
        <p class="app-notice" role="status">
          Deleted.{' '}
          <button
            class="app-undo"
            onClick={() => {
              void save(deleted);
              setDeleted(null);
            }}
          >
            Undo
          </button>
        </p>
      )}

      {marks === null && <p class="app-empty">Loading…</p>}

      {marks !== null && marks.length === 0 && (
        <div class="app-empty">
          <p>Nothing kept yet.</p>
          <p class="app-hint">
            Select text anywhere on your phone, tap <strong>Share</strong>, and pick Kona.
          </p>
        </div>
      )}

      {marks !== null && marks.length > 0 && shown.length === 0 && (
        <p class="app-empty">
          Nothing matches what you're looking for.{' '}
          {(colour || tag || query) && (
            <button
              class="app-undo"
              onClick={() => {
                setColour(null);
                setTag(null);
                setQuery('');
              }}
            >
              Clear filters
            </button>
          )}
        </p>
      )}

      {groups.map((group) => (
        <section class="app-group" key={group.key}>
          <h2>
            {group.site && group.site !== group.title && (
              <span class="app-site">{group.site}</span>
            )}
            <span class="app-title">{group.title}</span>
          </h2>
          <ul>
            {group.marks.map((mark) => {
              const body = (
                <>
                  <span class="app-text">{mark.snapshot || mark.url}</span>
                  {!mark.url && <span class="app-nolink">no link</span>}
                  {mark.note && <span class="app-note">{mark.note}</span>}
                  {!!mark.tags?.length && (
                    <span class="app-row-tags">
                      {mark.tags.map((each) => (
                        <span class="app-tag" key={each}>
                          {each}
                        </span>
                      ))}
                    </span>
                  )}
                </>
              );
              return (
                <li key={mark.id}>
                  {/* Tapping the quote goes back to where it came from, as it does
                      in the extension. Text shared from an app has nowhere to go,
                      so there it opens the note instead. */}
                  {mark.url ? (
                    <a
                      class="app-item"
                      style={{ borderLeftColor: UI_COLORS[mark.color] }}
                      href={linkToMark(mark)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {body}
                    </a>
                  ) : (
                    <button
                      class="app-item"
                      style={{ borderLeftColor: UI_COLORS[mark.color] }}
                      onClick={() => setEditing(mark)}
                    >
                      {body}
                    </button>
                  )}
                  <button
                    class="app-edit"
                    onClick={() => setEditing(mark)}
                    aria-label="Note and tags"
                    title="Note and tags"
                  >
                    ✎
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {menuOpen && (
        <div class="app-backdrop" onClick={() => setMenuOpen(false)}>
          <div class="app-sheet" onClick={(event) => event.stopPropagation()}>
            <span class="app-label">Appearance</span>
            <div class="app-theme" role="group" aria-label="Appearance">
              {THEMES.map(({ value, label, glyph }) => (
                <button
                  key={value}
                  class={theme === value ? 'app-theme-button app-theme-on' : 'app-theme-button'}
                  aria-pressed={theme === value}
                  aria-label={label}
                  onClick={() => {
                    setTheme(value);
                    saveTheme(value);
                    applyTheme(value);
                  }}
                >
                  <span aria-hidden="true">{glyph}</span> {label}
                </button>
              ))}
            </div>

            <span class="app-label">Your highlights</span>
            <button
              class="app-row-action"
              disabled={!shown.length}
              onClick={() => {
                download(toMarkdown(shown), 'text/markdown', 'md');
                setMenuOpen(false);
              }}
            >
              Export as Markdown
              <small>{shown.length === marks?.length ? 'all of them' : `the ${shown.length} shown`}</small>
            </button>
            <button
              class="app-row-action"
              disabled={!marks?.length}
              onClick={() => {
                download(createBackup(marks ?? []), 'application/json', 'json');
                setMenuOpen(false);
              }}
            >
              Back up
              <small>a file you can keep or move to another phone</small>
            </button>
            <button
              class="app-row-action"
              onClick={() => {
                fileInput.current?.click();
                setMenuOpen(false);
              }}
            >
              Restore
              <small>add highlights from a backup file</small>
            </button>
          </div>
        </div>
      )}

      {editing && (
        <Sheet
          mark={editing}
          onClose={() => setEditing(null)}
          onChange={(patch) => void update(editing, patch)}
          onDelete={() => void drop(editing)}
        />
      )}
    </main>
  );
}

function Sheet({
  mark,
  onClose,
  onChange,
  onDelete,
}: {
  mark: Mark;
  onClose: () => void;
  onChange: (patch: Partial<Mark>) => void;
  onDelete: () => void;
}) {
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const tagRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const lastLink = readLastLink();

  return (
    <div class="app-backdrop" onClick={onClose}>
      <div class="app-sheet" onClick={(event) => event.stopPropagation()}>
        <blockquote class="app-quote">{mark.snapshot || mark.url}</blockquote>

        {/* Whether a link came with the share decides whether this can ever jump
            back, so say which plainly instead of leaving it to be guessed. */}
        {mark.url ? (
          <p class="app-source">
            <a href={linkToMark(mark)} target="_blank" rel="noreferrer">
              {hostOf(mark.url) || mark.url}
            </a>
          </p>
        ) : (
          <div class="app-source app-source-missing">
            <p>No link came with this share, so there is nowhere to jump back to.</p>
            <div class="app-tagrow">
              <input
                ref={linkRef}
                class="app-taginput"
                type="url"
                inputMode="url"
                placeholder="paste the page link"
                autocapitalize="none"
                autocorrect="off"
                spellcheck={false}
              />
              <button
                class="app-tool"
                onClick={() => {
                  void navigator.clipboard
                    .readText()
                    .then((text) => {
                      const found = /https?:\/\/\S+/.exec(text)?.[0];
                      if (found && linkRef.current) linkRef.current.value = found;
                    })
                    .catch(() => undefined);
                }}
              >
                Paste
              </button>
              <button
                class="app-tool"
                onClick={() => {
                  const value = linkRef.current?.value.trim() ?? '';
                  if (!/^https?:\/\//.test(value)) return;
                  rememberLink(value);
                  onChange({ url: value, conversationTitle: hostOf(value) || mark.conversationTitle });
                }}
              >
                Attach
              </button>
            </div>
            {lastLink && (
              <button
                class="app-row-action"
                onClick={() =>
                  onChange({
                    url: lastLink,
                    conversationTitle: hostOf(lastLink) || mark.conversationTitle,
                  })
                }
              >
                Use the last link again
                <small>{lastLink}</small>
              </button>
            )}
          </div>
        )}

        <span class="app-label">Colour</span>
        <div class="app-swatches" role="group" aria-label="Colour">
          {COLOURS.map((colour) => (
            <button
              key={colour}
              class={mark.color === colour ? 'app-swatch app-swatch-on' : 'app-swatch'}
              style={{ background: UI_COLORS[colour] }}
              aria-pressed={mark.color === colour}
              aria-label={colour}
              title={colour}
              onClick={() => onChange({ color: colour })}
            />
          ))}
        </div>

        <label class="app-label" for="note">
          Note
        </label>
        <textarea
          id="note"
          ref={noteRef}
          class="app-textarea"
          rows={3}
          placeholder="What made this worth keeping?"
          defaultValue={mark.note ?? ''}
        />

        <label class="app-label" for="tag">
          Tags
        </label>
        <div class="app-tagrow">
          {mark.tags?.map((each) => (
            <button key={each} class="app-tag app-tag-x" onClick={() => onChange({ tags: removeTag(mark.tags ?? [], each) })}>
              {each} ✕
            </button>
          ))}
          <input
            id="tag"
            ref={tagRef}
            class="app-taginput"
            placeholder="add a tag"
            autocapitalize="none"
            autocorrect="off"
            spellcheck={false}
            enterkeyhint="done"
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              const value = tagRef.current?.value ?? '';
              if (!value.trim()) return;
              onChange({ tags: addTags(mark.tags ?? [], value) });
              if (tagRef.current) tagRef.current.value = '';
            }}
          />
        </div>

        <div class="app-sheet-actions">
          <button class="app-danger" onClick={onDelete}>
            Delete
          </button>
          {mark.url && (
            <a class="app-open" href={linkToMark(mark)} target="_blank" rel="noreferrer">
              Open original
            </a>
          )}
          <button
            class="app-save"
            onClick={() => {
              // Read the field directly; state set in this same tick would be stale.
              onChange({ note: noteRef.current?.value.trim() || undefined });
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function groupByPage(marks: Mark[]) {
  const groups = new Map<string, { key: string; title: string; site: string; marks: Mark[] }>();
  for (const mark of marks) {
    const key = mark.conversationId;
    const group = groups.get(key) ?? {
      key,
      title: mark.conversationTitle || 'Saved text',
      site: hostOf(mark.url),
      marks: [],
    };
    group.marks.push(mark);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** Empty for text shared from an app, which has no site to name. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
