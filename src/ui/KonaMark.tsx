import type { JSX } from 'preact';

/**
 * Kona's mark: a stag's head folded out of paper, on a page whose corner has
 * been turned up. Origami is the right register for this product, the whole
 * thing is about folding a page so you can come back to it, so the animal is
 * built from creases rather than drawn in outline.
 *
 * The stag is a solid shape first and the creases are laid over it, rather
 * than the shape being made of creases. That ordering is what lets the mark
 * survive its real sizes: the 15px tab in App.tsx is where most people meet
 * Kona, and a silhouette still reads at 15px where an outline is a smudge.
 * The folds arrive as the mark grows into room to hold them.
 *
 * Everything below is the left half, in a 0-100 box so the proportions stay
 * readable; the right half is the same geometry mirrored about the centre.
 *
 * The PNGs in src/public/icon are rasterised from this same geometry, so a
 * change here has to be re-exported to stay in step.
 */

/** Brow to muzzle: wide at the forehead, tapering, blunt at the nose. */
const HEAD = '50,42 34,47 32,63 39,82 46,96 50,96';

/**
 * The ear, angled down and out. It has to sit well inside the antlers; level
 * with them, as it used to be, the pair read as one bar struck through the
 * head and the whole mark came out looking like a trowel.
 */
const EAR = '38,48 20,63 23,69 37,59';

/** The beam, off the brow, and the two tines that rise from it. */
const BEAM = 'M44,46 L28,30 L8,18';
const TINE_INNER = 'M36,38 L33,10';
const TINE_OUTER = 'M20,25 L14,7';

/** Folds across the brow, the cheek and the ear. The centre ridge is separate
 *  because it lies on the mirror line and would otherwise be inked twice. */
const CREASES = 'M34,47 L50,56 M32,63 L50,71 M39,82 L50,88';
const RIDGE = 'M50,45 L50,93';

const PAPER = '#fff6e4';
const CREASE_INK = 'rgba(124, 45, 10, 0.22)';

/** The page, stopping at the crease instead of running to the corner. */
const PAGE = 'M5 0h14a5 5 0 0 1 5 5v12.5L17.5 24H5a5 5 0 0 1-5-5V5a5 5 0 0 1 5-5Z';
/** The turned-back corner, lying face-up. */
const FLAP = 'M24 17.5 17.5 24V17.5Z';
/** The two free edges of that flap, where it drops a shade on the page. */
const FLAP_EDGES = 'M17.5 24V17.5H24';

export function KonaMark({ size = 20 }: { size?: number }): JSX.Element {
  // Optical sizing. The antlers carry the silhouette, so they are inked
  // relatively heavier as the mark shrinks; past the point where even a heavy
  // outer tine would close up against the beam, it steps aside and the inner
  // one holds the shape alone.
  const ink = size >= 52 ? 7 : size >= 32 ? 8.5 : size >= 22 ? 10 : 12.5;
  const antlers = size >= 22 ? `${BEAM} ${TINE_INNER} ${TINE_OUTER}` : `${BEAM} ${TINE_INNER}`;
  // Creases need pixels to live in. Below this they stop reading as folds and
  // become a grey film over the paper.
  const creased = size >= 44;

  const silhouette = (
    <>
      <polygon points={HEAD} fill={PAPER} />
      <polygon points={EAR} fill={PAPER} />
      <path
        d={antlers}
        fill="none"
        stroke={PAPER}
        stroke-width={ink}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </>
  );

  const folds = (
    <path d={CREASES} fill="none" stroke={CREASE_INK} stroke-width="2" stroke-linecap="round" />
  );

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="kona-mark-paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fbbf24" />
          <stop offset="1" stop-color="#ea580c" />
        </linearGradient>
        <linearGradient id="kona-mark-flap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fbeed6" />
          <stop offset="1" stop-color={PAPER} />
        </linearGradient>
      </defs>
      <path d={PAGE} fill="url(#kona-mark-paper)" />
      <g transform="translate(2.3 2.2) scale(0.19)">
        {silhouette}
        <g transform="translate(100 0) scale(-1 1)">{silhouette}</g>
        {creased && (
          <>
            {folds}
            <g transform="translate(100 0) scale(-1 1)">{folds}</g>
            <path d={RIDGE} fill="none" stroke={CREASE_INK} stroke-width="2" stroke-linecap="round" />
          </>
        )}
      </g>
      <path d={FLAP} fill="url(#kona-mark-flap)" />
      <path d={FLAP_EDGES} fill="none" stroke="rgba(124, 45, 10, 0.26)" stroke-width="0.7" />
    </svg>
  );
}
