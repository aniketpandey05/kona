/**
 * Photographs the desktop app, at the size a store listing wants.
 *
 * `screenshots.mjs` drives headless Chrome against the harness, which cannot
 * reach this: the desktop app is Electron, and the thing worth showing, a
 * folder being kept in step, only exists once the app has read one. So this
 * seeds a real folder, launches the real app against a throwaway profile, and
 * photographs the window over the debugging protocol.
 *
 *     npm run build:desktop
 *     node scripts/desktop-shot.mjs
 */

import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import electron from 'electron';

/**
 * The window's own default size. Not the store's 1280×800: the desktop app is
 * not going in a store, and forcing it that wide only photographs a lot of
 * empty desk either side of a reading column that is meant to be narrow.
 */
const WIDTH = 940;
const HEIGHT = 760;
const PORT = 9335;
const OUT = resolve('docs', 'screenshots');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Kept here rather than in the harness fixture because the harness is local
// tooling and this script has to run without it. Six passages out of one
// conversation: enough to look like a library and little enough to read.
const PASSAGES = [
  ['Logical replication keeps the downtime down to the switchover itself', 'yellow'],
  ['Named volumes are kept when the container is removed, bind mounts are not', 'green'],
  ['A rolling upgrade needs the old and the new schema to both be readable', 'blue'],
  ['The planner will not use a partial index unless the predicate matches', 'pink'],
  ['Back-pressure is the only honest answer to a queue that cannot keep up', 'yellow'],
  ['Retries without jitter turn one slow dependency into a thundering herd', 'green'],
];

const marks = PASSAGES.map(([snapshot, color], index) => ({
  id: `shot-${index}`,
  snapshot,
  site: 'chatgpt',
  conversationId: 'c1',
  conversationTitle: 'Upgrading Postgres without downtime',
  url: 'https://chatgpt.com/c/c1',
  color,
  note: index === 0 ? 'This is the bit that decides the maintenance window.' : undefined,
  tags: index === 0 ? ['postgres', 'migration'] : index === 1 ? ['docker'] : undefined,
  createdAt: 1762000000000 - index * 3600_000,
  updatedAt: 1762000000000 - index * 3600_000,
}));

const folder = await mkdtemp(join(tmpdir(), 'Kona sync-'));
const profile = await mkdtemp(join(tmpdir(), 'kona-shot-'));
await mkdir(OUT, { recursive: true });
await writeFile(join(profile, 'settings.json'), JSON.stringify({ folder }), 'utf8');
await writeFile(
  join(folder, 'kona-library.json'),
  JSON.stringify({ app: 'kona', version: 2, exportedAt: Date.now(), marks }, null, 2),
  'utf8',
);

const app = spawn(
  electron,
  ['.output/desktop/main.cjs', `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`],
  { stdio: ['ignore', 'ignore', 'ignore'] },
);

/** The window, once Chromium is listening. */
async function page() {
  for (let tries = 0; tries < 60; tries++) {
    try {
      const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
      const found = list.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (found) return found;
    } catch {
      // Not up yet.
    }
    await wait(500);
  }
  throw new Error('the window never appeared');
}

const socket = new WebSocket((await page()).webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});

let id = 1;
const waiting = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (waiting.has(message.id)) {
    waiting.get(message.id)(message.result ?? {});
    waiting.delete(message.id);
  }
};
const send = (method, params = {}) =>
  new Promise((resolve) => {
    waiting.set(id, resolve);
    socket.send(JSON.stringify({ id: id++, method, params }));
  });

try {
  await send('Page.enable');
  // Photographed at the size a store listing wants rather than the size this
  // window happens to be. The clip matters: without it the capture is of the
  // real window surface, and the overridden page sits letterboxed inside it.
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  });
  // Long enough for the first sync pass, so the menu has a folder to name.
  await wait(6_000);

  const shoot = async (name) => {
    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 1 },
    });
    writeFileSync(join(OUT, name), Buffer.from(shot.data, 'base64'));
    console.log(`wrote docs/screenshots/${name}`);
  };

  await shoot('desktop.png');

  await send('Runtime.evaluate', { expression: "document.querySelector('.app-more').click()" });
  await wait(600);
  await shoot('desktop-sync.png');
} finally {
  const ended = new Promise((resolve) => app.once('exit', resolve));
  socket.close();
  app.kill();
  await Promise.race([ended, wait(5_000)]);
  const tidy = (path) => rm(path, { recursive: true, force: true, maxRetries: 5 }).catch(() => {});
  await Promise.all([tidy(folder), tidy(profile)]);
}
