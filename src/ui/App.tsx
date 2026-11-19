import { useEffect, useState } from 'preact/hooks';
import type { KonaController, ViewState } from '../content/controller';
import { penOf } from '../core/pens';
import { MarkBar, SelectionBar } from './Bar';
import { Note } from './Note';
import { Panel } from './Panel';

/**
 * Everything Kona puts on the page you are reading, and nothing else.
 *
 * Four things, which is the whole of the in-page product: the bar when there
 * is a selection, the panel, the bar again when you tap a highlight you
 * already made, and the note editor behind that bar's Note button.
 *
 * Two things that used to be here are gone rather than rebuilt. **Search**,
 * because 15 says there is none in the panel: a page's highlights are already
 * in front of you, and a search box over four rows is furniture, the panel's
 * job is *here* and the library's is *everything*. **The minimap**, for the
 * reason in 2j.
 */
interface Props {
  controller: KonaController;
}

export function App({ controller }: Props) {
  const state = useViewState(controller);
  if (!state.enabled || !state.pageId) return null;

  const marked =
    state.card && state.items.find((item) => item.mark.id === state.card?.markId)?.mark;

  return (
    // kona-tokens so every custom property lands, whether this ends up inside a
    // shadow root (where :host matches) or not.
    <div class="kona-tokens">
      {state.selection && (
        <SelectionBar selection={state.selection} controller={controller} pens={state.pens} />
      )}

      {/* 18: a picture cannot be painted by the Custom Highlight API, which
          takes text ranges. So it is outlined in Kona's own layer, over the
          image, never in the page's DOM, which is the same discipline
          everything else here keeps. */}
      {state.outlines.map((outline) => (
        <span
          key={outline.markId}
          class="kona-outline"
          aria-hidden="true"
          style={
            {
              '--kona-outline-ink': penOf(outline.color).ink,
              top: `${outline.top}px`,
              left: `${outline.left}px`,
              width: `${outline.width}px`,
              height: `${outline.height}px`,
            } as never
          }
        />
      ))}

      <Panel state={state} controller={controller} />

      {/* 10c: a tap gives the bar, and the bar's Note button opens the editor.
          focusNote is the controller already saying which was asked for. */}
      {state.card &&
        marked &&
        (state.card.focusNote ? (
          <Note key={marked.id} card={state.card} mark={marked} controller={controller} />
        ) : (
          <MarkBar
            card={state.card}
            mark={marked}
            controller={controller}
            pens={state.pens}
            inSpace={
              state.activeSpace?.items.some((each) => each.id === marked.id)
                ? state.activeSpace.name
                : undefined
            }
          />
        ))}

      {/* A single delete can be undone immediately afterwards (DEFINITIONS,
          Delete). This is that immediately. */}
      {state.undo && (
        <div class="kona-say" role="status">
          <span>Deleted “{state.undo.label}”</span>
          <button type="button" class="kona-say-do" onClick={() => controller.undoDelete()}>
            Undo
          </button>
        </div>
      )}

      {state.notice && (
        <div class="kona-say" role="status">
          {state.notice}
        </div>
      )}
    </div>
  );
}

function useViewState(controller: KonaController): ViewState {
  const [state, setState] = useState(controller.getState());
  useEffect(() => {
    setState(controller.getState());
    return controller.subscribe(() => setState(controller.getState()));
  }, [controller]);
  return state;
}
