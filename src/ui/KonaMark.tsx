import type { JSX } from 'preact';

/**
 * Kona's mark: a stag folded out of paper, standing on a page whose corner has
 * been turned up. Origami is the right register for this product — the whole
 * thing is about folding a page so you can come back to it — so the animal is
 * built from flat planes rather than drawn in outline.
 *
 * The PNGs in src/public/icon are rasterised from this same geometry, so a
 * change here has to be re-exported to stay in step.
 */

/** The stag, drawn in a 0-100 box so the proportions are readable, then scaled in. */
const FACETS: ReadonlyArray<readonly [string, Tone]> = [
  ['30,2 39,12 38,24 31,21', 'light'], // antler, inner prong
  ['43,0 40,14 37,22', 'mid'], // antler, upper spike
  ['17,11 35,17 38,26 27,24', 'mid'], // antler, outer blade
  ['12,20 32,23 35,30 22,29', 'dark'], // antler, low branch
  ['49,19 41,25 45,33', 'dark'], // ear
  ['33,23 45,28 41,41 32,40', 'light'], // skull
  ['1,41 32,32 34,43 9,48', 'mid'], // muzzle
  ['32,40 41,41 45,59 36,55', 'mid'], // neck, front
  ['41,41 53,47 45,59', 'dark'], // neck, back
  ['45,59 53,47 55,67', 'dark'], // shoulder
  ['53,47 78,45 85,57 55,67', 'light'], // flank
  ['55,67 85,57 85,69 55,69', 'mid'], // belly
  ['85,57 93,51 97,71 85,69', 'dark'], // haunch
  ['93,51 100,45 99,58', 'mid'], // tail
  ['45,62 56,62 52,80 55,99 49,99 48,80', 'mid'], // foreleg
  ['57,62 65,62 62,79 65,98 60,98 58,80', 'dark'], // far foreleg
  ['80,65 91,65 86,80 90,99 84,99 82,80', 'mid'], // hind leg
  ['69,66 78,66 76,80 79,98 74,98 72,81', 'dark'], // far hind leg
];

type Tone = 'light' | 'mid' | 'dark';
const TONES: Record<Tone, string> = { light: '#fffdf6', mid: '#f7e2b4', dark: '#e7c788' };
const FLAT = '#fff6e4';

export function KonaMark({ size = 20 }: { size?: number }): JSX.Element {
  // Facets need pixels to read as folds. Below that they are just noise, and
  // below about 22px the legs close up altogether, so the fold carries it alone.
  const faceted = size >= 40;
  const stag = size >= 22;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="kona-mark-paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fbbf24" />
          <stop offset="1" stop-color="#ea580c" />
        </linearGradient>
      </defs>
      {/* The page, stopping at the crease instead of running to the corner. */}
      <path d="M5 0h14a5 5 0 0 1 5 5v18L18 24H5a5 5 0 0 1-5-5V5a5 5 0 0 1 5-5Z" fill="url(#kona-mark-paper)" />
      {stag && (
        <g transform="translate(2.2 1.8) scale(0.17)">
          {FACETS.map(([points, tone]) => (
            <polygon key={points} points={points} fill={faceted ? TONES[tone] : FLAT} />
          ))}
        </g>
      )}
      {/* The turned-back corner, lying face-up. */}
      <path d="M24 18 18 24V18Z" fill="#fff6e4" />
      {/* The shade it drops along its two free edges. */}
      <path d="M18 24V18H24" fill="none" stroke="rgba(124, 45, 10, 0.24)" stroke-width="1" />
    </svg>
  );
}
