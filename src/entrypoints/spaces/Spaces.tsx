import { browser } from '#imports';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { linkToMark } from '../../core/link';
import { buildMemo, memoMarkdown } from '../../core/memo';
import { UI_COLORS } from '../../core/painter';
import { searchLibrary } from '../../core/search';
import { hueOf, initials, nameIn, type Person } from '../../core/people';
import { adoptSpace, packSpace, readSharedSpace, shareFilename } from '../../core/spaceShare';
import { checkSpace, DECISION, signMine, type Checked } from '../../core/spaceSign';
import { fingerprint } from '../../core/identity';
import { useFolderSync } from '../../ui/useFolderSync';
import { siteLabel } from '../../core/sites';
import {
  importMarks,
  loadAllMarks,
  ensureSigningKey,
  loadMe,
  loadSigningKey,
  loadSpaces,
  removeSpace,
  saveMe,
  saveSpace,
  syncStore,
  watchAllMarks,
  watchMe,
  watchSpaces,
} from '../../core/store';
import { browserFolders } from '../../core/folder';
import {
  addComment,
  addFinding,
  addMark,
  addQuestion,
  closeQuestion,
  commentsOn,
  createSpace,
  editComment,
  editFinding,
  gathererOf,
  isSettled,
  isShared,
  marksIn,
  peopleOf,
  recordDecision,
  removeComment,
  removeFinding,
  removeMark,
  rename,
  reopen,
  setSettled,
  sourcesFor,
  statusOf,
  unusedIn,
  type Space,
  type Stance,
} from '../../core/spaces';
import { applyTheme, loadTheme, watchTheme, type Theme } from '../../core/theme';
import type { Mark } from '../../core/types';

function download(contents: string, type: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const STANCE_LABEL: Record<Stance, string> = {
  supports: 'In favour',
  contradicts: 'Against',
  open: 'Unsettled',
};

const spaceFromUrl = (): string | null => location.hash.replace(/^#\/?/, '') || null;

/** Escape gets you out of a form, the way it closes a note in the page. */
const onEscape = (cancel: () => void) => (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    cancel();
  }
};

export function Spaces() {
  const [spaces, setSpaces] = useState<Space[] | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [me, setMe] = useState<Person | null>(null);
  const [openId, setOpenId] = useState<string | null>(spaceFromUrl);
  // What happened when a space arrived. It is set as the view switches to the
  // new space, so it has to live above both views to survive the switch.
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const reload = () => void loadSpaces().then(setSpaces);
    reload();
    return watchSpaces(setSpaces);
  }, []);

  useEffect(() => {
    const reload = () => void loadAllMarks().then(setMarks);
    reload();
    return watchAllMarks(reload);
  }, []);

  useEffect(() => {
    // Not just loading: somebody who put their name in before any of this
    // existed gets a key here, without having to do anything about it.
    void ensureSigningKey().then(setMe);
    return watchMe(setMe);
  }, []);

  useEffect(() => {
    const use = (next: Theme) => applyTheme(next);
    void loadTheme().then(use);
    return watchTheme(use);
  }, []);

  useEffect(() => {
    const onHash = () => setOpenId(spaceFromUrl());
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, []);

  const open = (id: string | null): void => {
    location.hash = id ? `/${id}` : '';
    setOpenId(id);
  };

  const space = spaces?.find((entry) => entry.id === openId) ?? null;

  // Deleting a space takes its findings and its decision with it, so it gets
  // the same few seconds of Undo that deleting a highlight does.
  const [deleted, setDeleted] = useState<Space | null>(null);
  useEffect(() => {
    if (!deleted) return;
    const timer = setTimeout(() => setDeleted(null), 8000);
    return () => clearTimeout(timer);
  }, [deleted]);

  return (
    <main class="sp">
      <header class="sp-top">
        <h1>{space ? space.name : 'Spaces'}</h1>
        <span class="sp-row">
          <FolderSync />
          <You me={me} />
          <a class="sp-tool" href={browser.runtime.getURL('/library.html')}>
            Library
          </a>
          <a class="sp-tool" href={browser.runtime.getURL('/plans.html')}>
            Plans
          </a>
        </span>
      </header>

      {note && (
        <div class="sp-note">
          <span>{note}</span>
          <button type="button" class="sp-tool" onClick={() => setNote(null)}>
            Dismiss
          </button>
        </div>
      )}

      {deleted && (
        <div class="sp-undo">
          <span>Deleted “{deleted.name}”.</span>
          <button
            type="button"
            class="sp-tool"
            onClick={() => {
              const back = deleted;
              setDeleted(null);
              void saveSpace(back).then(() => open(back.id));
            }}
          >
            Undo
          </button>
        </div>
      )}

      {spaces === null ? (
        <p class="sp-empty">Loading…</p>
      ) : space ? (
        <SpaceView
          space={space}
          marks={marks}
          me={me}
          onBack={() => open(null)}
          onDeleted={(gone) => {
            setDeleted(gone);
            open(null);
          }}
        />
      ) : (
        <SpaceList spaces={spaces} marks={marks} me={me} onOpen={open} onNote={setNote} />
      )}
    </main>
  );
}

