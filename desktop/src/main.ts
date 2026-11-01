/**
 * Kona on a desktop: the same app, in a window that does not have to be open.
 *
 * Everything else Kona runs in is a web page, and a web page only runs while
 * you are looking at it. The extension syncs while a Kona tab is open because
 * Manifest V3 stops a service worker after a few seconds of quiet; the phone
 * app syncs when you tap it. Neither is wrong, and neither is "my highlights
 * are on both my machines without my thinking about it".
 *
 * This is. The window closes to the tray rather than exiting, the renderer
 * keeps running when it is hidden, and `backgroundThrottling` is off so its
 * timer is not slowed down for being out of sight. The folder is a path on
 * disk instead of a handle behind a permission, so there is no picker to be
 * missing and nothing to re-grant after a restart — which is what makes this
 * the one place sync is automatic on Windows, macOS and Linux alike.
 *
 * The library stays in the renderer, where it already lives, and so does the
 * sync pass. This process owns exactly two things the renderer cannot have: a
 * native folder picker, and the file. It is deliberately the only code with a
 * path in it — the renderer asks for "the folder" and never names one, so a
 * mistake in the UI cannot reach anywhere else on the disk.
 */

import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, Tray } from 'electron';
import { basename, join } from 'node:path';
import { folderAt, readJson, writeJson } from './disk';
import { EVERYTHING, type Scope } from '../../src/core/sync';

app.setName('Kona');

interface Settings {
  /** The folder being synced, as the person chose it. */
  folder?: string;
  /** What that folder is allowed to carry. */
  scope?: Scope;
}

const settingsFile = () => join(app.getPath('userData'), 'settings.json');

let settings: Settings = {};
const load = async () => {
  settings = (await readJson<Settings>(settingsFile())) ?? {};
};
const keep = () => writeJson(settingsFile(), settings);

/**
 * Started at login, so there is nothing to look at yet.
 *
 * The window is still created and still running — that is the entire point of
 * this app — it just does not come to the front. Opening it from the tray is
 * how you get to it.
 */
const startHidden = process.argv.includes('--hidden');

let window: BrowserWindow | null = null;
let tray: Tray | null = null;
/** Closing the window hides it; only this lets the process actually end. */
let quitting = false;

const asset = (...parts: string[]) => join(__dirname, 'renderer', ...parts);

function createWindow(): BrowserWindow {
  const created = new BrowserWindow({
    width: 940,
    height: 800,
    minWidth: 420,
    minHeight: 540,
    show: false,
    title: 'Kona',
    icon: asset('icon', '512.png'),
    backgroundColor: '#fdfcfb',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // The point of the tray: a hidden window still syncs. Chromium slows
      // timers in backgrounded pages to once a minute or worse, which would
      // quietly turn "always on" into "eventually".
      backgroundThrottling: false,
    },
  });

  const devUrl = process.env.KONA_DEV_URL;
  void (devUrl ? created.loadURL(devUrl) : created.loadFile(asset('index.html')));
  created.once('ready-to-show', () => {
    if (!startHidden) created.show();
  });

  created.on('close', (event) => {
    if (quitting) return;
    // Not an exit. Someone closing the window means they are done looking at
    // it, not that they want their machines to stop keeping up with each
    // other — and a sync that stopped the moment you tidied your desktop
    // would be worse than no sync, because you would not know.
    event.preventDefault();
    created.hide();
  });

  return created;
}

function show(): void {
  window ??= createWindow();
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

function createTray(): void {
  // 32px, because Windows wants a small one and scales a large one badly.
  const image = nativeImage.createFromPath(asset('icon', '32.png'));
  if (image.isEmpty()) return;
  tray = new Tray(image);
  tray.on('click', show);
  refreshTray();
}

function refreshTray(): void {
  if (!tray) return;
  const folder = settings.folder;
  tray.setToolTip(folder ? `Kona — syncing ${basename(folder)}` : 'Kona — no folder yet');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Kona', click: show },
      {
        label: folder ? `Sync ${basename(folder)} now` : 'No folder chosen yet',
        enabled: !!folder,
        click: () => window?.webContents.send('sync:now'),
      },
      { type: 'separator' },
      {
        label: 'Quit Kona',
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
}

function createMenu(): void {
  // Small on purpose, but Edit has to be here: on macOS, copy and paste in a
  // renderer do not work at all unless the roles are on a menu somewhere.
  const template: Electron.MenuItemConstructorOptions[] = [
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
  ];
  if (process.platform === 'darwin') template.unshift({ role: 'appMenu' });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/**
 * The renderer asks for "the folder" and is never allowed to name one. Which
 * means the worst a mistake in the UI can do is read or write the one file in
 * the one folder the person picked themselves.
 */
function wire(): void {
  ipcMain.handle('folder:pick', async () => {
    const chosen = await dialog.showOpenDialog({
      title: 'Choose a folder your computer already keeps in sync',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Sync this folder',
    });
    const picked = chosen.canceled ? undefined : chosen.filePaths[0];
    if (!picked) return null;
    settings.folder = picked;
    await keep();
    refreshTray();
    return { name: basename(picked), path: picked };
  });

  ipcMain.handle('folder:saved', () =>
    settings.folder ? { name: basename(settings.folder), path: settings.folder } : null,
  );

  ipcMain.handle('folder:forget', async () => {
    delete settings.folder;
    delete settings.scope;
    await keep();
    refreshTray();
  });

  ipcMain.handle('folder:read', () => (settings.folder ? folderAt(settings.folder).read() : null));

  ipcMain.handle('folder:write', async (_event, text: unknown) => {
    if (!settings.folder || typeof text !== 'string') return;
    await folderAt(settings.folder).write(text);
  });

  ipcMain.handle('scope:get', () => settings.scope ?? EVERYTHING);

  ipcMain.handle('scope:set', async (_event, scope: unknown) => {
    const wanted = scope as Scope | null;
    settings.scope =
      wanted?.kind === 'spaces' && Array.isArray(wanted.origins) ? wanted : EVERYTHING;
    await keep();
  });
}

// Two copies syncing one folder would each overwrite what the other had just
// read, so a second one hands over to the first rather than starting.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', show);

  void app.whenReady().then(async () => {
    await load();
    wire();
    createMenu();
    createTray();
    window = createWindow();
  });

  app.on('activate', show);
  // Nothing on window-all-closed, on any platform: the tray is the app now.
  app.on('before-quit', () => {
    quitting = true;
  });
}
