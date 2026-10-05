import type { JSX } from 'preact';

/**
 * Kona's mark: a page whose bottom-right corner has been folded back onto its
 * own face. It matches the toolbar icon, so the panel inside a chat and the
 * library page read as the same thing rather than two unrelated tools.
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
      {/* The turned-back corner, lying face-up. */}
      <path d="M24 13.3 13.3 24V13.3Z" fill="#fff6e4" />
      {/* The shade it drops along its two free edges. */}
      <path d="M13.3 24V13.3H24" fill="none" stroke="rgba(124, 45, 10, 0.22)" stroke-width="1" />
    </svg>
  );
}
