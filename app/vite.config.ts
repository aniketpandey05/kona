import preact from '@preact/preset-vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// The Android app: a installable web app that shares src/core with the extension.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  // Relative, so the build works from a subpath such as GitHub Pages.
  base: './',
  plugins: [preact({ prefreshEnabled: false })],
  build: { outDir: fileURLToPath(new URL('../.output/app', import.meta.url)), emptyOutDir: true },
  server: { port: 5179, strictPort: true },
});
