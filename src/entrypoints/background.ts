import { konaAppUrl } from '../core/bridge';
import { browser, defineBackground, storage } from '#imports';
import type { PendingJump, RuntimeMessage } from '../core/messages';
import { SITE_SCRIPTS, WEB_SCRIPT, scriptsForOrigins } from '../core/sites';
import { captureSelection } from '../core/capture';
import { fileIntoActiveSpace } from '../core/activeSpace';
import { loadPalette } from '../core/palette';
import { loadMe, mergeDuplicatePages, upsertMark } from '../core/store';
import type { Mark } from '../core/types';


const WELCOME_PAGE = '/welcome.html';
const MENU_ID = 'highlight-selection';
const IMAGE_MENU_ID = 'highlight-image';
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
    // 4: it opens until it has been *finished*, not until it has been opened.
    // Setup abandoned halfway resumes, the way a phone's does; only setup that
    // reached the end stops coming back. So this asks the flag rather than the
    // reason, and an install that was closed early is met again on the next
    // update rather than never.
    void openWelcomeUnlessFinished();
    // Page identity stopped counting tracking parameters, so highlights saved
    // under `?utm_source=...` belong somewhere else now. Nothing was lost when
    // the rule changed, but it stays unreachable until this has run.
    if (details.reason === 'update') {
      void mergeDuplicatePages();
    }
  });
  browser.runtime.onStartup.addListener(() => void syncWebSites());
  browser.permissions.onAdded.addListener(() => void syncWebSites(true));
  browser.permissions.onRemoved.addListener(() => void syncWebSites());

  menus?.onClicked.addListener((info, tab) => {
    if (info.menuItemId === MENU_ID) void keepSelection(info, tab?.id);
    if (info.menuItemId === IMAGE_MENU_ID && tab?.id !== undefined && info.srcUrl) {
      // Only the page can do this one: the bytes have to be copied out of the
      // picture that is already decoded there (18), so unlike a selection
      // there is no fallback for a page Kona cannot run in.
      void browser.tabs
        .sendMessage(tab.id, { type: 'highlight-image', src: info.srcUrl } satisfies RuntimeMessage)
        .catch(() => undefined);
    }
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
    case 'open-space':
      return openSpace(message.spaceId);
    default:
      return null;
  }
}

/**
 * The sites the user allowed, as match patterns.
 *
 * 3e: every one of them, with nothing filtered out, because nothing is built
 * in any more. What the browser has granted is the whole truth about where
 * Kona may run, there is no second list for it to disagree with.
 */
async function enabledSites(): Promise<string[]> {
  const granted = await browser.permissions.getAll();
  return granted.origins ?? [];
}

/**
 * Registers exactly the scripts the allowed sites need, and nothing else.
 *
 * Every content script is registered at runtime now (3e), including the three
 * that know the chat sites. A site Kona has an adapter for gets that adapter;
 * everything else gets the plain-page one. Registering the wrong one is the
 * quiet failure here: ChatGPT would still highlight, but as an ordinary
 * page, and stop understanding a conversation, so which script owns which
 * host is decided in `core/sites.ts`, under test.
 */
