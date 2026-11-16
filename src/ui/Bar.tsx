import type { JSX } from 'preact';
import type { KonaController, NoteCardState, ViewState } from '../content/controller';
import { penOf } from '../core/pens';
import type { Mark, PenId } from '../core/types';



/** Enough to decide whether the bar fits under the selection or has to go above it. */
const BAR_HEIGHT = 37;
const BAR_GAP = 10;

interface BarProps {
  top: number;
  left: number;
  /** The pen it is already marked in, ringed. Absent before anything is marked. */
  inUse?: PenId;
  onPick: (color: PenId) => void;
  onNote: () => void;
  /** Only an existing highlight can be deleted, so only then is this given (10c). */
  onDelete?: () => void;
  /** The active space this one went into, when it did. 2g's escape hatch. */
  inSpace?: { name: string; onKeepOut: () => void };
  /** The palette, which is a set of pens you add to (12). */
  pens: PenId[];
}

/**
 * The bar itself. Six inputs, each doing one thing, because the five copies
 * 3b replaced became five copies by growing a prop at a time.
 */
function Bar({ top, left, inUse, onPick, onNote, onDelete, inSpace, pens }: BarProps): JSX.Element {
  return (
    <div
      class="kona-bar"
      style={{ top: `${top}px`, left: `${left}px` }}
      // Keep the page's selection alive while the bar is clicked: losing it
      // would throw away the thing being marked.
      onMouseDown={(event) => event.preventDefault()}
    >
      {pens.map((id) => {
        const pen = penOf(id);
        return (
          <button
            key={id}
            type="button"
            class={id === inUse ? 'kona-bar-pen kona-bar-pen--in-use' : 'kona-bar-pen'}
            style={{ background: pen.ink }}
            aria-label={id === inUse ? `${pen.name}, in use` : pen.name}
            onClick={() => onPick(id)}
          />
        );
      })}
      <span class="kona-bar-divider" aria-hidden="true" />
      <button type="button" class="kona-bar-action" onClick={onNote}>
        Note
      </button>
      {onDelete && (
        <>
          <span class="kona-bar-divider" aria-hidden="true" />
          <button type="button" class="kona-bar-action kona-bar-action--danger" onClick={onDelete}>
            Delete
          </button>
        </>
      )}
      {/* 2g. Where it went, and the one control that takes it back out. The
          same element doing the safety job and the escape hatch, rather than
          two: and one tap, never a modifier key, because a phone has none. */}
      {inSpace && (
        <>
          <span class="kona-bar-divider" aria-hidden="true" />
          <span class="kona-bar-space">
            <span class="kona-bar-space-name">In {inSpace.name}</span>
            <button
              type="button"
              class="kona-bar-space-out"
              aria-label={`Keep this out of ${inSpace.name}, library only`}
              onClick={inSpace.onKeepOut}
            >
              ×
            </button>
          </span>
        </>
      )}
    </div>
  );
}

/**
 * Marking something: the bar sits by the selection, and a pen makes the
 * highlight. On a phone this goes to the foot of the screen instead (22),
 * which needs an iPhone to try and is not built here.
 */
export function SelectionBar({
  selection,
  controller,
  pens,
}: {
  selection: NonNullable<ViewState['selection']>;
  controller: KonaController;
  pens: PenId[];
}): JSX.Element {
  const fitsBelow = innerHeight - selection.bottom > BAR_HEIGHT + BAR_GAP * 2;
  const top = fitsBelow
    ? selection.bottom + BAR_GAP
    : Math.max(BAR_GAP, selection.top - BAR_HEIGHT - BAR_GAP);

  if (selection.streaming) {
    return (
      <div class="kona-bar" style={{ top: `${top}px`, left: `${selection.left}px` }}>
        <span class="kona-bar-wait">Wait for the reply to finish</span>
      </div>
    );
  }

  return (
    <Bar
      top={top}
      left={selection.left}
      pens={pens}
      onPick={(color) => void controller.highlight(color)}
      onNote={() => void controller.highlight(pens[0] ?? 'yellow', { withNote: true })}
    />
  );
}

/**
 * 10c. Tapping a highlight you already made brings up the same bar, now with
 * delete. Not archive: archiving leaves a highlight painted, so doing it here
 * would change nothing you can see: it belongs in the library, which is the
 * list it affects (DEFINITIONS, Archive).
 */
export function MarkBar({
  card,
  mark,
  controller,
  inSpace,
  pens,
}: {
  card: NoteCardState;
  mark: Mark;
  controller: KonaController;
  pens: PenId[];
  /** Named only when this highlight is actually in the active space. */
  inSpace?: string;
}): JSX.Element | null {
  if (!card.position) return null;
  return (
    <Bar
      top={card.position.top}
      left={card.position.left}
      pens={pens}
      inUse={mark.color}
      inSpace={
        inSpace ? { name: inSpace, onKeepOut: () => void controller.keepOutOfSpace(mark.id) } : undefined
      }
      onPick={(color) => void controller.updateMark(mark.id, { color })}
      // Opens the note editor on the same highlight, which is this bar's Note
      // button doing the one thing the bar itself has no room for.
      onNote={() => controller.editNote(mark.id)}
      onDelete={() => void controller.remove(mark.id)}
    />
  );
}
