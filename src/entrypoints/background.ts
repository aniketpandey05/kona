import { browser, defineBackground } from '#imports';
import type { PendingJump, RuntimeMessage } from '../core/messages';
import type { Mark } from '../core/types';

const LIBRARY_PAGE = '/library.html';
const WELCOME_PAGE = '/welcome.html';
const WEB_SCRIPT_ID = 'web-pages';
const MENU_ID = 'highlight-selection';
// The chat sites come with the extension; every other site is switched on by the user.
const BUILT_IN = [
  'https://*.chatgpt.com/*',
  'https://chat.openai.com/*',
  'https://*.claude.ai/*',
  'https://gemini.google.com/*',
];
const pendingKey = (tabId: number) => `pending-jump:${tabId}`;

/**
 * Safari on iPhone and iPad has no right-click, so it ships no contextMenus
 * API either, and a phone has no windows to bring forward. Reaching straight
 * through a missing one would throw while the background script was still
 * starting up, before a single listener was attached, taking the whole
 * extension down with it. So both are read once, here, and everything that
 * uses them does nothing where they do not exist.
 */
const menus: typeof browser.contextMenus | undefined = browser.contextMenus;
const windows: typeof browser.windows | undefined = browser.windows;

export default defineBackground(() => {
  // Keep the list of user-enabled sites and the script registered for them in step.
  browser.runtime.onInstalled.addListener((details) => {
    void syncWebSites();
    // A fresh install lands on a page explaining what just appeared in the toolbar.
    if (details.reason === 'install') {
      void browser.tabs.create({ url: browser.runtime.getURL(WELCOME_PAGE) });
    }
  });
  browser.runtime.onStartup.addListener(() => void syncWebSites());
  browser.permissions.onAdded.addListener(() => void syncWebSites(true));
  browser.permissions.onRemoved.addListener(() => void syncWebSites());

  menus?.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MENU_ID || tab?.id === undefined) return;
    void browser.tabs
      .sendMessage(tab.id, { type: 'highlight-selection' } satisfies RuntimeMessage)
      .catch(() => undefined);
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    void handle(message as RuntimeMessage, sender.tab?.id).then(sendResponse);
    return true;
  });
});

async function handle(message: RuntimeMessage, senderTabId: number | undefined) {
  switch (message.type) {
    case 'open-mark':
      return openMark(message.mark);
    case 'take-pending-jump':
      return takePendingJump(senderTabId);
    case 'list-sites':
      return enabledSites();
    case 'sites-changed':
      return syncWebSites(true);
    case 'open-library':
      return openLibrary(message.site);
    default:
      return null;
  }
}

/** The sites the user allowed, as match patterns. */
async function enabledSites(): Promise<string[]> {
  const granted = await browser.permissions.getAll();
  return (granted.origins ?? []).filter((origin) => !BUILT_IN.includes(origin));
}

/** Registers (or unregisters) the plain-page script for exactly the allowed sites. */
async function syncWebSites(startOnActiveTab = false): Promise<null> {
  const matches = await enabledSites();
  const registered = await browser.scripting
    .getRegisteredContentScripts({ ids: [WEB_SCRIPT_ID] })
    .catch(() => []);

  if (matches.length === 0) {
    if (registered.length) await browser.scripting.unregisterContentScripts({ ids: [WEB_SCRIPT_ID] });
    await buildMenu(matches);
    return null;
  }
  if (registered.length) {
    await browser.scripting.updateContentScripts([
      { id: WEB_SCRIPT_ID, matches, js: ['content-scripts/web.js'] },
    ]);
  } else {
    await browser.scripting.registerContentScripts([
      {
        id: WEB_SCRIPT_ID,
        matches,
        js: ['content-scripts/web.js'],
        runAt: 'document_idle',
        persistAcrossSessions: true,
      },
    ]);
  }

  await buildMenu(matches);

  // Start highlighting straight away on the page the user just allowed, without a reload.
  if (startOnActiveTab) {
    const [active] = await browser.tabs.query({ active: true, currentWindow: true });
    if (active?.id !== undefined && active.url && matchesAny(active.url, matches)) {
      await browser.scripting
        .executeScript({ target: { tabId: active.id }, files: ['/content-scripts/web.js'] })
        .catch(() => undefined);
    }
  }
  return null;
}

/**
 * The right-click item only appears where highlighting actually works, so it is
 * rebuilt whenever the allowed sites change rather than offered everywhere.
 * Where there is no such menu at all, switching a site on carries on without
 * one: losing the menu must not cost you the highlighting.
 */
async function buildMenu(userSites: string[]): Promise<void> {
  if (!menus) return;
  await menus.removeAll();
  menus.create({
    id: MENU_ID,
    title: 'Highlight with Kona',
    contexts: ['selection'],
    documentUrlPatterns: [...BUILT_IN, ...userSites],
  });
}

function matchesAny(url: string, patterns: string[]): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return patterns.includes(`${protocol}//${hostname}/*`);
  } catch {
    return false;
  }
}

/** Opens (or re-focuses) the page a highlight belongs to and tells that tab to jump to it. */
async function openMark(mark: Mark): Promise<null> {
  const url = new URL(mark.url);
  const pending: PendingJump = { markId: mark.id, conversationId: mark.conversationId };
  const existing = await findTab(`${url.origin}${url.pathname}*`);

  if (existing?.id === undefined) {
    const tab = await browser.tabs.create({ url: mark.url });
    if (tab.id !== undefined) await browser.storage.session.set({ [pendingKey(tab.id)]: pending });
    return null;
  }

  // The tab may already be showing this page, so ask it to jump as well as leaving a note behind.
  await browser.storage.session.set({ [pendingKey(existing.id)]: pending });
  await focusTab(existing);
  await browser.tabs
    .sendMessage(existing.id, { type: 'jump-to-mark', ...pending } satisfies RuntimeMessage)
    .catch(() => undefined);
  return null;
}

async function takePendingJump(tabId: number | undefined): Promise<PendingJump | null> {
  if (tabId === undefined) return null;
  const key = pendingKey(tabId);
  const stored = await browser.storage.session.get(key);
  const pending = stored[key] as PendingJump | undefined;
  if (pending) await browser.storage.session.remove(key);
  return pending ?? null;
}

async function openLibrary(site?: string): Promise<null> {
  const base = browser.runtime.getURL(LIBRARY_PAGE);
  const url = site ? `${base}?site=${encodeURIComponent(site)}` : base;
  // The trailing * so a library already showing a filter still counts as open.
  const existing = await findTab(`${base}*`);
  if (existing?.id === undefined) {
    await browser.tabs.create({ url });
    return null;
  }
  // It is open on some other filter; point it at the one that was asked for.
  if (site) await browser.tabs.update(existing.id, { url });
  await focusTab(existing);
  return null;
}

async function findTab(url: string) {
  // Querying by URL needs permission for that URL, which we only have for allowed sites.
  return browser.tabs
    .query({ url })
    .then((tabs) => tabs[0])
    .catch(() => undefined);
}

async function focusTab(tab: { id?: number; windowId?: number }): Promise<void> {
  if (tab.id !== undefined) await browser.tabs.update(tab.id, { active: true });
  if (tab.windowId !== undefined) await windows?.update(tab.windowId, { focused: true });
}
