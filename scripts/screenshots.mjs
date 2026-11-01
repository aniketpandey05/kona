/**
 * Captures the store screenshots at exactly 1280×800.
 *
 * The Chrome Web Store takes 1280×800 or 640×400 and rejects anything else,
 * so these are captured at the size rather than resized afterwards — a
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
  ['library.png', '/library.html'],
  ['spaces.png', '/spaces.html'],
  ['space.png', '/spaces.html#/demo-postgres'],
];

/**
 * The two that cannot be: a highlight being made needs the note card open and
 * the panel needs a click, and the harness pages carry a debug box a store
 * listing should not show. Those two are captured by hand and only padded out
 * to store size here, at their own scale rather than stretched.
 */
const PAD = [
  ['web-page.png', 'web-page.jpg'],
  ['chat-panel.png', 'chat-panel.jpg'],
];

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
      // Long enough for the seed to make two keypairs and sign with them.
      '--virtual-time-budget=8000',
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

function report(name, out) {
  const size = existsSync(out) ? statSync(out).size : 0;
  console.log(size ? `${name} — ${(size / 1024).toFixed(0)} kB` : `${name} — FAILED`);
}
