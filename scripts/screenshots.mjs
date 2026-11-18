/**
 * Captures the store screenshots at exactly 1280×800.
 *
 * The Chrome Web Store takes 1280×800 or 640×400 and rejects anything else,
 * so these are captured at the size rather than resized afterwards, a
 * screenshot scaled up to fit is obvious, and it is the first thing anyone
 * sees of the product.
 *
 * It drives the harness, not the built extension, because the harness runs
 * the same components against seeded data and can be pointed at a URL. The
 * dev server has to be up first:
 *
 *     npm run dev:harness
 *     node scripts/screenshots.mjs
 *
 * Chrome writes PNG whatever the extension says, so these are .png.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((path) => existsSync(path));

if (!CHROME) {
  console.error('No Chrome found. Edit the list at the top of this file.');
  process.exit(1);
}

const HARNESS = process.env.HARNESS_URL ?? 'http://localhost:5178';

// Pages a headless run can photograph on its own, because everything worth
// seeing on them is there as soon as they load.
const SHOTS = [
  // The product's own surfaces, each seeded by the page so a headless run that
  // cannot click still arrives at something worth photographing.
  ['web-page.png', '/shot-page.html'],
  ['chat-panel.png', '/shot-page.html?open=panel'],
  ['library.png', '/shots.html#/'],
  ['space.png', '/shots.html#/spaces/amoebas'],
  ['spaces.png', '/shots.html#/spaces'],
  ['archived.png', '/shots.html#/archived'],
  ['welcome.png', '/welcome.html'],
];

/**
 * Nothing needs padding any more. The two that used to be captured by hand,
 * a page being marked up, and the panel open, are seeded and driven by
 * `shot-page.html`, which makes the marks the way a person does: select, then
 * pick a pen.
 */
const PAD = [];

// One profile for the whole run, so the harness seeds itself once and every
// shot afterwards sees the same library, the same spaces and the same people.
const profile = mkdtempSync(join(tmpdir(), 'kona-shots-'));

for (const [name, path] of SHOTS) {
  // Absolute: Chrome resolves this against its own working directory, not ours.
  const out = resolve('docs', 'screenshots', name);
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=1280,800',
      // Long enough for the page to seed itself, mount, and make its marks.
      '--virtual-time-budget=9000',
      `--user-data-dir=${profile}`,
      `--screenshot=${out}`,
      `${HARNESS}${path}`,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  report(name, out);
}

for (const [name, from] of PAD) {
  // Vite serves anything outside its root under /@fs/, with forward slashes.
  const onDisk = resolve('docs', 'screenshots', from).split('\\').join('/');
  const src = encodeURIComponent(`/@fs/${onDisk}`);
  const out = resolve('docs', 'screenshots', name);
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=1280,800',
      '--virtual-time-budget=4000',
      `--user-data-dir=${profile}`,
      `--screenshot=${out}`,
      `${HARNESS}/pad.html?src=${src}`,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  report(name, out);
}

/**
 * The small promotional tile, which is 440x280 and nothing else.
 *
 * Captured the same way and for the same reason as the screenshots: it is
 * drawn from the real mark and the real tokens in `harness/tile.html`, so it
 * cannot drift away from the product the way an image exported once from a
 * design tool does.
 */
for (const [name, path] of [['promo-tile.png', '/tile.html']]) {
  const out = resolve('docs', 'screenshots', name);
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=440,280',
      '--virtual-time-budget=5000',
      `--user-data-dir=${profile}`,
      `--screenshot=${out}`,
      `${HARNESS}${path}`,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  report(name, out);
}

function report(name, out) {
  const size = existsSync(out) ? statSync(out).size : 0;
  console.log(size ? `${name}, ${(size / 1024).toFixed(0)} kB` : `${name}, FAILED`);
}
