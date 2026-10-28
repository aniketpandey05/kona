import preact from '@preact/preset-vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// The Team demo: the paid tier, shown working, sharing src/core with the
// extension so the highlights in it behave the way real ones do. It builds
// under the landing page, so one Pages deploy serves all three.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  // Relative, so it works from a subpath such as GitHub Pages.
  base: './',
  plugins: [preact({ prefreshEnabled: false })],
  build: {
    outDir: fileURLToPath(new URL('../.output/site/team', import.meta.url)),
    emptyOutDir: true,
  },
  // 5179 is the phone app; this sits next to it so both can run at once.
  server: { port: 5180, strictPort: true },
});
