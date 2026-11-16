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
      // Handed over as custom properties rather than as top and left, because
      // on a phone the bar is fixed to the foot of the screen (22) and an
      // inline `top` would beat the rule that puts it there.
      style={{ '--kona-bar-top': `${top}px`, '--kona-bar-left': `${left}px` } as never}
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
 * highlight.
 *
 * **On a phone it is fixed to the foot of the screen instead (22)**, which is
 * a stylesheet rule rather than a second component: the contents are the same
 * contents, and two bars would be two things to keep in step.
 *
 * The reasoning is worth keeping next to the code, because the shape looks
 * arbitrary until you have it. The phone's own menu over selected text, Copy,
 * Look Up, Share, is not ours to replace or move, and it appears *beside the
 * text*. So anything Kona places relative to the selection is placed relative
 * to a thing it does not control. Dropping the assumption that Kona has to be
 * near the selection dissolves the collision: a bar in the same place every
 * time never meets that menu, and it is where the thumb already is. On a
 * phone, reach beats proximity.
 *
 * Still to be tried on a real iPhone, and one answer could overturn it: if
 * tapping Kona's bar clears the selection, every in-page option dies and
 * capture becomes the share route (1h) on both platforms. A bottom bar is no
 * more exposed to that than the dot it replaced.
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
      <div
        class="kona-bar"
        style={
          { '--kona-bar-top': `${top}px`, '--kona-bar-left': `${selection.left}px` } as never
        }
      >
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
