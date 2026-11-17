import { useMemo, useState } from 'preact/hooks';
import { FREE_SPACE_LIMIT, roomForSpace } from '../../src/core/archive';
import { titleFor } from '../../src/core/capture';
import { linkToMark } from '../../src/core/link';
import { siteLabel } from '../../src/core/sites';
import {
  addLink,
  createSpace,
  inOrder,
  moveSpace,
  removeLink,
  labelSpace,
  removeMark as takeOutOfSpace,
  rename,
  samePage,
  unlabelSpace,
  type Space,
} from '../../src/core/spaces';
import type { Mark } from '../../src/core/types';
import { Passage } from '../../src/design/Passage';
import type { LibrarySource } from './source';

/**
 * Spaces, as decision 20 settled them.
 *
 * **A space is a place to put highlights together. That is the whole of it.**
 * Findings and the write-up left the definitions entirely, a finding was only
 * ever a highlight with a note on it, and the write-up was a second way to
 * make the page 3d already provides. So what is here is the gathering, its
 * question, and its note, and nothing that grew on top.
 *
 * Why a space needs to exist, in one line: the library is organised by page,
 * so highlights about one topic read across five pages sit in five places. A
 * space is where they sit in one.
 *
 * Taking something out of a space is the third verb and the gentlest thing in
 * the product: out of this space, still in the library, still in every other
 * space, so it is the easiest thing here to reach.
 */
interface Props {
  source: LibrarySource;
  spaces: Space[];
  marks: Mark[];
  onChanged: () => void;
  openId: string | null;
  onOpen: (id: string | null) => void;
}

export function SpacesView({ source, spaces, marks, onChanged, openId, onOpen }: Props) {
  const open = spaces.find((each) => each.id === openId) ?? null;
  return open ? (
    <OneSpace
      space={open}
      marks={marks}
      onBack={() => onOpen(null)}
      onChanged={onChanged}
      save={source.saveSpace}
    />
  ) : (
    <AllSpaces spaces={spaces} onOpen={onOpen} onChanged={onChanged} source={source} />
  );
}

