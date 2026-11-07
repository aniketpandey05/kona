import { useState } from 'preact/hooks';
import type { KonaController, ViewState } from '../content/controller';
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
 * What is not here yet, and is not an oversight: the going-to line (2e) and
 * the second tab showing the active space (2f). Both need an active space, and
 * there is no such thing in the code -- no id, no control, no hook in the save
 * path. It is its own piece of work, and this panel grows the two of them when
 * it exists.
 *
 * There are also no per-item controls on a card. That is the design rather
 * than a gap: 10c puts changing a colour, writing a note and deleting on the
 * bar you get by tapping a highlight, not inline in a list.
 */
interface Props {
  state: ViewState;
  controller: KonaController;
}

export function Panel({ state, controller }: Props) {
  const [open, setOpen] = useState(false);
  const count = state.items.length;

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

      <div class="kona-panel-tabs">
        <button type="button" class="kona-panel-tab" aria-current="page">
          This page {count}
        </button>
      </div>

      {count === 0 ? (
        <p class="kona-panel-none">Nothing kept on this page yet.</p>
      ) : (
        <ul class="kona-panel-list">
          {state.items.map(({ mark, found }) => (
            <li key={mark.id}>
              <button
                type="button"
                class="kona-panel-card"
                onClick={() => controller.jump(mark.id)}
                // Hovering lights the passage up on the page behind, so you can
                // see which one a row is without leaving the list.
                onMouseEnter={() => controller.preview(mark.id)}
                onMouseLeave={() => controller.preview(null)}
              >
                <Passage color={mark.color} text={mark.label || mark.snapshot} note={mark.note} />
                {!found && <span class="kona-panel-lost">This page has changed</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