/**
 * Your name, which is the whole of signing in here.
 *
 * It is optional and it stays on this computer until you hand a space over, at
 * which point it travels inside the file so the other side can put your name
 * against your work. Nothing verifies it; it is good enough for three people
 * passing a question around, which is what this is for.
 */
function You({ me }: { me: Person | null }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(me?.name ?? '');

  if (!editing) {
    return (
      <button
        type="button"
        class="sp-tool sp-you"
        title={me ? 'Change the name on your work' : 'Put your name to your work'}
        onClick={() => {
          setDraft(me?.name ?? '');
          setEditing(true);
        }}
      >
        {me ? (
          <>
            <Avatar person={me} /> {me.name}
          </>
        ) : (
          'Add your name'
        )}
      </button>
    );
  }

  return (
    <form
      class="sp-row sp-you-edit"
      onKeyDown={onEscape(() => setEditing(false))}
      onSubmit={(event) => {
        event.preventDefault();
        void saveMe(draft);
        setEditing(false);
      }}
    >
      <input
        type="text"
        aria-label="Your name"
        placeholder="Your name"
        value={draft}
        autofocus
        onInput={(event) => setDraft((event.currentTarget as HTMLInputElement).value)}
      />
      <button type="submit" class="sp-tool">
        Save
      </button>
      <button type="button" class="sp-tool" onClick={() => setEditing(false)}>
        Cancel
      </button>
    </form>
  );
}

function Avatar({ person, small }: { person: Person; small?: boolean }) {
  return (
    <span
      class={small ? 'sp-av sp-av-sm' : 'sp-av'}
      // 28% lightness keeps white initials above 5:1 at every hue, including
      // the yellows that catch a filled chip out.
      style={{ background: `hsl(${hueOf(person.id)} 55% 28%)` }}
      aria-hidden="true"
    >
      {initials(person.name)}
    </span>
  );
}

