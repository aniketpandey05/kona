import type { JSX } from 'preact';

/**
 * Kona's mark: a stag on a page whose bottom-right corner has been folded back
 * onto its own face. It matches the toolbar icon, so the panel inside a chat and
 * the library page read as the same thing rather than two unrelated tools.
 *
 * The PNGs in src/public/icon are rasterised from these same paths — change one
 * and the other has to follow.
 *
 * Two things here are deliberate. The antler beams are drawn heavier than their
 * tines, because a single uniform stroke weight either disappears when scaled
 * down or looks clubby when scaled up. And below about 24px the antlers turn to
 * porridge whatever the weight, so the stag is dropped and the fold carries the
 * mark alone.
 */
export function KonaMark({ size = 20 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="kona-mark-paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fcc53a" />
          <stop offset="0.55" stop-color="#f0831a" />
          <stop offset="1" stop-color="#e2510a" />
        </linearGradient>
      </defs>
      {/* The page, stopping at the crease instead of running to the corner. */}
      <path d="M5 0h14a5 5 0 0 1 5 5v14.3L14.3 24H5a5 5 0 0 1-5-5V5a5 5 0 0 1 5-5Z" fill="url(#kona-mark-paper)" />
      {size >= 24 && (
        <g transform="translate(0 -0.8)">
          <g stroke="#fff6e4" stroke-linecap="round" stroke-linejoin="round" fill="none">
            {/* Main beams. */}
            <g stroke-width="2.05">
              <path d="M9.8 8.5 6.5 2.7" />
              <path d="M14.2 8.5 17.5 2.7" />
            </g>
            {/* Tines, branching upward off each beam. */}
            <g stroke-width="1.4">
              <path d="M8.6 6.4 5.1 4.3" />
              <path d="M7.5 4.5 8.6 1.5" />
              <path d="M15.4 6.4 18.9 4.3" />
              <path d="M16.5 4.5 15.4 1.5" />
            </g>
          </g>
          <ellipse cx="8.75" cy="9.9" rx="1.5" ry="0.95" transform="rotate(-33 8.75 9.9)" fill="#fff6e4" />
          <ellipse cx="15.25" cy="9.9" rx="1.5" ry="0.95" transform="rotate(33 15.25 9.9)" fill="#fff6e4" />
          <path d="M12 7.8c2.05 0 3.05 1.25 3.05 2.8 0 1.5-.4 2.85-1.05 3.85-.55.85-1.25 1.5-2 1.5s-1.45-.65-2-1.5C9.35 13.45 8.95 12.1 8.95 10.6 8.95 9.05 9.95 7.8 12 7.8Z" fill="#fff6e4" />
        </g>
      )}
      {/* The turned-back corner, lying face-up. */}
      <path d="M24 14.3 14.3 24V14.3Z" fill="#fff6e4" />
      {/* The shade it drops along its two free edges. */}
      <path d="M14.3 24V14.3H24" fill="none" stroke="rgba(124, 45, 10, 0.26)" stroke-width="1" />
    </svg>
  );
}
