import { useEffect, useMemo, useState } from 'preact/hooks';
import { linkToMark } from '../../src/core/link';
import { buildMemo, memoMarkdown } from '../../src/core/memo';
import { UI_COLORS } from '../../src/core/painter';
import { hueOf, initials, nameIn, type Person } from '../../src/core/people';
import { searchLibrary } from '../../src/core/search';
import {
  addComment,
  addFinding,
  addMark,
  addQuestion,
  closeQuestion,
  commentsOn,
  createSpace,
  editComment,
  gathererOf,
  isSettled,
  isShared,
  marksIn,
  peopleOf,
  recordDecision,
  removeComment,
  removeFinding,
  removeMark,
  reopen,
  setSettled,
  statusOf,
  type Space,
  type Stance,
} from '../../src/core/spaces';
import { adoptSpace, packSpace, readSharedSpace, shareFilename } from '../../src/core/spaceShare';
import { checkSpace, DECISION, signMine, type Checked } from '../../src/core/spaceSign';
import type { Mark } from '../../src/core/types';
import { loadSigningKey, removeSpace, saveSpace } from './storage';

/**
 * Spaces, on a phone.
 *
 * The same model as the extension — the question, the passages that bear on
 * it, what was concluded, and the write-up that falls out — on a screen four
 * inches wide. What changes is not what a space is but how much of it you see
 * at once: one section at a time, and the thread under a passage stays shut
 * until it is asked for.
 *
 * A phone is also where a space most often arrives from somebody else, which
 * is why opening a file and handing one back matter more here than anywhere.
 */

const STANCE_LABEL: Record<Stance, string> = {
  supports: 'In favour',
  contradicts: 'Against',
  open: 'Unclear',
};

