/**
 * Copies the font files Kona ships into src/design/fonts/.
 *
 *   npm run fonts
 *
 * The files are committed, because the build has to work without reaching the
 * network and because a font is an asset rather than a dependency resolved at
 * runtime. This script is here so that *where they came from* is executable
 * rather than folklore: run it after bumping either package and the vendored
 * copies are replaced.
 *
 * Only the latin, upright, weight-axis files. The optical-size and italic cuts
 * are two to three times the size and nothing in Kona asks for them yet -- no
 * screen sets italic, and the optical-size axis only pays for itself at display
 * sizes, which the boards do not use. Non-latin text falls back to the system
 * font, which is the right outcome: shipping every subset to everybody to cover
 * the passage that might be in Greek is the wrong trade for an extension.
 */
import { copyFileSync, mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'src/design/fonts');

const FILES = [
  {
    from: 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
    to: 'inter-latin.woff2',
  },
  {
    from: 'node_modules/@fontsource-variable/inter/LICENSE',
    to: 'inter-LICENSE.txt',
  },
  {
    from: 'node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2',
    to: 'source-serif-4-latin.woff2',
  },
  {
    from: 'node_modules/@fontsource-variable/source-serif-4/LICENSE',
    to: 'source-serif-4-LICENSE.txt',
  },
];

mkdirSync(OUT, { recursive: true });
for (const { from, to } of FILES) {
  const source = resolve(process.cwd(), from);
  copyFileSync(source, resolve(OUT, to));
  console.log(`${to}: ${(statSync(source).size / 1024).toFixed(1)} KB`);
}
