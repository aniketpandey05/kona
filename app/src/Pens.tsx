import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  DEFAULT_PENS,
  hexToHsl,
  hsvToHex,
  nameOf,
  outlivedThePalette,
  penIdFor,
  penOf,
  pensInUse,
} from '../../src/core/pens';
import { MARK_INK, MARK_INK_DARK } from '../../src/design/tokens';
import type { Mark, PenId } from '../../src/core/types';
import type { LibrarySource } from './source';

/**
 * Your pens (decision 12).
 *
 * **A palette is a set of highlighting pens.** That image settles most of this
 * screen on its own, and the four rules it produces are each visible here:
 *
 * - **One palette, which you add to.** One list, with an Add at the end of it.
 * - **A colour's meaning is yours.** Nothing here asks what a colour means,
 *   and the library filters by colour, which is the usefulness without a
 *   taxonomy.
 * - **Named by hue, derived from the value.** The name writes itself as you
 *   move the sliders. *Teal*, not *Disagree*.
 * - **A highlight keeps the colour it was made with.** Which is why *Also in
 *   your library* exists: taking a pen out of the case changes nothing you
 *   already marked, so the colours in use can outnumber the pens, and a
 *   retired colour needs somewhere to be rather than nowhere. Fifty-four
 *   highlights quietly becoming unreachable is how somebody loses track of
 *   them.
 *
 * Two things here depart from the board, both for reasons the board itself
 * records as open or that were measured afterwards:
 *
 * 1. **No ceiling on the opacity.** The board stops the slider at 60% and
 *    calls the ceiling "the one piece of 12 still open". It was then settled
 *    the other way: a bad pick affects nothing already marked, the preview
 *    shows it before it is made, and it is the person's own pen. A guardrail
 *    against that is a guardrail against nothing.
 * 2. **The previews are flat, and the dark one writes light ink.** The board
 *    draws the mark as a vertical gradient in dark ink on both pages.
 *    `::highlight()` can only paint a flat colour, and the same dark ink over
 *    a dark page measures 1.5:1. A preview that is prettier than the paint is
 *    a preview of something else.
 */
interface Props {
  source: LibrarySource;
  marks: Mark[];
  /** The library re-reads: the bar in the page is drawn from the same list. */
  onChanged: () => void;
}

/** The draft in the card: a hue, a position in its square, and an opacity. */
interface Draft {
  /** The pen this is replacing, or null when it is a new one. */
  replacing: PenId | null;
  hue: number;
  /** How much of the hue, across the square. */
  sat: number;
  /** How bright, up the square. */
  val: number;
  opacity: number;
}

const draftFor = (id: PenId | null): Draft => {
  const hex = id ? penOf(id).ink : '#14b8a6';
  const [h, s, l] = hexToHsl(hex);
  // HSL back to the square's axes, which is the one direction `pens.ts` does
  // not need for itself.
  const val = l + s * Math.min(l, 1 - l);
  return {
    replacing: id,
    // Not rounded: the hue is carried at full precision so that opening a pen
    // and saving it again gives back the same value. Rounding here turned
    // #14b8a6 into #14b8a5 on the way in, which is a colour quietly drifting
    // every time somebody opens the card.
    hue: h,
    sat: val === 0 ? 0 : 2 * (1 - l / val),
    val,
    opacity: id ? alphaOf(penOf(id).mark) : 0.45,
  };
};

/** The alpha out of an `rgba(…)`, so Edit opens on the pen's own opacity. */
function alphaOf(mark: string): number {
  const alpha = Number(/,\s*([\d.]+)\s*\)$/.exec(mark)?.[1]);
  return Number.isFinite(alpha) ? alpha : 0.45;
}

const hexOf = (draft: Draft) => hsvToHex(draft.hue, draft.sat, draft.val);

