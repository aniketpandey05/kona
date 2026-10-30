import { browser } from '#imports';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { linkToMark } from '../../core/link';
import { buildMemo, memoMarkdown } from '../../core/memo';
import { UI_COLORS } from '../../core/painter';
import { searchMarks } from '../../core/search';
import { adoptSpace, packSpace, readSharedSpace, shareFilename } from '../../core/spaceShare';
import { siteLabel } from '../../core/sites';
import {
  importMarks,
  loadAllMarks,
  loadSpaces,
  removeSpace,
  saveSpace,
  watchAllMarks,
  watchSpaces,
} from '../../core/store';
import {
  addFinding,
  addMark,
  addQuestion,
  closeQuestion,
  createSpace,
  editFinding,
  marksIn,
  recordDecision,
  removeFinding,
  removeMark,
  rename,
  reopen,
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
          onBack={() => open(null)}
          onDeleted={(gone) => {
            setDeleted(gone);
            open(null);
          }}
        />
      ) : (
        <SpaceList spaces={spaces} marks={marks} onOpen={open} onNote={setNote} />
      )}
    </main>
  );
}

function SpaceList({
  spaces,
  marks,
  onOpen,
  onNote,
}: {
  spaces: Space[];
  marks: Mark[];
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
      const taken = adoptSpace(incoming, marks);
      if (taken.added.length > 0 || taken.updated.length > 0) {
        await importMarks([...taken.added, ...taken.updated]);
      }
      await saveSpace(taken.space);

      const parts = [`“${taken.space.name}” is yours`];
      if (taken.added.length > 0) parts.push(`${taken.added.length} new highlights`);
      if (taken.reused > 0) parts.push(`${taken.reused} you already had`);
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
  onBack,
  onDeleted,
}: {
  space: Space;
  marks: Mark[];
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

  const held = useMemo(() => marksIn(space, marks), [space, marks]);
  const unused = useMemo(() => unusedIn(space, marks), [space, marks]);
  const memo = useMemo(() => buildMemo(space, marks), [space, marks]);
  const status = statusOf(space);

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
  const shareSpace = (): void => {
    download(packSpace(space, marks), 'application/json', shareFilename(space));
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
        <button type="button" class="sp-tool" onClick={shareSpace} title="Save this space as a file you can send to anyone">
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
      <div class="sp-row sp-between sp-headfoot">
        <p class="sp-counts">
          {held.length} {held.length === 1 ? 'highlight' : 'highlights'}
          {space.findings.length > 0 &&
            ` · ${space.findings.length} ${space.findings.length === 1 ? 'conclusion' : 'conclusions'}`}
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
          {memo.decision && <p class="sp-memo-decision">{memo.decision}</p>}
          {memo.lines.length > 0 && (
            <>
              <h3>What I concluded</h3>
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
                  </li>
                ))}
              </ul>
            </>
          )}
          {memo.highlights.length > 0 && (
            <>
              <h3>What I kept</h3>
              <div class="sp-memo-kept">
                {memo.highlights.map(({ n, mark }) => (
                  <blockquote key={mark.id}>
                    <p>{mark.snapshot}</p>
                    {mark.note && <p class="sp-memo-note">{mark.note}</p>}
                    <cite>
                      {siteLabel(mark)}{' '}
                      <sup>
                        <a href={`#cite-${n}`}>[{n}]</a>
                      </sup>
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

        {picking && <Picker space={space} marks={marks} />}

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
        <h2>What I concluded</h2>

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
                    <p class="sp-claim">{finding.claim}</p>
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
              write(addFinding(space, claim, stance, chosen));
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
                  write(recordDecision(space, decision));
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

/** Choosing from everything in the library, which is where highlights actually live. */
function Picker({ space, marks }: { space: Space; marks: Mark[] }) {
  const [query, setQuery] = useState('');
  const inSpace = new Set(space.markIds);
  const candidates = useMemo(() => {
    const pool = marks.filter((mark) => !inSpace.has(mark.id));
    return (query.trim() ? searchMarks(pool, query) : pool)
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 40);
  }, [marks, query, space.markIds.join(',')]);

  return (
    <div class="sp-pick">
      <input
        type="search"
        placeholder="Search your library"
        value={query}
        onInput={(event) => setQuery((event.currentTarget as HTMLInputElement).value)}
      />
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
              <button type="button" onClick={() => void saveSpace(addMark(space, mark.id))}>
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

function Evidence({ mark, onRemove }: { mark: Mark; onRemove?: () => void }) {
  const link = linkToMark(mark);
  return (
    <li class="sp-ev">
      <span class="sp-dot" style={{ background: UI_COLORS[mark.color] }} />
      <div>
        <span class="sp-cand-meta">
          {siteLabel(mark)} · {mark.conversationTitle}
        </span>
        <p class="sp-ev-text">{mark.snapshot}</p>
        {mark.note && <p class="sp-ev-note">{mark.note}</p>}
        <div class="sp-row">
          {link && (
            <a class="sp-link" href={link} target="_blank" rel="noreferrer noopener">
              Open the exact sentence
            </a>
          )}
          {onRemove && (
            <button type="button" class="sp-link" onClick={onRemove}>
              Take out of this space
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
