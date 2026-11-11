import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { App } from './App';
import { Library } from './Library';
// The tokens first, then the two rooms that read them. app.css is what is left
// of the old screens and goes as each is rebuilt.
import '../../src/design/fonts.css';
import '../../src/design/tokens.css';
import '../../src/design/passage.css';
import './library.css';
import './app.css';

/**
 * Spaces are still the old screen; Highlights is the rebuilt one (3f). Both
 * are views of the one library, so they share the address and differ by the
 * fragment, which is also how the extension links to a space.
 */
function Kona() {
  const [route, setRoute] = useState(location.hash);
  useEffect(() => {
    const read = () => setRoute(location.hash);
    addEventListener('hashchange', read);
    return () => removeEventListener('hashchange', read);
  }, []);
  return route.startsWith('#/spaces') ? <App /> : <Library />;
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
