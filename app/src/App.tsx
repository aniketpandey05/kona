import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { createBackup, readBackup } from '../../src/core/backup';
import { linkToMark } from '../../src/core/link';
import { toMarkdown } from '../../src/core/markdown';
import { searchMarks } from '../../src/core/search';
import { countTags, sameTag, addTags, removeTag } from '../../src/core/tags';
import type { Mark } from '../../src/core/types';
import { KonaMark } from '../../src/ui/KonaMark';
import { markFromShare, readShare } from './share';
import { importMarks, loadAll, remove, save, watch } from './storage';

const UNDO_MS = 6000;

export function App() {
  const [marks, setMarks] = useState<Mark[] | null>(null);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [editing, setEditing] = useState<Mark | null>(null);
  const [deleted, setDeleted] = useState<Mark | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = () => void loadAll().then(setMarks);

  useEffect(() => {
    // A share arrives as a normal page load with the text in the query string.
    void (async () => {
      const shared = readShare(location.search);
      if (shared) {
        const mark = markFromShare(shared);
        if (mark) {
          await save(mark);
          setNotice('Saved.');
          setEditing(mark);
        } else {
          setNotice("That share didn't contain anything to keep.");
        }
        // Drop the query string so a reload cannot save the same thing twice.
        history.replaceState(null, '', location.pathname);
      }
      refresh();
    })();
    return watch(refresh);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  const tags = useMemo(() => countTags(marks ?? []), [marks]);
  const shown = useMemo(() => {
    let list = marks ?? [];
    if (tag) list = list.filter((mark) => mark.tags?.some((each) => sameTag(each, tag)));
    return query ? searchMarks(list, query) : list;
  }, [marks, query, tag]);

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
        <button class="app-tool" onClick={() => fileInput.current?.click()}>
          Import
        </button>
        <button
          class="app-tool"
          disabled={!marks?.length}
          onClick={() => download(createBackup(marks ?? []), 'application/json', 'json')}
        >
          Export
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => void onImport(e)} />
      </header>

      <input
        class="app-search"
        type="search"
        value={query}
        placeholder="Search what you've kept…"
        aria-label="Search"
        onInput={(event) => setQuery(event.currentTarget.value)}
      />

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
        <p class="app-empty">Nothing matches what you're looking for.</p>
      )}

      {groups.map((group) => (
        <section class="app-group" key={group.key}>
          <h2>
            <span class="app-site">{group.site}</span>
            <span class="app-title">{group.title}</span>
          </h2>
          <ul>
            {group.marks.map((mark) => (
              <li key={mark.id}>
                <button class="app-item" onClick={() => setEditing(mark)}>
                  <span class="app-text">{mark.snapshot || '(link only)'}</span>
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
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {marks !== null && shown.length > 0 && (
        <button class="app-markdown" onClick={() => download(toMarkdown(shown), 'text/markdown', 'md')}>
          Export these as Markdown
        </button>
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

  return (
    <div class="app-backdrop" onClick={onClose}>
      <div class="app-sheet" onClick={(event) => event.stopPropagation()}>
        <blockquote class="app-quote">{mark.snapshot || mark.url}</blockquote>

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

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'note';
  }
}
