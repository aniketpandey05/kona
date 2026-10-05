import type { JSX } from 'preact';

/**
 * Kona's mark: a stag's head folded out of paper, on a page whose corner has
 * been turned up. Origami is the right register for this product — the whole
 * thing is about folding a page so you can come back to it — so the animal is
 * built from creases rather than drawn in outline.
 *
 * The PNGs in src/public/icon are rasterised from this same geometry, so a
 * change here has to be re-exported to stay in step.
 */

/**
 * The left half of the head, in a 0-100 box so the proportions stay readable;
 * the right half is mirrored from it. The facets tile — every edge is shared
 * with its neighbour — so a seam is drawn once rather than twice over itself.
 */
const LEFT_FACETS = [
  '41,47 50,44 50,68 36,60', // upper face
  '36,60 50,68 50,88 43,82', // lower face
  '43,82 50,88 50,99', // muzzle
  '38.5,54 19,47 14,59 36,60', // ear, hung off the face edge
  '47,45 34,22 25,4 17,8 30,26 42,46.8', // antler beam, based on the skull edge
  '32,29 12,24 9,33 36,37', // tine, based on the beam edge
] as const;

const mirror = (points: string) =>
  points
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(',');
      return `${(100 - Number(x)).toFixed(1)},${y}`;
    })
    .join(' ');

const FACETS = [...LEFT_FACETS, ...LEFT_FACETS.map(mirror)];

export function KonaMark({ size = 20 }: { size?: number }): JSX.Element {
  // Creases need pixels to live in. Below roughly 40px a stroke this fine either
  // disappears or, inked enough to survive, closes the facets up — so the same
  // shape is filled instead. Smaller again and the antlers go entirely.
  const outlined = size >= 40;
  const stag = size >= 20;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="kona-mark-paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fbbf24" />
          <stop offset="1" stop-color="#ea580c" />
        </linearGradient>
      </defs>
      {/* The page, stopping at the crease instead of running to the corner. */}
      <path d="M5 0h14a5 5 0 0 1 5 5v16.5L16.5 24H5a5 5 0 0 1-5-5V5a5 5 0 0 1 5-5Z" fill="url(#kona-mark-paper)" />
      {stag && (
        <g transform="translate(1.8 1.3) scale(0.2)">
          {FACETS.map((points) =>
            outlined ? (
              <polygon
                key={points}
                points={points}
                fill="none"
                stroke="#fff6e4"
                stroke-width="4.5"
                stroke-linejoin="round"
              />
            ) : (
              <polygon key={points} points={points} fill="#fff6e4" />
            ),
          )}
        </g>
      )}
      {/* The turned-back corner, lying face-up. */}
      <path d="M24 16.5 16.5 24V16.5Z" fill="#fff6e4" />
      {/* The shade it drops along its two free edges. */}
      <path d="M16.5 24V16.5H24" fill="none" stroke="rgba(124, 45, 10, 0.24)" stroke-width="1" />
    </svg>
  );
}
