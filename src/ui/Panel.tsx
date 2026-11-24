import { useEffect, useState } from 'preact/hooks';
import { storage } from '#imports';
import { ago } from '../core/ago';
import { imageKey } from '../core/image';
import type { ActiveSpaceState, KonaController, ViewState } from '../content/controller';
import type { Space } from '../core/spaces';
import { loadSpaces, watchSpaces } from '../core/store';
import type { Mark } from '../core/types';
import { Passage } from '../design/Passage';
import { KonaMark } from './KonaMark';

/**
 * The panel in the page, rebuilt from decision 2 and the five boards in
 * design/mockups/panel.
 *
 * Three resting states rather than two (2b): out of the way, a mark that says
 * this page has something on it, and open when you ask. It is about *this
 * page* (2a), it floats and never pushes (2c), and where it sits is 2h.
 *
 * There are no per-item controls on a card. That is the design rather than a
 * gap: 10c puts changing a colour, writing a note and deleting on the bar you
 * get by tapping a highlight, not inline in a list.
 */
interface Props {
  state: ViewState;
  controller: KonaController;
}

export function Panel({ state, controller }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'page' | 'space'>('page');
  const count = state.items.length;
  const space = state.activeSpace;
  // What the matcher could not find on this page, kept apart from what it
  // could (13). Live rather than stored: a page that was rewritten can be
  // rewritten back, and a highlight found again is not rotted.
  const lost = state.items.filter((each) => !each.found);
  const here = state.items.filter((each) => each.found);

  // The space tab does not exist at all unless a space is active (2f), so if
  // the space is cleared while it is showing, fall back rather than show an
  // empty second view.
  useEffect(() => {
    if (!space && tab === 'space') setTab('page');
  }, [space, tab]);

  /**
   * Escape closes it.
   *
   * It is a dialog, and the × was the only way out of it without a mouse.
   *
   * Innermost first, which is what the guard is: a note editor and a bar over
   * a selection both answer Escape before this does, so one press closes the
   * thing you are actually in rather than the room around it. Press it again
   * and the room closes.
   */
  useEffect(() => {
    if (!open || state.selection || state.card) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open, state.selection, state.card]);

  if (!open) {
    return (
      <button
        type="button"
        class={count > 0 ? 'kona-rest kona-rest--counted' : 'kona-rest'}
        onClick={() => setOpen(true)}
        aria-label={count > 0 ? `Kona, ${count} on this page` : 'Kona'}
      >
        <KonaMark size={count > 0 ? 20 : 17} />
        {count > 0 && <span class="kona-rest-count">{count}</span>}
        {/* 2e. At rest too: if a space is active, the page says so without
            being opened, because that is when filing into the wrong one
            happens. */}
        {space && <GoingChip space={space} />}
      </button>
    );
  }

  return (
    // kona-slab is what tells the shared passage which room it is in. It is set
    // here, once, rather than passed to every passage, see design/passage.css.
    <div class="kona-panel kona-slab" role="dialog" aria-label="Kona, on this page">
      <div class="kona-panel-head">
        <KonaMark size={19} />
        <span class="kona-panel-name">Kona</span>
        {/* 3f: the button says Library, and the library holds both views. */}
        <button type="button" class="kona-panel-link" onClick={() => controller.openSiteLibrary()}>
          Library
        </button>
        <button
          type="button"
          class="kona-panel-close"
          aria-label="Close the panel"
          onClick={() => setOpen(false)}
        >
          ×
        </button>
      </div>

      <GoingTo space={space} controller={controller} />

      {/* 2f describes a pair, *This page* and the space, appearing only when a
          space is active. A single tab is not a pair: it is a switch with
          nowhere to go, drawn above a list it is already describing, and on
          an empty page it was the second thing you saw. The count it carried
          is on the mark this panel rests as. */}
      {space && (
        <div class="kona-panel-tabs">
          <button
            type="button"
            class="kona-panel-tab"
            aria-current={tab === 'page' ? 'page' : undefined}
            onClick={() => setTab('page')}
          >
            This page {count}
          </button>
          <button
            type="button"
            class="kona-panel-tab"
            aria-current={tab === 'space' ? 'page' : undefined}
            onClick={() => setTab('space')}
          >
            {space.name} {space.items.length}
          </button>
        </div>
      )}

      {tab === 'page' ? (
        count === 0 ? (
          <p class="kona-panel-none">Nothing kept on this page yet.</p>
        ) : (
          <>
            {/* 13: the failure of the one thing Kona promises, said in place.
                It goes first and it is not a footnote on a row, because what
                was lost is the *landing, not the quote*: the passage is still
                yours, still searchable, still in its space. Kona copied it
                when you kept it. */}
            {lost.length > 0 && (
              <section class="kona-lost" aria-label="This page has changed">
                <p class="kona-lost-head">This page has changed</p>
                <p class="kona-lost-says">
                  {lost.length === 1
                    ? 'The passage you kept is not in it any more. You still have the passage.'
                    : 'The passages you kept are not in it any more. You still have them.'}
                </p>
                <ul class="kona-panel-list">
                  {lost.map(({ mark }) => (
                    <li key={mark.id}>
                      {/* Not a button: there is nothing on this page to land
                          on, and a row that looks clickable and does nothing
                          is worse than one that does not. */}
                      <div class="kona-panel-card kona-panel-card--lost">
                        <Passage
                          color={mark.color}
                          text={mark.label || mark.snapshot}
                          note={mark.note}
                        />
                        <p class="kona-lost-kept">
                          kept {ago(mark.createdAt)} · still searchable
                          {space?.items.some((each) => each.id === mark.id)
                            ? ` · still in ${space.name}`
                            : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {lost.length > 0 && here.length > 0 && (
              <p class="kona-lost-after">Still here on this page</p>
            )}
            <ul class="kona-panel-list">
              {here.map(({ mark }) => (
                <li key={mark.id}>
                  <Card
                    mark={mark}
                    onClick={() => controller.jump(mark.id)}
                    onPreview={(on) => controller.preview(on ? mark.id : null)}
                  />
                </li>
              ))}
            </ul>
          </>
        )
      ) : space && space.items.length === 0 ? (
        <p class="kona-panel-none">Nothing in {space.name} yet.</p>
      ) : (
        <ul class="kona-panel-list">
          {space?.items.map((mark) => (
            <li key={mark.id}>
              <Card mark={mark} onClick={() => controller.openMark(mark)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** This screen's surroundings for the shared passage (3b). */
function Card({
  mark,
  onClick,
  onPreview,
}: {
  mark: Mark;
  onClick: () => void;
  onPreview?: (on: boolean) => void;
}) {
  const picture = useKeptPicture(mark);
  return (
    <button
      type="button"
      class="kona-panel-card"
      onClick={onClick}
      // Hovering lights the passage up on the page behind, so you can see
      // which one a row is without leaving the list.
      onMouseEnter={() => onPreview?.(true)}
      onMouseLeave={() => onPreview?.(false)}
    >
      <Passage
        color={mark.color}
        text={mark.label || mark.snapshot}
        note={mark.note}
        isPicture={!!mark.image}
        picture={picture}
      />
    </button>
  );
}

/**
 * A kept picture's bytes, read straight from storage.
 *
 * The panel is the extension, so there is no bridge in the way here: it is
 * the library on a web page that has to ask for them. Still never the address
 * the picture came from, for the same reason as everywhere else (6, 18).
 */
function useKeptPicture(mark: Mark): string | null {
  const [data, setData] = useState<string | null>(null);
  useEffect(() => {
    if (!mark.image?.kept) {
      setData(null);
      return;
    }
    let stopped = false;
    void storage.getItem<string>(imageKey(mark.id)).then((kept) => {
      if (!stopped) setData(kept ?? null);
    });
    return () => {
      stopped = true;
    };
  }, [mark.id, mark.image?.kept]);
  return data;
}

/** The space's name at rest, small, so the resting mark can carry 2e too. */
function GoingChip({ space }: { space: ActiveSpaceState }) {
  return <span class="kona-rest-space">{space.name}</span>;
}

/**
 * 2e. The panel always says where highlights are going, in words, whenever a
 * space is active: and when that space is shared it says that too, with the
 * number of people, because a passage going somewhere other people can see it
 * is a different act from one going into your own library (25).
 */
function GoingTo({ space, controller }: { space: ActiveSpaceState | null; controller: KonaController }) {
  const [picking, setPicking] = useState(false);
  const [spaces, setSpaces] = useState<Space[]>([]);

  // Loaded only while the picker is open: the panel is usually never opened,
  // and a picker is rarer still.
  useEffect(() => {
    if (!picking) return;
    void loadSpaces().then(setSpaces);
    return watchSpaces(setSpaces);
  }, [picking]);

  const choose = (id: string | null) => {
    void controller.setActiveSpace(id);
    setPicking(false);
  };

  if (picking) {
    return (
      <div class="kona-going kona-going--picking">
        {/* 2i. A picker that switches, and never makes one. The cap at five is
            hard, and a wall hit here would have to either refuse with no
            explanation or sell Pro on top of somebody's article, which 25
            forbids the extension outright. So with none yet, it says where
            they come from rather than offering one dead choice. */}
        {spaces.length === 0 ? (
          <p class="kona-going-empty">
            No spaces yet. Make one in the library, then set it here and
            everything you mark goes into it.
          </p>
        ) : (
          <ul class="kona-going-list">
            {spaces.map((each) => (
              <li key={each.id}>
                <button type="button" class="kona-going-choice" onClick={() => choose(each.id)}>
                  {each.name}
                </button>
              </li>
            ))}
            <li>
              <button type="button" class="kona-going-choice" onClick={() => choose(null)}>
                The library only
              </button>
            </li>
          </ul>
        )}
      </div>
    );
  }

  // 2d and 2b: with no space set the panel is this page and nothing more, so
  // there is no strip at all, only the quiet way to set one.
  if (!space) {
    return (
      <div class="kona-going kona-going--none">
        <button type="button" class="kona-going-set" onClick={() => setPicking(true)}>
          Put highlights in a space
        </button>
      </div>
    );
  }

  return (
    <div class="kona-going">
      <span class="kona-going-label">Going to</span>
      <strong class="kona-going-name">{space.name}</strong>
      {space.people > 1 && (
        <span class="kona-going-people">{space.people} people</span>
      )}
      <button type="button" class="kona-going-change" onClick={() => setPicking(true)}>
        Change
      </button>
    </div>
  );
}
