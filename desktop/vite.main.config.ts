import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * The two files that run outside the window.
 *
 * CommonJS rather than ESM: Electron will load either now, but `__dirname` in
 * the main process and `require('electron')` in a sandboxed preload are both
 * plain and well-trodden this way, and neither file is big enough for the
 * module format to be interesting. `.cjs` because the repo is `type: module`.
 *
 * Bundled rather than hand-written so these can import from `src/core` — the
 * sync file name and the scope type come from the same place the extension
 * gets them, which is the point of having a core at all.
 */
export default defineConfig({
  build: {
    outDir: here('../.output/desktop'),
    // The renderer lives in a folder beneath this one, and is built separately.
    emptyOutDir: false,
    target: 'node22',
    // Nothing here is shipped over a wire, and a readable main process is
    // worth more than a small one when somebody is checking what it does.
    minify: false,
    lib: {
      entry: { main: here('src/main.ts'), preload: here('src/preload.ts') },
      formats: ['cjs'],
      fileName: (_format, name) => `${name}.cjs`,
    },
    rollupOptions: { external: ['electron', /^node:/] },
  },
});
