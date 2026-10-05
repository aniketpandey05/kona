import type { JSX } from 'preact';

/**
 * Kona's mark: a stag on a page whose bottom-right corner has been folded back
 * onto its own face. It matches the toolbar icon, so the panel inside a chat and
 * the library page read as the same thing rather than two unrelated tools.
 *
 * Below about 24px the antlers turn to porridge, so the stag is dropped and the
 * fold carries the mark on its own.
 */
export function KonaMark({ size = 20 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="kona-mark-paper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fbbf24" />
          <stop offset="1" stop-color="#ea580c" />
        </linearGradient>
      </defs>
      {/* The page, stopping at the crease instead of running to the corner. */}
      <path d="M5 0h14a5 5 0 0 1 5 5v8.3L13.3 24H5a5 5 0 0 1-5-5V5a5 5 0 0 1 5-5Z" fill="url(#kona-mark-paper)" />
      {size >= 24 && (
        // Nudged up and left so the muzzle keeps clear of the flap below it.
        <g transform="translate(-1.6 -0.6)">
          <g stroke="#fff6e4" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" fill="none">
            <path d="M9.9 8.6 7.6 5.9" />
            <path d="M7.6 5.9 4.9 5.6" />
            <path d="M7.6 5.9 7.8 3.2" />
            <path d="M7.8 3.2 5.6 2.2" />
            <path d="M7.8 3.2 10.2 1.9" />
            <path d="M13.1 8.6 15.4 5.9" />
            <path d="M15.4 5.9 18.1 5.6" />
            <path d="M15.4 5.9 15.2 3.2" />
            <path d="M15.2 3.2 17.4 2.2" />
            <path d="M15.2 3.2 12.8 1.9" />
          </g>
          <ellipse cx="8.8" cy="10.2" rx="1.25" ry="0.85" transform="rotate(-28 8.8 10.2)" fill="#fff6e4" />
          <ellipse cx="14.2" cy="10.2" rx="1.25" ry="0.85" transform="rotate(28 14.2 10.2)" fill="#fff6e4" />
          <path d="M11.5 8.5c1.75 0 2.6 1.05 2.6 2.5 0 1.45-.35 2.65-.95 3.5-.5.7-1.05 1.1-1.65 1.1s-1.15-.4-1.65-1.1c-.6-.85-.95-2.05-.95-3.5 0-1.45.85-2.5 2.6-2.5Z" fill="#fff6e4" />
        </g>
      )}
      {/* The turned-back corner, lying face-up. */}
      <path d="M24 13.3 13.3 24V13.3Z" fill="#fff6e4" />
      {/* The shade it drops along its two free edges. */}
      <path d="M13.3 24V13.3H24" fill="none" stroke="rgba(124, 45, 10, 0.22)" stroke-width="1" />
    </svg>
  );
}
