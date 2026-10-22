import type { Theme } from '../../src/core/theme';

/**
 * The same three-way choice the extension's library offers, stored the same
 * way the app stores everything else — on this device. The extension keeps its
 * preference in extension storage, which a web app cannot read, so the two
 * are set independently.
 */
const KEY = 'kona:theme';

export function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    // Private browsing can refuse storage outright; following the phone is a
    // perfectly good answer when we cannot remember a choice.
    return 'system';
  }
}

export function saveTheme(theme: Theme): void {
  try {
    if (theme === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // Not remembering it is survivable; failing to change it would not be.
  }
}

/** Stamp the choice on <html> for the stylesheet to pick up. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.dataset.theme = theme;
}
