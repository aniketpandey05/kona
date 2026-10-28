import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// The landing page. Plain HTML and CSS — there is no state on it, so there is
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
    emptyOutDir: true,
  },
  server: { port: 5181, strictPort: true },
});