async function syncWebSites(startOnActiveTab = false): Promise<null> {
  const matches = await enabledSites();
  const wanted = scriptsForOrigins(matches);
  const wantedIds = new Set(wanted.map((each) => each.id));
  const allIds = [...SITE_SCRIPTS.map((each) => each.id), WEB_SCRIPT.id];

  const registered = await browser.scripting
    .getRegisteredContentScripts({ ids: allIds })
    .catch(() => []);
  const registeredIds = new Set(registered.map((each) => each.id));

  // Anything granted and then taken back leaves a script with nothing to run
  // on. Unregister it rather than leave it matching an origin Kona no longer
  // holds.
  const stale = [...registeredIds].filter((id) => !wantedIds.has(id));
  if (stale.length) await browser.scripting.unregisterContentScripts({ ids: stale });

  for (const script of wanted) {
    const entry = {
      id: script.id,
      matches: script.matches,
      js: [script.js],
      runAt: 'document_idle' as const,
      persistAcrossSessions: true,
    };
    if (registeredIds.has(script.id)) await browser.scripting.updateContentScripts([entry]);
    else await browser.scripting.registerContentScripts([entry]);
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
 * Where PDFs are read. Both engines treat their viewer as privileged, so no
 * content script runs there and the menu is the only way in (16).
 *
 * It needs no host permission: the selection arrives with the menu click
 * rather than being read out of the page, which is the documented exception
 * the whole PDF route rests on.
 */
const PDF_PATTERNS = ['*://*/*.pdf', 'file:///*.pdf'];

/**
 * The right-click item appears where highlighting works, and on PDFs, where it
 * is the only thing that does. It is rebuilt whenever the allowed sites change
 * rather than offered everywhere. Where there is no such menu at all, switching
 * a site on carries on without one: losing the menu must not cost you the
 * highlighting.
 */
async function buildMenu(userSites: string[]): Promise<void> {
  if (!menus) return;
  await menus.removeAll();
  menus.create({
    id: MENU_ID,
    title: 'Highlight with Kona',
    contexts: ['selection'],
    // Only where Kona is actually allowed (3e), plus the PDF viewer, which no
    // permission can reach and which a right-click can (16).
    documentUrlPatterns: [...userSites, ...PDF_PATTERNS],
  });
  // A picture is a highlight too (18), and only where Kona runs: the copy is
  // made from the page, so there is nothing a privileged page could offer.
  menus.create({
    id: IMAGE_MENU_ID,
    title: 'Keep this picture with Kona',
    contexts: ['image'],
    documentUrlPatterns: userSites,
  });
}

/**
 * Keeping what was selected when the menu fired.
 *
 * The page's own content script is asked first, because where there is one it
 * can do the whole job: find the passage in the document, paint it, and store
 * where it sits so it can be found again. Only when nothing answers, which is
 * what a privileged page sounds like from here, does the background keep the
 * selection itself.
 *
 * Asking first rather than deciding by URL is deliberate. A PDF is not the
 * only page Kona cannot run in, and a page that looks like a PDF from its
 * address is not always one.
 */
async function keepSelection(
  info: { selectionText?: string; pageUrl?: string },
  tabId: number | undefined,
): Promise<void> {
  if (tabId !== undefined) {
    const answered = await browser.tabs
      .sendMessage(tabId, { type: 'highlight-selection' } satisfies RuntimeMessage)
      .then(() => true)
      .catch(() => false);
    if (answered) return;
  }

  const text = info.selectionText?.trim();
  const url = info.pageUrl;
  if (!text || !url) return;

  const tab = tabId === undefined ? undefined : await browser.tabs.get(tabId).catch(() => undefined);
  const [pen] = await loadPalette();
  const mark = captureSelection({ text, url, title: tab?.title, color: pen ?? 'yellow' });
  await upsertMark(mark);
  // A space that is active takes what you keep while it is (1a), wherever it
  // was kept from. A PDF is not an exception to that.
  await fileIntoActiveSpace(mark.id, await loadMe());
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

/**
 * 3c. The library is the web app now, not a page of the extension's. A tab is
 * a tab either way, so nothing about the gesture changes, what changes is
 * that there is one library instead of two that can come to disagree.
 */
/** Opens Welcome unless it has been seen through to the end (4). */
async function openWelcomeUnlessFinished(): Promise<void> {
  if ((await storage.getItem<boolean>('local:welcome-finished')) === true) return;
  await browser.tabs.create({ url: browser.runtime.getURL(WELCOME_PAGE) });
}

async function openLibrary(site?: string): Promise<null> {
  const base = konaAppUrl('', import.meta.env.DEV);
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

async function openSpace(spaceId: string): Promise<null> {
  const base = konaAppUrl('', import.meta.env.DEV);
  const url = `${base}#/spaces/${spaceId}`;
  const existing = await findTab(`${base}*`);
  if (existing?.id === undefined) {
    await browser.tabs.create({ url });
    return null;
  }
  // A spaces tab is already open, on some other space or none. Point it here.
  await browser.tabs.update(existing.id, { url });
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