function download(contents: string, type: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Avatar({ person, small = false }: { person: Person; small?: boolean }) {
  return (
    <span
      class={small ? 'app-av app-av-sm' : 'app-av'}
      // 28% lightness is what keeps white initials above 5:1 at every hue.
      style={{ background: `hsl(${hueOf(person.id)} 55% 28%)` }}
      aria-hidden="true"
    >
      {initials(person.name)}
    </span>
  );
}

/** A tick beside a name whose work here checks out against the key you hold. */
function Proven({ by, checked }: { by?: string; checked: Checked | null }) {
  if (!by || !checked?.proven.has(by)) return null;
  return (
    <span class="app-proven" title="Signed with the key you hold for them">
      ✓
    </span>
  );
}

function Broken({ id, checked }: { id: string; checked: Checked | null }) {
  if (!checked?.broken.has(id)) return null;
  return <span class="app-broken">does not check out</span>;
}

export function SpacesList({
  spaces,
  marks,
  me,
  onOpen,
  onBack,
  say,
}: {
  spaces: Space[];
  marks: Mark[];
  me: Person | null;
  onOpen: (id: string) => void;
  onBack: () => void;
  say: (message: string) => void;
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [question, setQuestion] = useState('');

  const make = async () => {
    if (!name.trim()) return;
    const space = createSpace(name, question);
    await saveSpace(space);
    setNaming(false);
    setName('');
    setQuestion('');
    onOpen(space.id);
  };

  const openFile = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const taken = adoptSpace(readSharedSpace(await file.text()), marks, spaces);
      await saveSpace(taken.space);
      const from = taken.from ? ` from ${taken.from.name}` : '';
      say(taken.merged ? `Merged what came back${from}.` : `Opened that space${from}.`);
      onOpen(taken.space.id);
    } catch (error) {
      say(error instanceof Error ? error.message : 'That file could not be opened.');
    }
  };

  return (
    <section class="app-spaces">
      <div class="app-crumbs">
        <button class="app-tool" onClick={onBack}>
          ← Highlights
        </button>
      </div>

      <h2 class="app-h2">Spaces</h2>
      <p class="app-lede">
        A space is one question and the highlights that answer it. Gather a few and you have
        a write-up, every passage quoted with a link to the exact sentence.
      </p>

      {spaces.length === 0 && !naming && (
        <p class="app-empty">No spaces yet.</p>
      )}

      <ul class="app-space-list">
        {spaces.map((space) => {
          const status = statusOf(space);
          const people = peopleOf(space);
          return (
            <li key={space.id}>
              <button class="app-space" onClick={() => onOpen(space.id)}>
                <span class="app-space-top">
                  <strong>{space.name}</strong>
                  <span class={`app-status app-status-${status}`}>
                    {status === 'shelf' ? 'Shelf' : status === 'settled' ? 'Settled' : 'Open'}
                  </span>
                </span>
                {space.question && <span class="app-space-q">{space.question}</span>}
                <span class="app-space-counts">
                  {people.length > 1 && (
                    <span class="app-faces">
                      {people.map((person) => (
                        <Avatar key={person.id} person={person} small />
                      ))}
                    </span>
                  )}
                  {space.markIds.length} {space.markIds.length === 1 ? 'highlight' : 'highlights'}
                  {space.findings.length > 0 && ` · ${space.findings.length} concluded`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {naming ? (
        <form
          class="app-space-new"
          onSubmit={(event) => {
            event.preventDefault();
            void make();
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
          <div class="app-row">
            <button type="submit" class="app-save" disabled={!name.trim()}>
              Create
            </button>
            <button type="button" class="app-tool" onClick={() => setNaming(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div class="app-row">
          <button class="app-save" onClick={() => setNaming(true)}>
            New space
          </button>
          <label class="app-tool app-file">
            Open one someone sent
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => void openFile(event)}
            />
          </label>
        </div>
      )}
    </section>
  );
}

export function SpaceView({
  space,
  marks,
  me,
  onBack,
  say,
}: {
  space: Space;
  marks: Mark[];
  me: Person | null;
  onBack: () => void;
  say: (message: string) => void;
}) {
  const [claim, setClaim] = useState('');
  const [stance, setStance] = useState<Stance>('supports');
  const [question, setQuestion] = useState('');
  const [decision, setDecision] = useState('');
  const [picking, setPicking] = useState(false);
  const [showMemo, setShowMemo] = useState(false);
  const [checked, setChecked] = useState<Checked | null>(null);

  const held = useMemo(() => marksIn(space, marks), [space, marks]);
  const memo = useMemo(() => buildMemo(space, marks), [space, marks]);
  const shared = isShared(space);
  const people = peopleOf(space);
  const us = shared ? 'we' : 'I';

  useEffect(() => {
    let current = true;
    void checkSpace(space).then((result) => {
      if (current) setChecked(result);
    });
    return () => {
      current = false;
    };
  }, [space]);

  const write = (next: Space): void => void saveSpace(next);

  const share = async () => {
    const privateKey = me ? loadSigningKey() : null;
    // Signed on the way out, and the signed copy kept, so signing happens once
    // rather than afresh every time the space is handed on.
    const signed = me && privateKey ? await signMine(space, me, privateKey) : space;
    if (signed !== space) await saveSpace(signed);
    download(packSpace(signed, marks, me), 'application/json', shareFilename(space));
    say('Saved the space as a file to send.');
  };

  return (
    <section class="app-space-view">
      <div class="app-crumbs">
        <button class="app-tool" onClick={onBack}>
          ← All spaces
        </button>
        <button class="app-tool" onClick={() => void share()}>
          Share
        </button>
      </div>

      <h2 class="app-h2">{space.question ?? space.name}</h2>
      <p class="app-space-counts">
        {shared && (
          <span class="app-faces">
            {people.map((person) => (
              <Avatar key={person.id} person={person} small />
            ))}
          </span>
        )}
        {shared && `${people.length} people · `}
        {held.length} {held.length === 1 ? 'highlight' : 'highlights'}
        {space.findings.length > 0 && ` · ${space.findings.length} concluded`}
        {(space.openQuestions?.length ?? 0) > 0 && ` · ${space.openQuestions.length} still open`}
      </p>

      {checked && checked.broken.size > 0 && (
        <p class="app-alarm" role="alert">
          {checked.broken.size === 1 ? 'One thing here does not' : `${checked.broken.size} things here do not`} match the
          key it was signed with. Nothing has been removed; look for “does not check out”.
        </p>
      )}

      {space.decision ? (
        <div class="app-decision">
          <h3>Decision</h3>
          <p>{space.decision.body}</p>
          {shared && space.decision.by && (
            <p class="app-by">
              — {nameIn(space.people, space.decision.by)}
              <Proven by={space.decision.by} checked={checked} />
              <Broken id={DECISION} checked={checked} />
            </p>
          )}
          <button class="app-tool" onClick={() => write(reopen(space))}>
            Reopen
          </button>
        </div>
      ) : (
        <form
          class="app-space-new"
          onSubmit={(event) => {
            event.preventDefault();
            if (!decision.trim()) return;
            write(recordDecision(space, decision, me));
            setDecision('');
          }}
        >
          <input
            type="text"
            placeholder="So what are we doing?"
            value={decision}
            onInput={(event) => setDecision((event.currentTarget as HTMLInputElement).value)}
          />
          <button type="submit" class="app-tool" disabled={!decision.trim()}>
            Record the decision
          </button>
        </form>
      )}

      <h3 class="app-h3">What {us} concluded</h3>
      {space.findings.length === 0 && (
        <p class="app-empty">Nothing yet. Draw one out of the passages below.</p>
      )}
      <ul class="app-findings">
        {space.findings.map((finding) => (
          <li key={finding.id} class={`app-finding app-finding-${finding.stance}`}>
            <span class="app-stance">{STANCE_LABEL[finding.stance]}</span>
            <p>{finding.claim}</p>
            {shared && finding.by && (
              <p class="app-by">
                — {nameIn(space.people, finding.by)}
                <Proven by={finding.by} checked={checked} />
                <Broken id={finding.id} checked={checked} />
              </p>
            )}
            <button class="app-tool" onClick={() => write(removeFinding(space, finding.id))}>
              Remove
            </button>
          </li>
        ))}
      </ul>

      <form
        class="app-space-new"
        onSubmit={(event) => {
          event.preventDefault();
          if (!claim.trim()) return;
          write(addFinding(space, claim, stance, space.markIds, me));
          setClaim('');
        }}
      >
        <input
          type="text"
          placeholder={`What do ${us === 'we' ? 'we' : 'I'} now believe?`}
          value={claim}
          onInput={(event) => setClaim((event.currentTarget as HTMLInputElement).value)}
        />
        <div class="app-row">
          <select
            aria-label="How this sits with the question"
            value={stance}
            onChange={(event) => setStance((event.currentTarget as HTMLSelectElement).value as Stance)}
          >
            <option value="supports">In favour</option>
            <option value="contradicts">Against</option>
            <option value="open">Unclear</option>
          </select>
          <button type="submit" class="app-tool" disabled={!claim.trim()}>
            Add
          </button>
        </div>
      </form>

      <h3 class="app-h3">Still open</h3>
      <ul class="app-questions">
        {(space.openQuestions ?? []).map((text, index) => (
          <li key={text}>
            <span>{text}</span>
            <button class="app-tool" onClick={() => write(closeQuestion(space, index))}>
              Answered
            </button>
          </li>
        ))}
      </ul>
      <form
        class="app-space-new"
        onSubmit={(event) => {
          event.preventDefault();
          if (!question.trim()) return;
          write(addQuestion(space, question));
          setQuestion('');
        }}
      >
        <input
          type="text"
          placeholder={`What do ${us} still not know?`}
          value={question}
          onInput={(event) => setQuestion((event.currentTarget as HTMLInputElement).value)}
        />
        <button type="submit" class="app-tool" disabled={!question.trim()}>
          Add
        </button>
      </form>

      <h3 class="app-h3">Highlights</h3>
      {held.length === 0 && <p class="app-empty">Nothing gathered yet.</p>}
      <ul class="app-evidence">
        {held.map((mark) => (
          <Evidence
            key={mark.id}
            mark={mark}
            space={space}
            me={me}
            checked={checked}
            shared={shared}
          />
        ))}
      </ul>

      <div class="app-row">
        <button class="app-tool" onClick={() => setPicking(!picking)}>
          {picking ? 'Done gathering' : 'Gather highlights'}
        </button>
        <button class="app-tool" onClick={() => setShowMemo(!showMemo)}>
          {showMemo ? 'Hide the write-up' : 'Write it up'}
        </button>
      </div>

      {picking && <Picker space={space} marks={marks} me={me} />}

      {showMemo && (
        <div class="app-memo">
          <pre>{memoMarkdown(memo)}</pre>
          <div class="app-row">
            <button
              class="app-tool"
              onClick={() => {
                void navigator.clipboard?.writeText(memoMarkdown(memo)).then(
                  () => say('Write-up copied.'),
                  () => say('Could not copy — it is on screen to select.'),
                );
              }}
            >
              Copy
            </button>
            <button
              class="app-tool"
              onClick={() =>
                download(
                  memoMarkdown(memo),
                  'text/markdown',
                  `${space.name.replace(/[^\w-]+/g, '-').toLowerCase()}.md`,
                )
              }
            >
              Save as Markdown
            </button>
          </div>
        </div>
      )}

      <div class="app-row app-space-foot">
        <button
          class="app-danger"
          onClick={() => {
            void removeSpace(space.id).then(onBack);
          }}
        >
          Delete this space
        </button>
      </div>
    </section>
  );
}

function Evidence({
  mark,
  space,
  me,
  checked,
  shared,
}: {
  mark: Mark;
  space: Space;
  me: Person | null;
  checked: Checked | null;
  shared: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState('');

  const comments = commentsOn(space, mark.id);
  const settled = isSettled(space, mark.id);
  const found = shared ? gathererOf(space, mark.id) : null;
  const link = linkToMark(mark);
  const write = (next: Space): void => void saveSpace(next);

  const label = settled ? 'Settled' : comments.length === 0 ? 'Reply' : `${comments.length} ${comments.length === 1 ? 'reply' : 'replies'}`;

  return (
    <li class={settled ? 'app-ev app-ev-settled' : 'app-ev'}>
      <span class="app-ev-dot" style={{ background: UI_COLORS[mark.color] }} />
      <p class="app-ev-text">{mark.snapshot}</p>
      <p class="app-ev-meta">
        {mark.conversationTitle}
        {found && ` · found by ${found.name}`}
      </p>
      <div class="app-row">
        {link && (
          <a class="app-tool" href={link} target="_blank" rel="noreferrer noopener">
            Open the exact sentence
          </a>
        )}
        <button class="app-tool" onClick={() => setOpen(!open)}>
          {label}
        </button>
        <button class="app-tool" onClick={() => write(removeMark(space, mark.id))}>
          Take out
        </button>
      </div>

      {open && (
        <div class="app-thread">
          <ul class="app-comments">
            {comments.map((comment) => {
              const who = comment.by
                ? (space.people ?? []).find((person) => person.id === comment.by)
                : undefined;
              const mine = !comment.by || comment.by === me?.id;
              return (
                <li key={comment.id}>
                  {who && <Avatar person={who} small />}
                  <div>
                    <strong>{who ? who.name : 'Someone'}</strong>
                    {mine && <span class="app-mine">you</span>}
                    {comment.editedAt && <span class="app-edited">edited</span>}
                    {/* A tick is worth drawing only once somebody else could
                        have written this. A broken one always is. */}
                    {shared && <Proven by={comment.by} checked={checked} />}
                    <Broken id={comment.id} checked={checked} />
                    {editing === comment.id ? (
                      <form
                        class="app-row"
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
                          onInput={(event) => setEdit((event.currentTarget as HTMLInputElement).value)}
                        />
                        <button type="submit" class="app-tool" disabled={!edit.trim()}>
                          Save
                        </button>
                      </form>
                    ) : (
                      <p>{comment.body}</p>
                    )}
                  </div>
                  {mine && !settled && editing !== comment.id && (
                    <span class="app-row">
                      <button
                        class="app-tool"
                        onClick={() => {
                          setEdit(comment.body);
                          setEditing(comment.id);
                        }}
                      >
                        Edit
                      </button>
                      <button class="app-tool" onClick={() => write(removeComment(space, comment.id))}>
                        Delete
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {!settled && (
            <form
              class="app-row"
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.trim()) return;
                write(addComment(space, mark.id, draft, me));
                setDraft('');
              }}
            >
              <input
                type="text"
                placeholder="What do you make of it?"
                value={draft}
                onInput={(event) => setDraft((event.currentTarget as HTMLInputElement).value)}
              />
              <button type="submit" class="app-tool" disabled={!draft.trim()}>
                Reply
              </button>
            </form>
          )}

          <button class="app-tool" onClick={() => write(setSettled(space, mark.id, !settled))}>
            {settled ? 'Reopen this thread' : 'Settle this thread'}
          </button>
        </div>
      )}
    </li>
  );
}

function Picker({ space, marks, me }: { space: Space; marks: Mark[]; me: Person | null }) {
  const [query, setQuery] = useState('');
  const inSpace = new Set(space.markIds);

  // The whole library is searched, so the index is the same one every time and
  // a word is judged against everything kept. What is here already drops out after.
  const found = useMemo(() => {
    if (!query.trim()) return { marks: [...marks], alsoMatched: [] as string[] };
    return searchLibrary(marks, query);
  }, [marks, query]);

  const candidates = found.marks.filter((mark) => !inSpace.has(mark.id)).slice(0, 30);

  return (
    <div class="app-picker">
      <input
        type="search"
        placeholder="Search your highlights"
        value={query}
        onInput={(event) => setQuery((event.currentTarget as HTMLInputElement).value)}
      />
      {found.alsoMatched.length > 0 && (
        <p class="app-also">
          Also matched {found.alsoMatched.join(' · ')} — words your own highlights keep beside
          what you typed.
        </p>
      )}
      {candidates.length === 0 ? (
        <p class="app-empty">
          {marks.length === 0 ? 'Nothing kept yet.' : 'Nothing left to add that matches.'}
        </p>
      ) : (
        <ul class="app-candidates">
          {candidates.map((mark) => (
            <li key={mark.id}>
              <button onClick={() => void saveSpace(addMark(space, mark.id, me))}>
                <span class="app-ev-dot" style={{ background: UI_COLORS[mark.color] }} />
                <span>{mark.snapshot}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
