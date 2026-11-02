/**
 * Proves the desktop app actually syncs, by running it.
 *
 * Not a unit test: the engine and the disk adapter have those. This is the
 * claim that only launching the real thing can check; that a window nobody
 * has opened, on a library in a real Chromium profile, keeps a real folder on
 * a real disk in step on its own.
 *
 * It works by taking the file away. The app reads the folder, takes the
 * highlight into its library, and then agrees with the file and leaves it
 * alone. Delete it and the next pass has to put it back out of the library,
 * which it can only do if the import, the storage and the write all worked.
 *
 *   node scripts/desktop-check.mjs
 */

import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import electron from 'electron';

const SYNC_FILE = 'kona-library.json';
/** The hook's own interval, plus room for a slow first paint. */
const PASS_MS = 12_000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const exists = (path) =>
  readFile(path, 'utf8').then(
    (text) => text,
    () => null,
  );

const PASSAGE = 'Logical replication keeps the downtime down';

const library = {
  app: 'kona',
  version: 2,
  exportedAt: Date.now(),
  marks: [
    {
      id: 'check-1',
      snapshot: PASSAGE,
      site: 'chatgpt',
      conversationId: 'c1',
      conversationTitle: 'Upgrading Postgres',
      url: 'https://chatgpt.com/c/c1',
      color: 'yellow',
      createdAt: 100,
      updatedAt: 100,
    },
  ],
};

const folder = await mkdtemp(join(tmpdir(), 'kona-folder-'));
const profile = await mkdtemp(join(tmpdir(), 'kona-profile-'));
const file = join(folder, SYNC_FILE);

const done = [];
const check = (what, ok) => {
  done.push({ what, ok });
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}`);
};

// The app is pointed at the folder the way a second run would find it: in the
// settings file it wrote the first time, so no dialog has to be clicked.
await writeFile(join(profile, 'settings.json'), JSON.stringify({ folder }), 'utf8');
await writeFile(file, JSON.stringify(library, null, 2), 'utf8');

const app = spawn(
  electron,
  ['.output/desktop/main.cjs', '--hidden', `--user-data-dir=${profile}`],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);

let noise = '';
app.stdout.on('data', (chunk) => (noise += chunk));
app.stderr.on('data', (chunk) => (noise += chunk));

try {
  // Long enough for the window to load and run its first pass.
  await wait(PASS_MS);
  check('the app is still running with no window shown', app.exitCode === null);

  const untouched = await exists(file);
  check(
    'it left the file alone, having agreed with it',
    untouched !== null && JSON.parse(untouched).marks.length === 1,
  );

  await rm(file, { force: true });
  check('the file is gone', (await exists(file)) === null);

  // One more pass of the interval, with the window still never shown.
  await wait(PASS_MS + 6_000);

  const back = await exists(file);
  check('the file came back', back !== null);
  check(
    'and it came back with the highlight in it',
    !!back && back.includes(PASSAGE) && JSON.parse(back).marks.length === 1,
  );
  check('without the signing key in it', !!back && !back.includes('"signingKey"'));

  const shouting = noise
    .split('\n')
    .filter((line) => /error|uncaught|rejected/i.test(line))
    // Chromium says this on every Windows launch and it means nothing here.
    .filter((line) => !/GPU|dxgi|gpu_init|cache|Registration response error/i.test(line));
  check('nothing shouted on the way', shouting.length === 0);
  if (shouting.length) console.log(shouting.join('\n'));
} finally {
  // Wait for it to actually be gone: Windows holds the profile's files open,
  // and tidying up underneath a live Chromium fails with EBUSY.
  const ended = new Promise((resolve) => app.once('exit', resolve));
  app.kill();
  await Promise.race([ended, wait(5_000)]);
  const tidy = (path) => rm(path, { recursive: true, force: true, maxRetries: 5 }).catch(() => {});
  await Promise.all([tidy(folder), tidy(profile)]);
}

const failed = done.filter((entry) => !entry.ok).length;
console.log(`\n${done.length - failed}/${done.length} checks passed`);
process.exit(failed ? 1 : 0);
