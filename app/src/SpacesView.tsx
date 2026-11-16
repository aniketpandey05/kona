import { useEffect, useMemo, useState } from 'preact/hooks';
import { FREE_SPACE_LIMIT, roomForSpace } from '../../src/core/archive';
import { linkToMark } from '../../src/core/link';
import { siteLabel } from '../../src/core/sites';
import { createSpace, removeMark as takeOutOfSpace, rename, type Space } from '../../src/core/spaces';
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
    <OneSpace space={open} marks={marks} onBack={() => onOpen(null)} onChanged={onChanged} />
  ) : (
    <AllSpaces spaces={spaces} marks={marks} onOpen={onOpen} onChanged={onChanged} />
  );
}

function AllSpaces({
  spaces,
  marks,
  onOpen,
  onChanged,
}: {
  spaces: Space[];
  marks: Mark[];
  onOpen: (id: string) => void;
  onChanged: () => void;
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [question, setQuestion] = useState('');
  // No entitlement system yet, so everybody is Free.
  const pro = false;
  const room = roomForSpace(spaces.length, pro);

  const make = async () => {
    if (!name.trim() || !room) return;
    const space = createSpace(name.trim(), question.trim() || undefined);
    await saveSpaceVia(space);
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
          {spaces.map((space) => (
            <li key={space.id}>
              <button type="button" class="sp-card" onClick={() => onOpen(space.id)}>
                <span class="sp-card-name">{space.name}</span>
                {space.question && <span class="sp-card-question">{space.question}</span>}
                <span class="sp-card-count">
                  {space.markIds.length === 1 ? '1 highlight' : `${space.markIds.length} highlights`}
                </span>
              </button>
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
}: {
  space: Space;
  marks: Mark[];
  onBack: () => void;
  onChanged: () => void;
}) {
  const [note, setNote] = useState(space.note ?? '');

  // A space points at highlights; the highlight stays in the library and stays
  // one highlight. Nothing is copied and nothing is moved.
  const held = useMemo(() => {
    const byId = new Map(marks.map((mark) => [mark.id, mark]));
    return space.markIds.map((id) => byId.get(id)).filter((mark): mark is Mark => !!mark);
  }, [space, marks]);

  const takeOut = async (id: string) => {
    await saveSpaceVia(takeOutOfSpace(space, id));
    onChanged();
  };

  const saveNote = async () => {
    if ((space.note ?? '') === note) return;
    await saveSpaceVia({ ...space, note: note || undefined, updatedAt: Date.now() });
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
                <a class="lib-row-link" href={linkToMark(mark)} target="_blank" rel="noopener">
                  <Passage color={mark.color} text={mark.label || mark.snapshot} note={mark.note} />
                </a>
                <p class="lib-row-where">
                  {siteLabel(mark)}
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
    </>
  );
}

/**
 * Spaces are written straight to the device.
 *
 * The bridge carries them for reading, but a space edited here is edited on
 * the machine you are on, the extension and the web app share one store on
 * that machine, so there is nothing to reconcile.
 */
async function saveSpaceVia(space: Space): Promise<void> {
  const { saveSpace } = await import('./storage');
  await saveSpace(space);
}

export { rename };
