import preact from '@preact/preset-vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * The window's contents: the phone app's UI, built for a `file://` page.
 *
 * `base` is relative because nothing serves this — Electron loads the HTML off
 * the disk, and an absolute path would look for the assets at the root of the
 * drive. The icons come from the app's public folder, which is also where the
 * main process reads the tray icon from, so there is one set of them.
 */
export default defineConfig({
  root: here('.'),
  publicDir: here('../app/public'),
  base: './',
  plugins: [preact({ prefreshEnabled: false })],
  build: { outDir: here('../.output/desktop/renderer'), emptyOutDir: true },
  // 5178-5182 are taken by the harness, the app, the team demo and the site.
  server: { port: 5183, strictPort: true },
});
