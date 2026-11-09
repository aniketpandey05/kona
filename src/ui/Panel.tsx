import { useEffect, useState } from 'preact/hooks';
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

  // The space tab does not exist at all unless a space is active (2f), so if
  // the space is cleared while it is showing, fall back rather than show an
  // empty second view.
  useEffect(() => {
    if (!space && tab === 'space') setTab('page');
  }, [space, tab]);

  if (!open) {
    return (
      <button
        type="button"
        class={count > 0 ? 'kona-rest kona-rest--counted' : 'kona-rest'}
        onClick={() => setOpen(true)}
        aria-label={count > 0 ? `Kona — ${count} on this page` : 'Kona'}
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
    // here, once, rather than passed to every passage -- see design/passage.css.
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

      <div class="kona-panel-tabs">
        <button
          type="button"
          class="kona-panel-tab"
          aria-current={tab === 'page' ? 'page' : undefined}
          onClick={() => setTab('page')}
        >
          This page {count}
        </button>
        {space && (
          <button
            type="button"
            class="kona-panel-tab"
            aria-current={tab === 'space' ? 'page' : undefined}
            onClick={() => setTab('space')}
          >
            {space.name} {space.items.length}
          </button>
        )}
      </div>

      {tab === 'page' ? (
        count === 0 ? (
          <p class="kona-panel-none">Nothing kept on this page yet.</p>
        ) : (
          <ul class="kona-panel-list">
            {state.items.map(({ mark, found }) => (
              <li key={mark.id}>
                <Card
                  mark={mark}
                  lost={!found}
                  onClick={() => controller.jump(mark.id)}
                  onPreview={(on) => controller.preview(on ? mark.id : null)}
                />
              </li>
            ))}
          </ul>
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
  lost,
  onClick,
  onPreview,
}: {
  mark: Mark;
  lost?: boolean;
  onClick: () => void;
  onPreview?: (on: boolean) => void;
}) {
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
      <Passage color={mark.color} text={mark.label || mark.snapshot} note={mark.note} />
      {lost && <span class="kona-panel-lost">This page has changed</span>}
    </button>
  );
}

/** The space's name at rest, small, so the resting mark can carry 2e too. */
function GoingChip({ space }: { space: ActiveSpaceState }) {
  return <span class="kona-rest-space">{space.name}</span>;
}

/**
 * 2e. The panel always says where highlights are going, in words, whenever a
 * space is active -- and when that space is shared it says that too, with the
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
      </div>
    );
  }

  // 2d and 2b: with no space set the panel is this page and nothing more, so
  // there is no strip at all -- only the quiet way to set one.
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