function SpaceList({
  spaces,
  marks,
  me,
  onOpen,
  onNote,
}: {
  spaces: Space[];
  marks: Mark[];
  me: Person | null;
  onOpen: (id: string) => void;
  onNote: (note: string) => void;
}) {
  const [name, setName] = useState('');
  const [question, setQuestion] = useState('');
  const [adding, setAdding] = useState(false);

  /**
   * Taking in a space somebody sent. The highlights it carries are merged into
   * the library — anything you already had stays yours — and the space arrives
   * with its claims pointing at your copies. See `core/share`.
   */
  const importSpace = async (event: Event): Promise<void> => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // so the same file can be picked again
    if (!file) return;
    try {
      const incoming = readSharedSpace(await file.text());
      const taken = adoptSpace(incoming, marks, spaces);
      if (taken.added.length > 0 || taken.updated.length > 0) {
        await importMarks([...taken.added, ...taken.updated]);
      }
      await saveSpace(taken.space);

      const sender = taken.from ? ` from ${taken.from.name}` : '';
      const parts = [
        taken.merged
          ? `“${taken.space.name}” came back${sender} with their work in it`
          : `“${taken.space.name}”${sender} is yours`,
      ];
      if (taken.added.length > 0) parts.push(`${taken.added.length} new highlights`);
      if (taken.reused > 0) parts.push(`${taken.reused} you already had`);
      const { conclusions, replies, questions } = taken.gained;
      if (conclusions > 0)
        parts.push(`${conclusions} ${conclusions === 1 ? 'conclusion' : 'conclusions'}`);
      if (replies > 0) parts.push(`${replies} ${replies === 1 ? 'reply' : 'replies'}`);
      if (questions > 0)
        parts.push(`${questions} open ${questions === 1 ? 'question' : 'questions'}`);
      if (taken.updated.length > 0) parts.push(`${taken.updated.length} picked up a note`);
      if (taken.dropped > 0) parts.push(`${taken.dropped} unreadable and skipped`);
      onNote(`${parts.join(' · ')}.`);
      onOpen(taken.space.id);
    } catch (error) {
      onNote(error instanceof Error ? error.message : 'That file could not be opened.');
    }
  };

  const create = (): void => {
    if (!name.trim()) return;
    const space = createSpace(name, question);
    void saveSpace(space).then(() => onOpen(space.id));
    setName('');
    setQuestion('');
    setAdding(false);
  };

  return (
    <>
      <p class="sp-lede">
        A space is one question and the highlights that answer it. Gather a few and you have
        a write-up — every passage quoted, each with a link that lands on the exact sentence.
        Conclude something and it goes on top, citing what it rests on. A space is also a
        file you can hand to anyone, and take back with their work in it.
      </p>

      {adding ? (
        <form
          class="sp-new"
          onKeyDown={onEscape(() => setAdding(false))}
          onSubmit={(event) => {
            event.preventDefault();
            create();
          }}
        >
          <input
            type="text"
            placeholder="Name it — “Postgres 17 upgrade”"
            value={name}
            autofocus
            onInput={(event) => setName((event.currentTarget as HTMLInputElement).value)}
          />
          <input
            type="text"
            placeholder="What are you trying to settle? (optional)"
            value={question}
            onInput={(event) => setQuestion((event.currentTarget as HTMLInputElement).value)}
          />
          <div class="sp-row">
            <button type="submit" class="sp-primary" disabled={!name.trim()}>
              Create
            </button>
            <button type="button" class="sp-tool" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div class="sp-row">
          <button type="button" class="sp-primary" onClick={() => setAdding(true)}>
            New space
          </button>
          <label class="sp-tool sp-file">
            Open one someone sent
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) => void importSpace(event)}
            />
          </label>
        </div>
      )}


      {spaces.length === 0 ? (
        <p class="sp-empty">
          No spaces yet. Make one for whatever you are trying to work out, then gather the
          highlights that bear on it — from here, or with the tray button on a highlight in
          the panel while you are still reading.
        </p>
      ) : (
        <ul class="sp-list">
          {spaces.map((space) => {
            const status = statusOf(space);
            const held = marksIn(space, marks).length;
            return (
              <li key={space.id}>
                <button type="button" class="sp-card" onClick={() => onOpen(space.id)}>
                  <span class="sp-card-top">
                    <strong>{space.name}</strong>
                    <span class={`sp-status sp-${status}`}>
                      {status === 'shelf' ? 'Shelf' : status === 'settled' ? 'Settled' : 'Open'}
                    </span>
                  </span>
                  {space.question && <span class="sp-question">{space.question}</span>}
                  <span class="sp-counts">
                    {held} {held === 1 ? 'highlight' : 'highlights'}
                    {space.findings.length > 0 &&
                      ` · ${space.findings.length} ${
                        space.findings.length === 1 ? 'conclusion' : 'conclusions'
                      }`}
                    {space.openQuestions.length > 0 && ` · ${space.openQuestions.length} open`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function SpaceView({
  space,
  marks,
  me,
  onBack,
  onDeleted,
}: {
  space: Space;
  marks: Mark[];
  me: Person | null;
  onBack: () => void;
  onDeleted: (space: Space) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [claim, setClaim] = useState('');
  const [stance, setStance] = useState<Stance>('supports');
  const [chosen, setChosen] = useState<string[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [decision, setDecision] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(space.name);
  const [draftQuestion, setDraftQuestion] = useState(space.question ?? '');
  const [editingFinding, setEditingFinding] = useState<string | null>(null);
  const [draftClaim, setDraftClaim] = useState('');
  const [openEvidence, setOpenEvidence] = useState<string[]>([]);
  const [showMemo, setShowMemo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checked, setChecked] = useState<Checked | null>(null);
  const [prints, setPrints] = useState<Record<string, string>>({});

  // Checking signatures means a trip through WebCrypto per contribution, so it
  // happens here rather than in the render, and only when the space changes.
  useEffect(() => {
    let current = true;
    void checkSpace(space).then((result) => {
      if (current) setChecked(result);
    });
    return () => {
      current = false;
    };
  }, [space]);

  // A fingerprint is for the one thing software cannot settle: two people
  // confirming out loud that they are talking about each other.
  useEffect(() => {
    let current = true;
    const keyed = (space.people ?? []).filter((person) => person.key);
    void Promise.all(
      keyed.map(async (person) => [person.id, await fingerprint(person.key!)] as const),
    ).then((pairs) => {
      if (!current) return;
      setPrints(Object.fromEntries(pairs.filter(([, print]) => print) as [string, string][]));
    });
    return () => {
      current = false;
    };
  }, [space.people]);

  const signing: Signing = { checked, prints };

  const held = useMemo(() => marksIn(space, marks), [space, marks]);
  const unused = useMemo(() => unusedIn(space, marks), [space, marks]);
  const memo = useMemo(() => buildMemo(space, marks), [space, marks]);
  const status = statusOf(space);
  // Once more than one person has worked here the page stops saying "I".
  const shared = isShared(space);
  const people = peopleOf(space);
  const us = shared ? 'we' : 'I';

  const write = (next: Space): void => void saveSpace(next);

  const toggleEvidence = (id: string): void =>
    setOpenEvidence(
      openEvidence.includes(id) ? openEvidence.filter((e) => e !== id) : [...openEvidence, id],
    );

  const copyMemo = (): void => {
    void navigator.clipboard?.writeText(memoMarkdown(memo)).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      },
      () => {
        // Clipboard permission can be refused; the write-up is on screen anyway.
      },
    );
  };

  const exportMemo = (): void => {
    download(
      memoMarkdown(memo),
      'text/markdown',
      `${space.name.replace(/[^\w-]+/g, '-').toLowerCase()}.md`,
    );
  };

  /**
   * The whole space as a file: the question, the passages, the conclusions and
   * the links. Whoever opens it carries on from here — see `core/share`.
   */
  const shareSpace = async (): Promise<void> => {
    const privateKey = me ? await loadSigningKey() : null;
    // Signed on the way out, and the signed copy kept, so that signing is done
    // once rather than afresh every time the space is handed on — and so your
    // own copy can show your own work as checked.
    const signed = me && privateKey ? await signMine(space, me, privateKey) : space;
    if (signed !== space) await saveSpace(signed);
    download(packSpace(signed, marks, me), 'application/json', shareFilename(space));
  };

  return (
    <>
      <div class="sp-head">
      <div class="sp-row sp-between">
        <button type="button" class="sp-tool" onClick={onBack}>
          ← All spaces
        </button>
        <span class="sp-row">
        <span class={`sp-status sp-${status}`}>
          {status === 'shelf' ? 'Shelf' : status === 'settled' ? 'Settled' : 'Open'}
        </span>
        {!renaming && (
          <button
            type="button"
            class="sp-tool"
            onClick={() => {
              setDraftName(space.name);
              setDraftQuestion(space.question ?? '');
              setRenaming(true);
            }}
          >
            {space.question ? 'Rename' : 'Name it, or ask a question'}
          </button>
        )}
        <button type="button" class="sp-tool" onClick={() => void shareSpace()} title="Save this space as a file you can send to anyone">
          Share
        </button>
        </span>
      </div>

      {renaming ? (
        <form
          class="sp-form sp-rename"
          onKeyDown={onEscape(() => setRenaming(false))}
          onSubmit={(event) => {
            event.preventDefault();
            write(rename(space, draftName, draftQuestion));
            setRenaming(false);
          }}
        >
          <input
            type="text"
            aria-label="Name of this space"
            placeholder="Name"
            value={draftName}
            autofocus
            onInput={(event) => setDraftName((event.currentTarget as HTMLInputElement).value)}
          />
          <input
            type="text"
            aria-label="The question this space is trying to settle"
            placeholder="What are you trying to settle? (leave empty to keep it a shelf)"
            value={draftQuestion}
            onInput={(event) => setDraftQuestion((event.currentTarget as HTMLInputElement).value)}
          />
          <div class="sp-row">
            <button type="submit" class="sp-primary" disabled={!draftName.trim()}>
              Save
            </button>
            <button type="button" class="sp-tool" onClick={() => setRenaming(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <h2 class="sp-question-big">{space.question ?? space.name}</h2>
      )}
      {checked && checked.broken.size > 0 && (
        <p class="sp-alarm" role="alert">
          {checked.broken.size === 1
            ? 'One thing here does not'
            : `${checked.broken.size} things here do not`}{' '}
          match the key it was signed with — either the words were changed after it was
          signed, or it was not written by the person it names. Nothing has been removed;
          look for <strong>does not check out</strong> below.
        </p>
      )}
      <div class="sp-row sp-between sp-headfoot">
        <p class="sp-counts">
          {shared && (
            <>
              <span class="sp-faces">
                {people.map((person) => (
                  <Avatar key={person.id} person={person} small />
                ))}
              </span>
              {people.length} people ·{' '}
            </>
          )}
          {held.length} {held.length === 1 ? 'highlight' : 'highlights'}
          {space.findings.length > 0 &&
            ` · ${space.findings.length} ${space.findings.length === 1 ? 'conclusion' : 'conclusions'}`}
          {(space.comments ?? []).length > 0 &&
            ` · ${space.comments?.length} ${space.comments?.length === 1 ? 'reply' : 'replies'}`}
          {space.openQuestions.length > 0 && ` · ${space.openQuestions.length} still open`}
        </p>
        {held.length > 0 && (
          <button type="button" class="sp-primary" onClick={() => setShowMemo(!showMemo)}>
            {showMemo ? 'Hide the write-up' : 'Write it up'}
          </button>
        )}
      </div>
      </div>

      {space.decision && (
        <section class="sp-decision">
          <h2>Decision</h2>
          <p>{space.decision.body}</p>
          {shared && nameIn(space.people, space.decision.by) && (
            <p class="sp-by">
              — {nameIn(space.people, space.decision.by)}
              <Proven by={space.decision.by} signing={signing} />
              <Broken id={DECISION} signing={signing} />
            </p>
          )}
          <button type="button" class="sp-tool" onClick={() => write(reopen(space))}>
            Reopen
          </button>
        </section>
      )}

      {showMemo && (
        <section class="sp-memo">
          <div class="sp-row sp-between">
            <h2>The write-up</h2>
            <div class="sp-row">
              <button type="button" class="sp-tool" onClick={copyMemo}>
                {copied ? 'Copied' : 'Copy as Markdown'}
              </button>
              <button type="button" class="sp-tool" onClick={exportMemo}>
                Save .md
              </button>
            </div>
          </div>
          <p class="sp-muted">
            Every passage and every claim carries a link that lands on the exact sentence it
            came from — so whoever reads this can check it without having Kona.
          </p>
          <h3 class="sp-memo-title">{memo.title}</h3>
          {memo.decision && (
            <p class="sp-memo-decision">
              {memo.decision}
              {memo.decidedBy && <span class="sp-by"> — {memo.decidedBy}</span>}
            </p>
          )}
          {memo.lines.length > 0 && (
            <>
              <h3>What {us} concluded</h3>
              <ul class="sp-memo-lines">
                {memo.lines.map((line, i) => (
                  <li key={i}>
                    {line.contradicts && <em>Against: </em>}
                    {line.claim}{' '}
                    {line.cites.map((n) => (
                      <sup key={n}>
                        <a href={`#cite-${n}`}>[{n}]</a>
                      </sup>
                    ))}
                    {line.withdrawn > 0 && (
                      <em class="sp-muted"> ({line.withdrawn} no longer here)</em>
                    )}
                    {line.by && <span class="sp-by"> — {line.by}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
          {memo.highlights.length > 0 && (
            <>
              <h3>What {us} kept</h3>
              <div class="sp-memo-kept">
                {memo.highlights.map(({ n, mark, by }) => (
                  <blockquote key={mark.id}>
                    <p>{mark.snapshot}</p>
                    {mark.note && <p class="sp-memo-note">{mark.note}</p>}
                    <cite>
                      {siteLabel(mark)}{' '}
                      <sup>
                        <a href={`#cite-${n}`}>[{n}]</a>
                      </sup>
                      {by && `, found by ${by}`}
                    </cite>
                  </blockquote>
                ))}
              </div>
            </>
          )}
          {memo.open.length > 0 && (
            <>
              <h3>Still open</h3>
              <ul class="sp-memo-lines">
                {memo.open.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </>
          )}
          {memo.citations.length > 0 && (
            <>
              <h3>Sources</h3>
              <ol class="sp-memo-sources">
                {memo.citations.map((citation) => (
                  <li key={citation.n} id={`cite-${citation.n}`}>
                    {siteLabel(citation.mark)} — {citation.mark.conversationTitle}.{' '}
                    {citation.href && (
                      <a href={citation.href} target="_blank" rel="noreferrer noopener">
                        the exact sentence
                      </a>
                    )}
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      )}

      <section class="sp-section">
        <div class="sp-row sp-between">
          <h2>Highlights</h2>
          <button type="button" class="sp-tool" onClick={() => setPicking(!picking)}>
            {picking ? 'Done' : 'Gather highlights'}
          </button>
        </div>

        {picking && <Picker space={space} marks={marks} me={me} />}

        {held.length === 0 ? (
          <p class="sp-muted">
            Nothing here yet. Pull in a few highlights with <strong>Gather highlights</strong>{' '}
            and you have a write-up straight away — every passage quoted, each with a link
            under it that lands on the exact sentence it came from.
          </p>
        ) : (
          <ul class="sp-evidence">
            {held.map((mark) => (
              <Evidence
                key={mark.id}
                mark={mark}
                space={space}
                me={me}
                signing={signing}
                onRemove={() => write(removeMark(space, mark.id))}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Conclusions and open questions are both about answering a question. A
          shelf has not asked one, so it is shown neither. The write-up is not
          gated: highlights on their own already make one. */}
      {space.question && (
        <>
      <section class="sp-section">
        <h2>What {us} concluded</h2>

        {space.findings.length === 0 ? (
          <p class="sp-muted">
            Nothing yet, which is fine — the write-up already has your highlights. Add a
            conclusion when you have one and it goes on top, with the highlights it rests
            on cited under it.
          </p>
        ) : (
          <ul class="sp-findings">
            {space.findings.map((finding) => {
              const { present, withdrawn } = sourcesFor(space, finding, marks);
              const shown = openEvidence.includes(finding.id);
              return (
                <li key={finding.id} class={`sp-finding sp-${finding.stance}`}>
                  <span class={`sp-stance sp-stance-${finding.stance}`}>
                    {STANCE_LABEL[finding.stance]}
                  </span>
                  {editingFinding === finding.id ? (
                    <form
                      class="sp-row sp-claim-edit"
                      onKeyDown={onEscape(() => setEditingFinding(null))}
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (!draftClaim.trim()) return;
                        write(editFinding(space, finding.id, draftClaim));
                        setEditingFinding(null);
                      }}
                    >
                      <input
                        type="text"
                        aria-label="What this finding claims"
                        value={draftClaim}
                        autofocus
                        onInput={(event) =>
                          setDraftClaim((event.currentTarget as HTMLInputElement).value)
                        }
                      />
                      <button type="submit" class="sp-tool" disabled={!draftClaim.trim()}>
                        Save
                      </button>
                      <button
                        type="button"
                        class="sp-tool"
                        onClick={() => setEditingFinding(null)}
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <p class="sp-claim">{finding.claim}</p>
                      {shared && nameIn(space.people, finding.by) && (
                        <p class="sp-by">
                          — {nameIn(space.people, finding.by)}
                          <Proven by={finding.by} signing={signing} />
                          <Broken id={finding.id} signing={signing} />
                        </p>
                      )}
                    </>
                  )}
                  <div class="sp-row">
                    <button
                      type="button"
                      class={shown ? 'sp-tool sp-on' : 'sp-tool'}
                      aria-expanded={shown}
                      onClick={() => toggleEvidence(finding.id)}
                    >
                      {present.length} {present.length === 1 ? 'source' : 'sources'}
                    </button>
                    {editingFinding !== finding.id && (
                      <button
                        type="button"
                        class="sp-tool"
                        onClick={() => {
                          setDraftClaim(finding.claim);
                          setEditingFinding(finding.id);
                        }}
                      >
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      class="sp-tool sp-danger"
                      onClick={() => write(removeFinding(space, finding.id))}
                    >
                      Remove
                    </button>
                  </div>
                  {withdrawn > 0 && (
                    <p class="sp-withdrawn">
                      {withdrawn === 1
                        ? 'One source is no longer in this space.'
                        : `${withdrawn} sources are no longer in this space.`}
                    </p>
                  )}
                  {shown && present.length > 0 && (
                    <ul class="sp-evidence">
                      {present.map((mark) => (
                        <Evidence key={mark.id} mark={mark} />
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {unused.length > 0 && !drawing && (
          <button type="button" class="sp-tool sp-add" onClick={() => setDrawing(true)}>
            Add a conclusion
          </button>
        )}

        {drawing && (
          <form
            class="sp-form"
            onKeyDown={onEscape(() => {
              setDrawing(false);
              setClaim('');
              setChosen([]);
            })}
            onSubmit={(event) => {
              event.preventDefault();
              if (!claim.trim() || chosen.length === 0) return;
              write(addFinding(space, claim, stance, chosen, me));
              setClaim('');
              setChosen([]);
              setStance('supports');
              setDrawing(false);
            }}
          >
            <input
              type="text"
              placeholder="What do you now think? One sentence."
              value={claim}
              autofocus
              onInput={(event) => setClaim((event.currentTarget as HTMLInputElement).value)}
            />
            <p class="sp-muted">Which highlights say so?</p>
            <ul class="sp-picker">
              {unused.map((mark) => (
                <li key={mark.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={chosen.includes(mark.id)}
                      onChange={() =>
                        setChosen(
                          chosen.includes(mark.id)
                            ? chosen.filter((id) => id !== mark.id)
                            : [...chosen, mark.id],
                        )
                      }
                    />
                    <span>
                      {siteLabel(mark)} · {mark.snapshot.slice(0, 90)}
                      {mark.snapshot.length > 90 ? '…' : ''}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div class="sp-row">
              <select
                aria-label="How this finding relates to the question"
                value={stance}
                onChange={(event) =>
                  setStance((event.currentTarget as HTMLSelectElement).value as Stance)
                }
              >
                <option value="supports">My highlights back this up</option>
                <option value="contradicts">My highlights argue against it</option>
                <option value="open">I am not sure yet</option>
              </select>
              <button type="submit" class="sp-primary" disabled={!claim.trim() || !chosen.length}>
                Add
              </button>
              <button
                type="button"
                class="sp-tool"
                onClick={() => {
                  setDrawing(false);
                  setClaim('');
                  setChosen([]);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      <section class="sp-section">
        <h2>Still open</h2>
        {space.openQuestions.length === 0 ? (
          <p class="sp-muted">Nothing outstanding.</p>
        ) : (
          <ul class="sp-questions">
            {space.openQuestions.map((entry, index) => (
              <li key={entry}>
                <span>{entry}</span>
                <button
                  type="button"
                  class="sp-tool"
                  onClick={() => write(closeQuestion(space, index))}
                >
                  Settled
                </button>
              </li>
            ))}
          </ul>
        )}

        {asking ? (
          <form
            class="sp-row"
            onKeyDown={onEscape(() => setAsking(false))}
            onSubmit={(event) => {
              event.preventDefault();
              if (!question.trim()) return;
              write(addQuestion(space, question));
              setQuestion('');
              setAsking(false);
            }}
          >
            <input
              type="text"
              placeholder="What do you still not know?"
              value={question}
              autofocus
              onInput={(event) => setQuestion((event.currentTarget as HTMLInputElement).value)}
            />
            <button type="submit" class="sp-tool" disabled={!question.trim()}>
              Add
            </button>
            <button type="button" class="sp-tool" onClick={() => setAsking(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <button type="button" class="sp-tool sp-add" onClick={() => setAsking(true)}>
            Add a question
          </button>
        )}

        {!space.decision && (
          <div class="sp-settle">
            {deciding ? (
              <form
                class="sp-row"
                onKeyDown={onEscape(() => setDeciding(false))}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!decision.trim()) return;
                  write(recordDecision(space, decision, me));
                  setDecision('');
                  setDeciding(false);
                }}
              >
                <input
                  type="text"
                  placeholder="So what are you doing?"
                  value={decision}
                  autofocus
                  onInput={(event) => setDecision((event.currentTarget as HTMLInputElement).value)}
                />
                <button type="submit" class="sp-primary" disabled={!decision.trim()}>
                  Record it
                </button>
                <button type="button" class="sp-tool" onClick={() => setDeciding(false)}>
                  Cancel
                </button>
              </form>
            ) : (
              <button type="button" class="sp-primary" onClick={() => setDeciding(true)}>
                Settle it
              </button>
            )}
          </div>
        )}
      </section>
        </>
      )}

      <div class="sp-row sp-footer">
        <button
          type="button"
          class="sp-tool sp-danger"
          onClick={() => {
            void removeSpace(space.id).then(() => onDeleted(space));
          }}
        >
          Delete this space
        </button>
        <span class="sp-muted">
          Deleting a space leaves every highlight in the library, and leaves you a few
          seconds to undo it.
        </span>
      </div>
    </>
  );
}

/**
 * Sync, on the page where somebody else's reply would arrive.
 *
 * The same hook the library uses, which means two open pages each run their
 * own pass. They can overlap and one can write over a read the other had not
 * finished — and it comes out right anyway, because the merge only ever adds:
 * whatever a clobbered write dropped is still on the machine it came from and
 * goes back next pass.
 */
function FolderSync() {
  const { state, connect, reconnect, disconnect, now } = useFolderSync(browserFolders, syncStore);

  if (state.kind === 'unsupported') return null;

  if (state.kind === 'off') {
    return (
      <button
        type="button"
        class="sp-tool"
        onClick={() => void connect({ kind: 'everything' })}
        title="Share a folder with somebody and a space in it stays in step with them, with no file to send"
      >
        Sync
      </button>
    );
  }

  if (state.kind === 'needs-permission') {
    return (
      <button type="button" class="sp-tool" onClick={() => void reconnect()}>
        Reconnect {state.name}
      </button>
    );
  }

  return (
    <span class="sp-row">
      <button
        type="button"
        class="sp-tool"
        onClick={() => void now()}
        disabled={state.busy}
        title={state.trouble ?? `Syncing through ${state.name}`}
      >
        {state.busy ? 'Syncing…' : state.trouble ? 'Sync failed' : `In sync · ${state.name}`}
      </button>
      <button type="button" class="sp-tool" onClick={() => void disconnect()}>
        Stop
      </button>
    </span>
  );
}

/** Choosing from everything in the library, which is where highlights actually live. */
function Picker({ space, marks, me }: { space: Space; marks: Mark[]; me: Person | null }) {
  const [query, setQuery] = useState('');
  const inSpace = new Set(space.markIds);
  // The whole library is searched, not the part of it this space has not got,
  // so that the search is reading the same index every time and judging a word
  // against everything you have kept. What is already here drops out after.
  const found = useMemo(() => {
    if (!query.trim()) {
      const newest = [...marks].sort((a, b) => b.createdAt - a.createdAt);
      return { marks: newest, alsoMatched: [] as string[] };
    }
    return searchLibrary(marks, query);
  }, [marks, query]);
  // Best answer first while you are searching; most recent first while you are
  // only looking. Sorting by date either way would throw the ranking away.
  const candidates = useMemo(
    () => found.marks.filter((mark) => !inSpace.has(mark.id)).slice(0, 40),
    [found, space.markIds.join(',')],
  );

  return (
    <div class="sp-pick">
      <input
        type="search"
        placeholder="Search your library"
        value={query}
        onInput={(event) => setQuery((event.currentTarget as HTMLInputElement).value)}
      />
      {found.alsoMatched.length > 0 && (
        <p class="sp-muted">
          Also matched {found.alsoMatched.join(' · ')} — words your own highlights keep
          beside what you typed.
        </p>
      )}
      {candidates.length === 0 ? (
        <p class="sp-muted">
          {marks.length === 0
            ? 'Nothing in your library yet. Highlight something and it will show up here.'
            : 'Nothing left to add that matches.'}
        </p>
      ) : (
        <ul class="sp-candidates">
          {candidates.map((mark) => (
            <li key={mark.id}>
              <button type="button" onClick={() => void saveSpace(addMark(space, mark.id, me))}>
                <span class="sp-dot" style={{ background: UI_COLORS[mark.color] }} />
                <span>
                  <span class="sp-cand-meta">
                    {siteLabel(mark)} · {mark.conversationTitle}
                  </span>
                  <span class="sp-cand-text">{mark.snapshot}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * A gathered highlight, and — when it is shown inside its own space rather
 * than under a conclusion — the argument about it.
 *
 * The thread stays shut until it is asked for. A page where every passage is
 * also an open conversation is a page nobody reads to the bottom.
 */
/**
 * What a check of the space's signatures found, passed down to wherever a
 * name is shown. Null while the check is still running, which on a space of
 * any ordinary size is one frame.
 */
interface Signing {
  checked: Checked | null;
  prints: Record<string, string>;
}

/**
 * A tick beside a name whose work here all checks out against the key this
 * copy holds for them. Quiet on purpose: the ordinary case is that everything
 * is fine, and a page of green ticks teaches people to stop reading them.
 */
function Proven({ by, signing }: { by?: string; signing?: Signing }) {
  if (!by || !signing?.checked?.proven.has(by)) return null;
  const print = signing.prints[by];
  return (
    <span
      class="sp-proven"
      title={
        print
          ? `Signed with the key you hold for them — ${print}`
          : 'Signed with the key you hold for them'
      }
    >
      ✓
    </span>
  );
}

/** The loud one, because it is the only case where something is actually wrong. */
function Broken({ id, signing }: { id: string; signing?: Signing }) {
  if (!signing?.checked?.broken.has(id)) return null;
  return (
    <span
      class="sp-broken"
      title="The signature does not match. Either the words changed after it was signed, or whoever signed it was not the person it names."
    >
      does not check out
    </span>
  );
}

function Evidence({
  mark,
  space,
  me,
  signing,
  onRemove,
}: {
  mark: Mark;
  space?: Space;
  me?: Person | null;
  signing?: Signing;
  onRemove?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState('');
  const link = linkToMark(mark);

  const comments = space ? commentsOn(space, mark.id) : [];
  const settled = space ? isSettled(space, mark.id) : false;
  // Only worth saying once more than one person is in here. In a space only
  // you have touched, a credit on every passage is noise.
  const found = space && isShared(space) ? gathererOf(space, mark.id) : null;
  const write = (next: Space): void => void saveSpace(next);

  const label = settled
    ? 'Settled'
    : comments.length === 0
      ? 'Reply'
      : `${comments.length} ${comments.length === 1 ? 'reply' : 'replies'}`;

  return (
    <li class={settled ? 'sp-ev sp-ev-settled' : 'sp-ev'}>
      <span class="sp-dot" style={{ background: UI_COLORS[mark.color] }} />
      <div>
        <span class="sp-cand-meta">
          {siteLabel(mark)} · {mark.conversationTitle}
          {found && (
            <>
              {' · found by '}
              <Avatar person={found} small /> {found.name}
            </>
          )}
        </span>
        <p class="sp-ev-text">{mark.snapshot}</p>
        {mark.note && <p class="sp-ev-note">{mark.note}</p>}
        <div class="sp-row">
          {link && (
            <a class="sp-link" href={link} target="_blank" rel="noreferrer noopener">
              Open the exact sentence
            </a>
          )}
          {space && (
            <button
              type="button"
              class={open ? 'sp-link sp-link-on' : 'sp-link'}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {label}
            </button>
          )}
          {onRemove && (
            <button type="button" class="sp-link" onClick={onRemove}>
              Take out of this space
            </button>
          )}
        </div>

        {space && open && (
          <div class="sp-thread">
            {comments.length === 0 && (
              <p class="sp-muted">
                Nothing said about this one yet. Write it here and it travels with the space,
                so whoever you send it to reads the argument beside the passage rather than
                hunting for it in a chat window.
              </p>
            )}

            {comments.length > 0 && (
              <ul class="sp-comments">
                {comments.map((comment) => {
                  const who = comment.by
                    ? (space.people ?? []).find((person) => person.id === comment.by)
                    : undefined;
                  // Yours to change: one you wrote, or one written before
                  // anybody here had a name, which can only have been yours.
                  const mine = !comment.by || comment.by === me?.id;
                  return (
                    <li key={comment.id}>
                      {who && <Avatar person={who} small />}
                      <div>
                        <strong>{who ? who.name : 'Someone'}</strong>
                        {mine && <span class="sp-mine">you</span>}
                        {/* A tick is worth drawing only once somebody else
                            could have written this. A broken one always is. */}
                        {space && isShared(space) && <Proven by={comment.by} signing={signing} />}
                        <Broken id={comment.id} signing={signing} />
                        {comment.editedAt && (
                          <span class="sp-edited" title={`Reworded ${new Date(comment.editedAt).toLocaleString()}`}>
                            edited
                          </span>
                        )}
                        {editing === comment.id ? (
                          <form
                            class="sp-row"
                            onKeyDown={onEscape(() => setEditing(null))}
                            onSubmit={(event) => {
                              event.preventDefault();
                              if (!edit.trim()) return;
                              write(editComment(space, comment.id, edit));
                              setEditing(null);
                            }}
                          >
                            <input
                              type="text"
                              aria-label="Reword what you said"
                              value={edit}
                              autofocus
                              onInput={(event) =>
                                setEdit((event.currentTarget as HTMLInputElement).value)
                              }
                            />
                            <button type="submit" class="sp-tool" disabled={!edit.trim()}>
                              Save
                            </button>
                            <button
                              type="button"
                              class="sp-tool"
                              onClick={() => setEditing(null)}
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <p>{comment.body}</p>
                        )}
                      </div>
                      {mine && !settled && editing !== comment.id && (
                        <span class="sp-row">
                          <button
                            type="button"
                            class="sp-link"
                            onClick={() => {
                              setEdit(comment.body);
                              setEditing(comment.id);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            class="sp-link"
                            onClick={() => write(removeComment(space, comment.id))}
                          >
                            Delete
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {!settled && (
              <form
                class="sp-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!draft.trim()) return;
                  write(addComment(space, mark.id, draft, me ?? null));
                  setDraft('');
                }}
              >
                <input
                  type="text"
                  aria-label="Say something about this highlight"
                  placeholder="What do you make of it?"
                  value={draft}
                  onInput={(event) => setDraft((event.currentTarget as HTMLInputElement).value)}
                />
                <button type="submit" class="sp-tool" disabled={!draft.trim()}>
                  Post
                </button>
              </form>
            )}

            {comments.length > 0 && (
              <button
                type="button"
                class="sp-link"
                onClick={() => write(setSettled(space, mark.id, !settled))}
              >
                {settled ? 'Reopen this thread' : 'Settle this thread'}
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