function AllSpaces({
  spaces,
  onOpen,
  onChanged,
  source,
}: {
  spaces: Space[];
  onOpen: (id: string) => void;
  onChanged: () => void;
  source: LibrarySource;
}) {
  // 1e: the order of your spaces is yours, the way the order of highlights
  // already is. Spaces made before there was a position sort after the ones
  // that have one, newest first, which is where they were.
  const ordered = useMemo(() => inOrder(spaces), [spaces]);
  const [goingToDelete, setGoingToDelete] = useState<string | null>(null);

  const move = async (id: string, by: -1 | 1) => {
    for (const space of moveSpace(spaces, id, by)) await source.saveSpace(space);
    onChanged();
  };

  const remove = async (id: string) => {
    await source.removeSpace(id);
    setGoingToDelete(null);
    onChanged();
  };
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [question, setQuestion] = useState('');
  // No entitlement system yet, so everybody is Free.
  const pro = false;
  const room = roomForSpace(spaces.length, pro);

  const make = async () => {
    if (!name.trim() || !room) return;
    const space = createSpace(name.trim(), question.trim() || undefined);
    await source.saveSpace(space);
    setNaming(false);
    setName('');
    setQuestion('');
    onChanged();
    onOpen(space.id);
  };

  return (
    <>
      <div class="lib-head">
        <h1>Spaces</h1>
        <p>
          {pro
            ? 'The same highlights, gathered by what you want to find out.'
            : `${spaces.length} of ${FREE_SPACE_LIMIT}. The same highlights, gathered by what you want to find out.`}
        </p>
      </div>

      {/* 7: at the cap you delete a space or you pay. Kona itself never removes
          or hides anything, and the cap limits making rather than keeping. */}
      {!room && (
        <p class="lib-wall" role="status">
          Five is as many spaces as Free keeps. Delete one you have finished
          with, or Pro keeps as many as you like. Nothing you have made goes
          away either way.
        </p>
      )}

      {naming ? (
        <div class="sp-new">
          <label class="sp-field">
            <span>What is it called?</span>
            <input
              type="text"
              value={name}
              placeholder="Amoebas"
              onInput={(event) => setName(event.currentTarget.value)}
            />
          </label>
          <label class="sp-field">
            {/* Optional. Without one it is a shelf, which is a fine thing to be. */}
            <span>What is it trying to settle? Optional.</span>
            <input
              type="text"
              value={question}
              placeholder="How does an amoeba actually move?"
              onInput={(event) => setQuestion(event.currentTarget.value)}
            />
          </label>
          <div class="sp-actions">
            <button type="button" class="sp-do" disabled={!name.trim()} onClick={() => void make()}>
              Make it
            </button>
            <button type="button" class="sp-undo" onClick={() => setNaming(false)}>
              Not now
            </button>
          </div>
        </div>
      ) : (
        room && (
          <button type="button" class="sp-add" onClick={() => setNaming(true)}>
            New space
          </button>
        )
      )}

      {spaces.length === 0 ? (
        <p class="lib-none">
          No spaces yet. A space is where highlights about one topic sit
          together, however many pages they came from.
        </p>
      ) : (
        <ul class="sp-list">
          {ordered.map((space, at) => (
            <li key={space.id}>
              <button type="button" class="sp-card" onClick={() => onOpen(space.id)}>
                <span class="sp-card-name">{space.name}</span>
                {space.question && <span class="sp-card-question">{space.question}</span>}
                <span class="sp-card-count">
                  {space.markIds.length === 1 ? '1 highlight' : `${space.markIds.length} highlights`}
                  {space.links?.length ? ` · ${space.links.length} to read` : ''}
                  {space.labels?.length ? ` · ${space.labels.join(', ')}` : ''}
                </span>
              </button>
              <div class="sp-card-do">
                {/* By hand (1e). Two buttons rather than a drag, because a drag
                    needs a pointer and 2g already settled that nothing here may. */}
                <button
                  type="button"
                  class="sp-move"
                  aria-label={`Move ${space.name} up`}
                  disabled={at === 0}
                  onClick={() => void move(space.id, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  class="sp-move"
                  aria-label={`Move ${space.name} down`}
                  disabled={at === ordered.length - 1}
                  onClick={() => void move(space.id, 1)}
                >
                  ↓
                </button>
                {goingToDelete === space.id ? (
                  <>
                    {/* The only verb here that takes anything away, so it asks
                        once and says exactly what it costs: the highlights are
                        pointed at, not held, and they stay (20). */}
                    <span class="sp-sure">Delete it? The highlights stay in your library.</span>
                    <button type="button" class="sp-undo" onClick={() => void remove(space.id)}>
                      Delete the space
                    </button>
                    <button type="button" class="sp-undo" onClick={() => setGoingToDelete(null)}>
                      Keep it
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    class="lib-row-do"
                    onClick={() => setGoingToDelete(space.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function OneSpace({
  space,
  marks,
  onBack,
  onChanged,
  save,
}: {
  space: Space;
  marks: Mark[];
  onBack: () => void;
  onChanged: () => void;
  save: (space: Space) => Promise<void>;
}) {
  const [note, setNote] = useState(space.note ?? '');
  const [link, setLink] = useState('');
  const [label, setLabel] = useState('');

  // A space points at highlights; the highlight stays in the library and stays
  // one highlight. Nothing is copied and nothing is moved.
  const held = useMemo(() => {
    const byId = new Map(marks.map((mark) => [mark.id, mark]));
    return space.markIds.map((id) => byId.get(id)).filter((mark): mark is Mark => !!mark);
  }, [space, marks]);

  /**
   * A link whose page already has a highlight in this space has been read, and
   * says so rather than sitting in the list looking like work still to do.
   */
  const links = useMemo(
    () =>
      (space.links ?? []).map((each) => ({
        ...each,
        read: held.some((mark) => samePage(mark.url, each.url)),
      })),
    [space.links, held],
  );

  const takeOut = async (id: string) => {
    await save(takeOutOfSpace(space, id));
    onChanged();
  };

  const saveNote = async () => {
    if ((space.note ?? '') === note) return;
    await save({ ...space, note: note || undefined, updatedAt: Date.now() });
    onChanged();
  };

  const keepLink = async () => {
    const url = link.trim();
    if (!url) return;
    // A bare host typed without a scheme is still a page somebody meant.
    const full = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    await save(addLink(space, full));
    setLink('');
    onChanged();
  };

  return (
    <>
      <button type="button" class="sp-back" onClick={onBack}>
        ← All spaces
      </button>

      <div class="lib-head">
        <h1>{space.name}</h1>
        {space.question && <p>{space.question}</p>}
      </div>

      {/* Its own labels, working the way a highlight's tags do and never mixed
          with them: a tag says something about a passage, a label says
          something about a project (1e, 1c). */}
      <div class="sp-labels">
        {(space.labels ?? []).map((each) => (
          <span class="sp-label" key={each}>
            {each}
            <button
              type="button"
              aria-label={`Take the label ${each} off this space`}
              onClick={() => void save(unlabelSpace(space, each)).then(onChanged)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          class="sp-label-add"
          type="text"
          value={label}
          placeholder={(space.labels ?? []).length ? 'Another label…' : 'Add a label…'}
          aria-label="Add a label to this space"
          onInput={(event) => setLabel(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || !label.trim()) return;
            void save(labelSpace(space, label)).then(() => {
              setLabel('');
              onChanged();
            });
          }}
        />
      </div>

      {/* The note is where a conclusion goes. Nothing in a space is required,
          and a space holding a question and twelve highlights with nothing
          concluded is a finished and perfectly good space (1d). */}
      <label class="sp-field sp-note">
        <span>Anything else worth saying about this space</span>
        <textarea
          rows={2}
          value={note}
          placeholder="Optional"
          onInput={(event) => setNote(event.currentTarget.value)}
          onBlur={() => void saveNote()}
        />
      </label>

      {held.length === 0 ? (
        <p class="lib-none">
          Nothing gathered here yet. Set this space in the panel while you read
          and what you mark lands here as well as in your library.
        </p>
      ) : (
        <ul class="lib-list">
          {held.map((mark) => (
            <li key={mark.id} class="lib-row">
              <div>
                <Passage
                  color={mark.color}
                  text={mark.label || mark.snapshot}
                  note={mark.note}
                  href={linkToMark(mark)}
                />
                <p class="lib-row-where">
                  {siteLabel(mark)}
                  {mark.landing === 'lost' && <span class="lib-lost"> · page has changed</span>}
                  {/* The gentlest of the three verbs, and so the easiest to
                      reach: out of this space, still in the library, still in
                      every other space (20). */}
                  <button type="button" class="lib-row-do" onClick={() => void takeOut(mark.id)}>
                    Remove from this space
                  </button>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 20: a workspace may hold a page you have not read yet. Bare links live
          in spaces and never in the library, because the library is passages
          and a bookmark put there is clutter nobody chose. This shows as what
          it is, an invitation to read, not a passage you kept. */}
      <section class="sp-reading">
        <h2>To read</h2>
        <div class="sp-reading-add">
          <input
            class="set-input"
            type="url"
            value={link}
            placeholder="Paste a page you want to read for this"
            aria-label="A page to read"
            onInput={(event) => setLink(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void keepLink();
            }}
          />
          <button type="button" class="sp-undo" disabled={!link.trim()} onClick={() => void keepLink()}>
            Keep it to read
          </button>
        </div>
        {links.length === 0 ? (
          <p class="set-quiet">
            Nothing waiting. A page kept here is one you have found and not read
            yet; once you highlight something on it, it is a passage like any
            other and this list says so.
          </p>
        ) : (
          <ul class="sp-links">
            {links.map((each) => (
              <li key={each.url} class={each.read ? 'sp-link sp-link--read' : 'sp-link'}>
                <a href={each.url} target="_blank" rel="noopener">
                  {titleFor(each.url, each.title)}
                </a>
                <span class="sp-link-where">{hostOf(each.url)}</span>
                {each.read && <span class="sp-link-read">read</span>}
                <button
                  type="button"
                  class="lib-row-do"
                  onClick={() => void save(removeLink(space, each.url)).then(onChanged)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/** Where a page lives, said once beside what it is called. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export { rename };
