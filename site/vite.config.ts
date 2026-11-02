import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// The landing page. Plain HTML and CSS; there is no state on it, so there is
// no reason to ship a framework to render it.
//
// This is the root of the published site: the phone app builds into ./app and
// the Team demo into ./team underneath it, so one Pages deploy serves all
// three. Build this one first; it is the one that empties the directory.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  // Relative, so it works from a subpath such as GitHub Pages.
  base: './',
  build: {
    outDir: fileURLToPath(new URL('../.output/site', import.meta.url)),
    // Not emptyOutDir: this directory also holds the phone app at ./app and
    // the Team demo at ./team, and wiping it from here deletes both of them
    // silently. `build:web` clears it once, before all three run.
    emptyOutDir: false,
  },
  // Without this the dev server falls back to index.html for any path it does
  // not have, so /team/ and /app/ quietly serve the landing page again instead
  // of 404ing. That reads exactly like a broken demo button and is not one.
  // `npm run preview:web` serves the built bundle, which really has all three.
  appType: 'mpa',
  server: { port: 5181, strictPort: true },
});
