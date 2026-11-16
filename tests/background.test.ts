import { expect, it, vi } from 'vitest';

/**
 * Safari does not ship the same extension APIs everywhere. There is no
 * right-click on an iPhone, so there is no `contextMenus` at all, and no
 * windows to bring forward either. The background script has to come up and
 * keep working without them, which is the one thing that cannot be tried from
 * a desktop, so it is tried here instead, against a browser missing both.
 */

const TAB_ID = 7;

interface Hook {
  addListener: (listener: (...args: never[]) => unknown) => void;
  emit: (...args: unknown[]) => void;
}

function hook(): Hook {
  const listeners: ((...args: unknown[]) => unknown)[] = [];
  return {
    addListener: (listener) => void listeners.push(listener as (...args: unknown[]) => unknown),
    emit: (...args) => listeners.forEach((listener) => void listener(...args)),
  };
}

interface Script {
  id: string;
  matches: string[];
}

interface MenuItem {
  id: string;
  documentUrlPatterns: string[];
  contexts?: string[];
}

interface FakeSafari {
  api: Record<string, unknown>;
  /** Content scripts registered for the sites the user allowed. */
  scripts: Script[];
  /** Right-click items, where the platform has them. */
  menuItems: MenuItem[];
  /** Scripts started straight away on the tab in front. */
  started: string[];
  /** Where a pending jump is left for a tab to collect. */
  notes: Record<string, unknown>;
  allowSite: () => void;
  send: (message: unknown, tabId: number) => void;
}

function fakeSafari(has: { menus: boolean; windows: boolean }): FakeSafari {
  const scripts: Script[] = [];
  const menuItems: MenuItem[] = [];
  const started: string[] = [];
  const notes: Record<string, unknown> = {};
  const permissionAdded = hook();
  const messages = hook();

  const api: Record<string, unknown> = {
    runtime: {
      onInstalled: hook(),
      onStartup: hook(),
      onMessage: messages,
      getURL: (path: string) => `safari-web-extension://kona${path}`,
    },
    permissions: {
      onAdded: permissionAdded,
      onRemoved: hook(),
      // One built-in chat site, and one the user switched on themselves.
      getAll: async () => ({ origins: ['https://*.claude.ai/*', 'https://example.com/*'] }),
    },
    scripting: {
      getRegisteredContentScripts: async () => scripts.slice(),
      registerContentScripts: async (added: Script[]) => void scripts.push(...added),
      updateContentScripts: async () => {},
      unregisterContentScripts: async () => void scripts.splice(0),
      executeScript: async (options: { files: string[] }) => void started.push(...options.files),
    },
    tabs: {
      query: async () => [{ id: TAB_ID, url: 'https://example.com/post', windowId: 3 }],
      create: async () => ({ id: 9 }),
      update: async () => {},
      sendMessage: async () => {},
    },
    storage: {
      session: {
        get: async (key: string) => ({ [key]: notes[key] }),
        set: async (entries: Record<string, unknown>) => void Object.assign(notes, entries),
        remove: async (key: string) => void delete notes[key],
      },
    },
  };

  if (has.menus) {
    api.contextMenus = {
      onClicked: hook(),
      removeAll: async () => void menuItems.splice(0),
      create: (item: MenuItem) => void menuItems.push(item),
    };
  }
  if (has.windows) api.windows = { update: async () => {} };

  return {
    api,
    scripts,
    menuItems,
    started,
    notes,
    allowSite: () => permissionAdded.emit(),
    send: (message, tabId) => messages.emit(message, { tab: { id: tabId } }, () => {}),
  };
}

let browserApi: Record<string, unknown>;

vi.mock('#imports', () => ({
  // Read through on every access: the background script reads some of these
  // when it loads, and each test loads it against a different Safari.
  browser: new Proxy({} as Record<string | symbol, unknown>, {
    get: (_target, key) => browserApi[key as string],
  }),
  defineBackground: (main: () => void) => main,
}));

async function start(safari: FakeSafari): Promise<void> {
  browserApi = safari.api;
  vi.resetModules();
  const loaded = await import('../src/entrypoints/background');
  (loaded.default as unknown as () => void)();
}

it('switches a site on where there is no menu to rebuild', async () => {
  const safari = fakeSafari({ menus: false, windows: false });
  await start(safari);

  safari.allowSite();

  // Two, not one: since 3e nothing is built in, so a granted claude.ai is a
  // site the user allowed like any other and gets the adapter that knows it.
  // Filtering it out here was the old behaviour, when it came with the build.
  await vi.waitFor(() => expect(safari.scripts).toHaveLength(2));
  expect(safari.scripts.map((each) => each.id).sort()).toEqual(['claude', 'web-pages']);
  expect(safari.scripts.find((each) => each.id === 'web-pages')!.matches).toEqual([
    'https://example.com/*',
  ]);
  expect(safari.scripts.find((each) => each.id === 'claude')!.matches).toEqual([
    'https://*.claude.ai/*',
  ]);
  // And highlighting starts on the page in front, without a reload, which is
  // what a throw on the way past the missing menu used to cost.
  await vi.waitFor(() => expect(safari.started).toEqual(['/content-scripts/web.js']));
});

it('rebuilds the menu where Safari has one', async () => {
  const safari = fakeSafari({ menus: true, windows: true });
  await start(safari);

  safari.allowSite();

  // Two items: a passage anywhere Kona is allowed, and a picture, which only
  // the page can copy (16, 18).
  await vi.waitFor(() => expect(safari.menuItems).toHaveLength(2));
  const [passage, picture] = safari.menuItems;
  expect(passage!.documentUrlPatterns).toContain('https://example.com/*');
  expect(picture!.contexts).toEqual(['image']);
  expect(picture!.documentUrlPatterns).toContain('https://example.com/*');
});

it('offers a passage on a PDF, where nothing of Kona can run (16)', async () => {
  // The browser's own viewer is privileged in both engines, so the menu is
  // the only way in: a right-click hands over the selection without any host
  // permission, which is the documented exception the whole route rests on.
  const safari = fakeSafari({ menus: true, windows: true });
  await start(safari);

  safari.allowSite();

  await vi.waitFor(() => expect(safari.menuItems).toHaveLength(2));
  expect(safari.menuItems[0]!.documentUrlPatterns).toContain('*://*/*.pdf');
  // And never for a picture, because copying one needs the page.
  expect(safari.menuItems[1]!.documentUrlPatterns).not.toContain('*://*/*.pdf');
});

it('opens a highlight with no window to focus', async () => {
  const safari = fakeSafari({ menus: false, windows: false });
  await start(safari);

  safari.send(
    {
      type: 'open-mark',
      mark: { id: 'm1', conversationId: 'c1', url: 'https://example.com/post' },
    },
    TAB_ID,
  );

  // The jump is left where that tab will look for it, rather than lost to a
  // throw on the way to a window the phone does not have.
  await vi.waitFor(() =>
    expect(safari.notes[`pending-jump:${TAB_ID}`]).toEqual({
      markId: 'm1',
      conversationId: 'c1',
    }),
  );
});
