import { render } from 'preact';
import { App } from './App';
import './app.css';

render(<App />, document.getElementById('app')!);

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
