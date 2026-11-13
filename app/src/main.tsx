import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Library } from './Library';
import { Shared, sharedNow } from './Shared';
// The tokens first, then the two rooms that read them. app.css is what is left
// of the old screens and goes as each is rebuilt.
import '../../src/design/fonts.css';
import '../../src/design/tokens.css';
import '../../src/design/passage.css';
import './library.css';

/**
 * Highlights is the rebuilt view (3f). Spaces, settings, folder sync, the
 * install prompt and the share target are still the old screen, and they are
 * routed to deliberately rather than left stranded.
 *
 * That stranding is a mistake worth naming: when Highlights took the default
 * route, everything in the old screen's default branch stopped being reachable
 * — the install prompt (24), folder sync, the backup, and the Android share
 * target (1h), which arrives on a plain URL with no fragment at all and so was
 * silently landing on the library instead of capturing anything.
 *
 * So a share is checked for first, before any routing, because it is the one
 * arrival that cannot say where it wants to go.
 */
function Kona() {
  const [route, setRoute] = useState(location.hash);
  useEffect(() => {
    const read = () => setRoute(location.hash);
    addEventListener('hashchange', read);
    return () => removeEventListener('hashchange', read);
  }, []);

  // Share › Kona, from an Android share sheet (1h). No fragment at all, so it
  // has to be recognised by what it carries rather than where it points —
  // which is exactly how it went unnoticed when the library took the default
  // route and this was landing there, capturing nothing.
  const shared = sharedNow();
  if (shared) return <Shared payload={shared} />;

  // Everything else is the library, which is the place (3f): Highlights,
  // Archived, Spaces and Settings are all views of it.
  return <Library route={route} />;
}

render(<Kona />, document.getElementById('app')!);

// Registered from here rather than inline so the app still runs when the page
// is opened from a file or a context where service workers are unavailable.
if ('serviceWorker' in navigator) {
  addEventListener('load', () => {
    // Relative to the page, so it still resolves when hosted under a subpath.
    void navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      // No service worker means no install prompt, but the app still runs.
    });
  });
}