export function Pens({ source, marks, onChanged }: Props) {
  const [pens, setPens] = useState<PenId[]>([...DEFAULT_PENS]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [said, setSaid] = useState<string | null>(null);

  useEffect(() => {
    void source.pens().then(setPens);
  }, [source]);

  const say = (message: string) => {
    setSaid(message);
    setTimeout(() => setSaid(null), 4000);
  };

  const keep = async (next: PenId[]) => {
    setPens(next);
    await source.savePens(next);
    // The bar in the page reads the same list, so the library saying so is
    // not cosmetic: it is the one place you can see that it took.
    onChanged();
  };

  const inUse = useMemo(() => pensInUse(marks.map((mark) => mark.color)), [marks]);
  const countOf = (id: PenId) => inUse.find((each) => each.pen.id === id)?.count ?? 0;
  const retired = useMemo(() => outlivedThePalette(pens, inUse), [pens, inUse]);

  const add = async () => {
    if (!draft) return;
    const id = penIdFor(hexOf(draft), draft.opacity);
    const replacing = draft.replacing;
    if (pens.includes(id) && id !== replacing) {
      say('That colour is already one of your pens.');
      return;
    }
    // Replacing is a swap in place, so the case keeps its order. The old
    // colour stays on every highlight made with it, which is rule 4, and it
    // turns up under "Also in your library" if any of them are yours.
    const next = replacing ? pens.map((each) => (each === replacing ? id : each)) : [...pens, id];
    await keep(next);
    setDraft(null);
    say(replacing ? `${nameOf(hexOf(draft))} it is.` : `${nameOf(hexOf(draft))} added.`);
  };

  const takeOut = async (id: PenId) => {
    if (pens.length <= 1) {
      say('A palette with no pens in it cannot highlight anything.');
      return;
    }
    await keep(pens.filter((each) => each !== id));
    setDraft(null);
    const kept = countOf(id);
    say(
      kept > 0
        ? `Out of the case. The ${kept} highlight${kept === 1 ? '' : 's'} you made with it are untouched.`
        : 'Out of the case.',
    );
  };

  return (
    <>
      <div class="lib-head">
        <h1>Your pens</h1>
        <p>
          The colours you can mark with. What a colour <em>means</em> is yours, Kona never decides,
          and you can filter the library by any of them.
        </p>
      </div>

      {said && (
        <p class="set-said" role="status">
          {said}
        </p>
      )}

      <div class="pen-layout">
        <section class="pen-case">
          <ul class="pen-list">
            {pens.map((id) => {
              const pen = penOf(id);
              const count = countOf(id);
              return (
                <li class="pen-row" key={id}>
                  <span class="pen-dot" aria-hidden="true" style={{ background: pen.mark }} />
                  <span class="pen-who">
                    <strong>{pen.name}</strong>
                    <span class="pen-count">
                      {count === 0
                        ? 'not used yet'
                        : `on ${count} highlight${count === 1 ? '' : 's'}`}
                    </span>
                  </span>
                  <button
                    type="button"
                    class="pen-tiny"
                    aria-label={`Edit ${pen.name}`}
                    onClick={() => setDraft(draft?.replacing === id ? null : draftFor(id))}
                  >
                    {draft?.replacing === id ? 'Close' : 'Edit'}
                  </button>
                </li>
              );
            })}

            {draft && draft.replacing === null && (
              <li class="pen-row pen-row--adding">
                <span
                  class="pen-dot"
                  aria-hidden="true"
                  style={{ background: markOf(hexOf(draft), draft.opacity) }}
                />
                <span class="pen-who">
                  <strong>{nameOf(hexOf(draft))}</strong>
                  <span class="pen-count">being added →</span>
                </span>
              </li>
            )}
          </ul>

          {!draft && (
            <button type="button" class="sp-do pen-add" onClick={() => setDraft(draftFor(null))}>
              Mix a colour
            </button>
          )}

          <h2 class="pen-h2">Also in your library</h2>
          <p class="pen-quiet">
            Colours you have marked with that are not pens any more.{' '}
            <strong>Taking a pen out of the case never changes a mark you already made</strong>, so
            these stay exactly as they were, and you can still filter by them.
          </p>
          {retired.length === 0 ? (
            <p class="lib-none">Nothing retired. Every colour in your library is still a pen.</p>
          ) : (
            <div class="pen-retired">
              {retired.map(({ pen, count }) => (
                <a class="pen-tiny" key={pen.id} href={`#/?colour=${encodeURIComponent(pen.id)}`}>
                  <span
                    class="pen-dot pen-dot--small"
                    aria-hidden="true"
                    style={{ background: pen.mark }}
                  />
                  {pen.name} · {count}
                </a>
              ))}
            </div>
          )}

          <p class="pen-quiet pen-where">
            Pens are free, and they are on this device:{' '}
            {source.kind === 'extension'
              ? 'the extension on this machine, which is what the bar in the page marks with.'
              : 'this browser, since there is no extension here to share them with.'}{' '}
            Free does not sync, so another device has its own.
          </p>
        </section>

        {draft && (
          <Card
            draft={draft}
            onChange={setDraft}
            canRemove={draft.replacing !== null && pens.length > 1}
            onAdd={() => void add()}
            onRemove={() => draft.replacing && void takeOut(draft.replacing)}
            onCancel={() => setDraft(null)}
          />
        )}
      </div>
    </>
  );
}

const markOf = (hex: string, opacity: number) => penOf(penIdFor(hex, opacity)).mark;

/**
 * The card you mix a colour in.
 *
 * The square is the quick way and not the only way: every value here is also
 * reachable from the hue slider, the opacity slider and the hex field, all of
 * which are ordinary focusable controls, so nothing in this card needs a
 * pointer. The square itself takes arrow keys for the same reason.
 */
function Card({
  draft,
  onChange,
  canRemove,
  onAdd,
  onRemove,
  onCancel,
}: {
  draft: Draft;
  onChange: (draft: Draft) => void;
  canRemove: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const square = useRef<HTMLDivElement>(null);
  const hex = hexOf(draft);
  const mark = markOf(hex, draft.opacity);
  // What the person types, kept apart from the value so that a half-typed hex
  // does not keep snapping back under them.
  const [typed, setTyped] = useState<string | null>(null);

  const pick = (event: PointerEvent) => {
    const box = square.current?.getBoundingClientRect();
    if (!box) return;
    const sat = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    const val = Math.min(1, Math.max(0, 1 - (event.clientY - box.top) / box.height));
    onChange({ ...draft, sat, val });
    setTyped(null);
  };

  const nudge = (event: KeyboardEvent) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    const by: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = by[event.key];
    if (!move) return;
    event.preventDefault();
    onChange({
      ...draft,
      sat: Math.min(1, Math.max(0, draft.sat + move[0])),
      val: Math.min(1, Math.max(0, draft.val + move[1])),
    });
    setTyped(null);
  };

  return (
    <section class="pen-card" aria-label={draft.replacing ? 'Edit this pen' : 'A new pen'}>
      <h2 class="pen-card-h">{draft.replacing ? 'Edit this pen' : 'A new pen'}</h2>

      <div
        class="pen-square"
        ref={square}
        role="group"
        tabIndex={0}
        aria-label={`Saturation and lightness, ${Math.round(draft.sat * 100)}% and ${Math.round(draft.val * 100)}%`}
        style={{
          background: `linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, ${hsvToHex(draft.hue, 1, 1)})`,
        }}
        onPointerDown={(event) => {
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
          pick(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 1) pick(event);
        }}
        onKeyDown={nudge}
      >
        <span
          class="pen-marker"
          aria-hidden="true"
          style={{
            left: `${draft.sat * 100}%`,
            top: `${(1 - draft.val) * 100}%`,
          }}
        />
      </div>

      <label class="pen-label">
        <span>Hue</span>
        <input
          class="pen-range pen-range--hue"
          type="range"
          min={0}
          max={360}
          value={draft.hue}
          onInput={(event) => {
            onChange({ ...draft, hue: Number(event.currentTarget.value) });
            setTyped(null);
          }}
        />
      </label>

      <label class="pen-label">
        <span>
          Opacity <strong>{Math.round(draft.opacity * 100)}%</strong>
        </span>
        <input
          class="pen-range"
          type="range"
          min={5}
          max={100}
          value={Math.round(draft.opacity * 100)}
          style={{
            background: `linear-gradient(to right, ${markOf(hex, 0.05)}, ${markOf(hex, 1)})`,
          }}
          onInput={(event) =>
            onChange({
              ...draft,
              opacity: Number(event.currentTarget.value) / 100,
            })
          }
        />
        {/* The board put a 60% ceiling here and called it the open piece of
            12. It was settled the other way: it is your pen, nothing already
            marked changes, and the previews below show it first. */}
        <span class="pen-note">
          {draft.opacity > 0.8
            ? 'Most of the way to solid. A highlighter that dense covers the words it is marking, which the previews will show you.'
            : 'A highlighter is see-through, so the words underneath stay readable. Yours can be as strong as you like.'}
        </span>
      </label>

      <div class="pen-hex">
        <label class="pen-hex-field">
          <span aria-hidden="true">#</span>
          <span class="pen-sr">Hex value</span>
          <input
            type="text"
            spellcheck={false}
            value={typed ?? hex.slice(1).toUpperCase()}
            onInput={(event) => {
              const raw = event.currentTarget.value.replace(/[^0-9a-f]/gi, '').slice(0, 6);
              setTyped(raw.toUpperCase());
              if (raw.length !== 6) return;
              const [h, s, l] = hexToHsl(`#${raw}`);
              const val = l + s * Math.min(l, 1 - l);
              onChange({
                ...draft,
                hue: h,
                sat: val === 0 ? 0 : 2 * (1 - l / val),
                val,
              });
            }}
            onBlur={() => setTyped(null)}
          />
        </label>
        {/* Rule 3: the name is derived, never typed. It is here so Kona can
            refer to the colour in a list and to a screen reader. */}
        <span class="pen-name">{nameOf(hex)}</span>
      </div>

      <p class="pen-caps">Over a page</p>
      <p class="pen-preview">
        A light page, where{' '}
        <mark style={{ background: mark, color: MARK_INK }}>the words have to stay readable</mark>{' '}
        underneath.
      </p>
      <p class="pen-preview pen-preview--dark">
        A dark page, where{' '}
        <mark style={{ background: mark, color: MARK_INK_DARK }}>
          the same colour has to work too
        </mark>
        , in lighter ink.
      </p>

      <div class="pen-card-do">
        <button type="button" class="sp-do" onClick={onAdd}>
          {draft.replacing ? 'Save this pen' : 'Add this colour'}
        </button>
        <button type="button" class="sp-undo" onClick={onCancel}>
          Cancel
        </button>
      </div>
      {canRemove && (
        <button type="button" class="pen-out" onClick={onRemove}>
          Take it out of the case
        </button>
      )}
    </section>
  );
}
