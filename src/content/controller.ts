import { browser, storage, type ContentScriptContext } from '#imports';
import type { MessageRef, SiteAdapter } from '../adapters/types';
import {
  fileIntoActiveSpace,
  keepOutOfActiveSpace,
  loadActiveSpace,
  setActiveSpaceId,
  watchActiveSpaceId,
} from '../core/activeSpace';
import { debounce } from '../core/debounce';
import { describeMessage, resolveMarks, type ResolvedMark } from '../core/locate';
import type { PendingJump, RuntimeMessage } from '../core/messages';
import { moveItem, nextOrder, sortByOrder } from '../core/order';
import { HighlightPainter } from '../core/painter';
import { describeQuote } from '../core/quote';
import { linkToMark } from '../core/link';
import { sameSite, siteLabel } from '../core/sites';
import type { Space } from '../core/spaces';
import {
  loadAllMarks,
  loadMarks,
  loadMe,
  removeMark,
  saveOrder,
  upsertMark,
  watchMarks,
  watchSpaces,
} from '../core/store';
import { loadTheme, watchTheme, type Theme } from '../core/theme';
import { buildTextIndex, spanFromRange, type TextIndex, type TextSpan } from '../core/textIndex';
import { DEFAULT_PENS, type PenId } from '../core/pens';
import { KEPT_AS, KEPT_QUALITY, imageKey, scaleTo, UNDESCRIBED, wordsFor } from '../core/image';
import { loadPalette, watchPalette } from '../core/palette';
import type { Mark } from '../core/types';

/** Tag name of the shadow-root host that holds all of our UI. */
export const UI_TAG = 'kona-ui';

// A chat page that still shows no messages after this long probably has a changed layout.
const BROKEN_AFTER_MS = 5000;
const NOTICE_MS = 4000;
const JUMP_FLASH_MS = 1600;
const JUMP_SETTLE_MS = 700;
// How long to keep looking for a highlight the library asked us to jump to.
const JUMP_WAIT_MS = 15000;
const JUMP_POLL_MS = 300;
// Scrolling up to let a site load older messages: how many screens to try, and how long to wait each time.
const LOAD_OLDER_STEPS = 12;
const LOAD_OLDER_WAIT_MS = 400;
const SEARCH_RESULTS = 8;
// How long a selection has to stop changing before a finger is taken to have
// finished dragging it about.
const SELECTION_SETTLE_MS = 250;
const UNDO_MS = 7000;
const MARK_HASH = '#bookmark=';
// Approximate note card size, used to keep it on screen. Matches .k-card in styles.css.
const CARD_WIDTH = 300;
const CARD_HEIGHT = 200;
const CARD_GAP = 8;
// Clicks on these keep their normal behaviour instead of opening a highlight's note.
const INTERACTIVE = 'a, button, input, textarea, select, [contenteditable="true"]';

export interface PanelItem {
  mark: Mark;
  found: boolean;
}

export interface NoteCardState {
  markId: string;
  /** Viewport position next to the highlight; null docks the card beside the panel. */
  position: { top: number; left: number } | null;
  focusNote: boolean;
}

/**
 * The space new highlights are going into, as the panel needs to say it.
 *
 * 2e: the panel always says where highlights are going, in words, whenever a
 * space is active. A quiet mode that silently changes where your work goes is
 * a bad trade for a saved click: you set a space on Monday, forget, and
 * spend Thursday filing amoeba research into it.
 */
export interface ActiveSpaceState {
  id: string;
  name: string;
  /**
   * How many people are in it. More than one means a passage filed here is
   * visible to other people, which is a different act from keeping it in your
   * own library, and the panel never lets the two look alike (25).
   */
  people: number;
  /** The passages already gathered here, from every page (2f). */
  items: Mark[];
}

export interface ViewState {
  /**
   * Whether Kona is running here at all.
   *
   * Since 3e there is no soft switch: a content script only exists on a site
   * the browser has granted, so by the time this object does, the answer is
   * yes. It is kept because the panel still has to draw nothing before a page
   * is recognised, and because taking the permission back tears the script
   * down rather than setting this to false.
   */
  enabled: boolean;
  conversationId: string | null;
  /** Highlights in the user's order. */
  items: PanelItem[];
  /** A just-deleted highlight that can still be brought back. */
  undo: { label: string } | null;
  /** Viewport position of the current text selection, when it can be highlighted. */
  selection: { top: number; bottom: number; left: number; streaming: boolean } | null;
  card: NoteCardState | null;
  health: 'ok' | 'no-messages';
  /** The pens in the case, which you can add to (12). */
  pens: PenId[];
  /** Where highlights are going, and what is already there. Null when none is set. */
  activeSpace: ActiveSpaceState | null;
  /**
   * Highlights kept on this site but in other conversations. A new chat starts
   * empty, which looks identical to having never highlighted here at all.
   */
  elsewhere: number;
  /**
   * What the thing you are reading is called here. Kona started on AI chats
   * and now runs on anything, so the panel has to stop calling a blog post a
   * chat, the adapter already knows which it is.
   */
  noun: 'chat' | 'page';
  dark: boolean;
  notice: string | null;
  /**
   * Where to draw an outline, for every kept picture on this page (18).
   *
   * An image is not text, so the CSS Custom Highlight API cannot paint it.
   * These are viewport rectangles recomputed on every refresh, and the outline
   * is drawn in Kona's own layer from them, never in the page's DOM, which is
   * the same discipline everything else here keeps.
   */
  outlines: Outline[];
}

export interface Outline {
  markId: string;
  color: PenId;
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PendingSelection {
  message: MessageRef;
  index: TextIndex;
  span: TextSpan;
}

export class KonaController {
  private state: ViewState = {
    enabled: true,
    conversationId: null,
    elsewhere: 0,
    noun: 'chat',
    items: [],
    undo: null,
    selection: null,
    card: null,
    health: 'ok',
    pens: [...DEFAULT_PENS],
    activeSpace: null,
    dark: false,
    notice: null,
    outlines: [],
  };
  /** Every highlight from every site, loaded when the search box opens. */
  private allMarks: Mark[] = [];

  /** The space being worked in, or null. Watched, because it is set elsewhere. */
  private activeSpace: Space | null = null;
  private unwatchActive: (() => void) | undefined;
  private unwatchSpaces: (() => void) | undefined;
  private unwatchPens: (() => void) | undefined;
  /** Kept for a few seconds after a delete, so it can be undone. */
  private deleted: Mark | null = null;
  /**
   * A deleted picture's bytes, held for as long as the undo is offered.
   *
   * Taken out of storage with the highlight so a deleted picture stops taking
   * room immediately, and kept here rather than thrown away, because bringing
   * a highlight back and finding the picture gone would be a worse kind of
   * undo than none at all.
   */
  private deletedImage: string | null = null;
  /** The element the page scrolls in, found again on every refresh. */
  private scroller: HTMLElement | null = null;
  private readonly listeners = new Set<() => void>();
  private readonly painter = new HighlightPainter();
  private marks: Mark[] = [];
  private resolved = new Map<string, ResolvedMark>();
  /** The picture each image highlight is currently sitting on (18). */
  private readonly images = new Map<string, HTMLImageElement>();
  private pending: PendingSelection | null = null;
  private unwatch: (() => void) | undefined;
  private openedAt = 0;
  private theme: Theme = 'system';
  /** Where "next highlight" continues from; -1 means nowhere yet. */
  private cursor = -1;
  // Streaming replies mutate the page constantly, so also refresh at least once a second.
  private readonly scheduleRefresh = debounce(() => this.refresh(), 200, 1000);
  /** True only while a mouse button is down, which a finger never does. */
  private mouseDown = false;
  private readonly captureWhenSettled = debounce(() => {
    if (!this.mouseDown) this.captureSelection();
  }, SELECTION_SETTLE_MS);

  constructor(
    private readonly ctx: ContentScriptContext,
    private readonly adapter: SiteAdapter,
  ) {}

  getState = (): ViewState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async start(): Promise<void> {
    const observer = new MutationObserver(() => this.scheduleRefresh());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    this.ctx.onInvalidated(() => {
      observer.disconnect();
      this.scheduleRefresh.cancel();
      this.captureWhenSettled.cancel();
      this.unwatch?.();
      this.unwatchActive?.();
      this.unwatchSpaces?.();
      this.unwatchPens?.();
      this.painter.dispose();
    });

    // Where highlights are going. Watched on both sides: the id changes when a
    // space is picked here or in another tab, and the space's own contents
    // change whenever anything is filed into it anywhere.
    void loadPalette().then((pens) => this.setState({ pens }));
    this.unwatchPens = watchPalette((pens) => this.setState({ pens }));

    void this.syncActiveSpace();
    this.unwatchActive = watchActiveSpaceId(() => void this.syncActiveSpace());
    this.unwatchSpaces = watchSpaces(() => void this.syncActiveSpace());

    this.ctx.addEventListener(window, 'wxt:locationchange', ({ newUrl }) => {
      void this.openConversation(newUrl);
    });
    // The selection is only final after mouseup has been handled.
    this.ctx.addEventListener(document, 'mouseup', () => this.ctx.setTimeout(this.captureSelection, 0));
    // A finger sends no mouseup worth waiting for. On a phone the selection is
    // dragged about by handles Safari draws itself, and all the page hears is
    // selectionchange, so a selection that has stopped changing counts as a
    // finished one too. A mouse still waits for its button to come up, so
    // nothing opens mid-drag where there is one.
    this.ctx.addEventListener(document, 'selectionchange', this.captureWhenSettled);
    this.ctx.addEventListener(document, 'pointerdown', this.onPointerDown, { capture: true });
    this.ctx.addEventListener(document, 'pointerup', this.onPointerUp, { capture: true });
    this.ctx.addEventListener(document, 'pointercancel', this.onPointerUp, { capture: true });
    this.ctx.addEventListener(document, 'click', this.onClick);
    this.ctx.addEventListener(document, 'keyup', this.onKeyUp);
    // Toolbar and card positions are viewport rects, which go stale when anything scrolls.
    this.ctx.addEventListener(document, 'scroll', this.onViewportChange, { capture: true });
    this.ctx.addEventListener(window, 'resize', this.onViewportChange);
    // The library asks an already-open tab to jump to a highlight.
    browser.runtime.onMessage.addListener((message) => {
      const request = message as RuntimeMessage;
      if (request.type === 'jump-to-mark') void this.jumpWhenReady(request.markId, request.conversationId);
      if (request.type === 'highlight-image') void this.highlightImage(request.src);
      if (request.type === 'highlight-selection') {
        void this.highlightSelection();
        // Answered, not merely received. The right-click menu also fires on
        // pages Kona cannot run in, and there the background keeps the
        // selection itself (16): silence is how it tells the two apart, so a
        // page that *is* handling it has to say so or be captured twice.
        return Promise.resolve({ handled: true });
      }
      return undefined;
    });

    this.theme = await loadTheme();
    watchTheme((theme) => {
      this.theme = theme;
      this.refresh();
    });

    await this.openConversation(new URL(location.href));
    void this.followRequestedJump();
  }

  /**
   * Right-click → Highlight. The selection is still live when the menu fires, so
   * this is the same path as the toolbar, minus the toolbar. It is the way in on
   * sites whose own selection popup sits on top of ours.
   */
  async highlightSelection(): Promise<void> {
    this.captureSelection();
    if (!this.pending) return;
    // The first pen in the case, not a hardcoded yellow: somebody whose first
    // pen is teal has said which pen they reach for (12).
    await this.highlight(this.state.pens[0] ?? 'yellow');
  }

  async highlight(color: PenId, { withNote = false } = {}): Promise<void> {
    const pending = this.pending;
    const conversationId = this.state.conversationId;
    if (!pending || !conversationId || this.adapter.isStreaming(pending.message)) return;

    const quote = describeQuote(pending.index.text, pending.span);
    const now = Date.now();
    const mark: Mark = {
      id: crypto.randomUUID(),
      site: this.adapter.site,
      conversationId,
      conversationTitle: this.adapter.getConversationTitle(),
      url: location.href,
      message: describeMessage(pending.message, pending.index.text),
      quote,
      label: '',
      color,
      order: nextOrder(this.marks),
      snapshot: quote.exact.trim(),
      createdAt: now,
      updatedAt: now,
    };

    window.getSelection()?.removeAllRanges();
    this.clearSelectionDraft();
    this.marks = [...this.marks, mark];
    this.refresh();
    if (withNote) this.openCard(mark.id, true);
    await upsertMark(mark);

    // While a space is active a new highlight goes into it as well as into the
    // library, with nothing to file by hand (DEFINITIONS, Active space).
    if (this.activeSpace) {
      await fileIntoActiveSpace(mark.id, await loadMe());
      await this.syncActiveSpace();
      // 2e and 2g together: the thing that says where it went is the same
      // thing that takes it back out, so marking opens the bar. Only while a
      // space is active: with none set there is nothing to confirm, and a
      // page you are reading stays quiet.
      if (!withNote) this.openCard(mark.id, false);
    }
  }

  /**
   * 2f: picking which space is active is a small control in the panel, not a
   * list of spaces. A picker, not a fifth screen.
   */
  async setActiveSpace(id: string | null): Promise<void> {
    await setActiveSpaceId(id);
    await this.syncActiveSpace();
  }

  /**
   * A passage in the active space, clicked. Clicking it in a space does
   * exactly what clicking it in the library does: it lands you on the exact
   * words (DEFINITIONS, Space). When those words are on this page that is a
   * jump; when they are on one of the other four articles it is the link,
   * which is a text fragment and needs no extension at the other end.
   */
  openMark(mark: Mark): void {
    if (this.marks.some((each) => each.id === mark.id)) {
      this.jump(mark.id);
      return;
    }
    window.open(linkToMark(mark), '_blank', 'noopener');
  }

  /** 2g: keep this one in the library only, after all. */
  async keepOutOfSpace(markId: string): Promise<void> {
    await keepOutOfActiveSpace(markId);
    await this.syncActiveSpace();
  }

  /**
   * Reload where highlights are going and what is already there.
   *
   * Every mark in the library is read, not just this page's: a space gathers
   * across pages, which is the whole reason it exists. That only happens while
   * a space is active, so a page with none set pays nothing for it.
   */
  private async syncActiveSpace(): Promise<void> {
    const space = await loadActiveSpace();
    this.activeSpace = space;
    if (!space) {
      this.setState({ activeSpace: null });
      return;
    }
    this.allMarks = await loadAllMarks();
    const byId = new Map(this.allMarks.map((mark) => [mark.id, mark]));
    this.setState({
      activeSpace: {
        id: space.id,
        name: space.name,
        people: space.people?.length ?? 0,
        // A space can point at a highlight that has since been deleted; the
        // library is the only place a highlight actually lives.
        items: space.markIds
          .map((id) => byId.get(id))
          .filter((mark): mark is Mark => mark !== undefined),
      },
    });
  }

  async updateMark(id: string, patch: Partial<Pick<Mark, 'color' | 'note' | 'tags'>>): Promise<void> {
    const mark = this.marks.find((m) => m.id === id);
    if (!mark) return;
    const updated: Mark = { ...mark, ...patch, updatedAt: Date.now() };
    this.marks = this.marks.map((m) => (m.id === id ? updated : m));
    this.refresh();
    await upsertMark(updated);
  }

  async saveNote(id: string, note: string): Promise<void> {
    if (this.state.card?.markId === id) this.closeCard();
    const trimmed = note.trim();
    const mark = this.marks.find((m) => m.id === id);
    if (!mark || (mark.note ?? '') === trimmed) return;
    await this.updateMark(id, { note: trimmed || undefined });
  }

  /** Moves a highlight to a new position in the user's list. */
  async move(id: string, toIndex: number): Promise<void> {
    const conversationId = this.state.conversationId;
    const ordered = sortByOrder(this.marks);
    const from = ordered.findIndex((m) => m.id === id);
    if (!conversationId || from === -1 || from === toIndex) return;

    this.marks = moveItem(ordered, from, toIndex).map((m, order) =>
      m.order === order ? m : { ...m, order },
    );
    this.refresh();
    await saveOrder(this.adapter.site, conversationId, this.marks.map((m) => m.id));
  }

  async remove(id: string): Promise<void> {
    const conversationId = this.state.conversationId;
    const mark = this.marks.find((m) => m.id === id);
    if (!conversationId || !mark) return;
    if (this.state.card?.markId === id) this.closeCard();
    this.painter.clearFlash();

    this.deleted = mark;
    if (mark.image?.kept) {
      this.deletedImage = await storage.getItem<string>(imageKey(id));
      await storage.removeItem(imageKey(id));
    }
    this.marks = this.marks.filter((m) => m.id !== id);
    this.refresh();
    this.setState({ undo: { label: mark.label || mark.snapshot } });
    this.ctx.setTimeout(() => {
      if (this.deleted?.id === id) {
        this.deleted = null;
        this.deletedImage = null;
        this.setState({ undo: null });
      }
    }, UNDO_MS);

    await removeMark(this.adapter.site, conversationId, id);
  }

  /** Brings back the highlight deleted a moment ago. */
  undoDelete(): void {
    const mark = this.deleted;
    if (!mark) return;
    const picture = this.deletedImage;
    this.deleted = null;
    this.deletedImage = null;
    this.marks = [...this.marks, mark];
    this.setState({ undo: null });
    this.refresh();
    void upsertMark(mark);
    if (picture) void storage.setItem(imageKey(mark.id), picture);
  }

  jump(id: string): void {
    const index = this.state.items.findIndex((item) => item.mark.id === id);
    if (index !== -1) this.cursor = index;
    void this.jumpToMark(id);
  }

  /** Moves to the next (+1) or previous (-1) highlight in the user's order. */
  step(delta: number): void {
    const { items } = this.state;
    if (items.length === 0) return;
    const from = this.cursor === -1 ? (delta > 0 ? -1 : items.length) : this.cursor;
    const next = clamp(from + delta, 0, items.length - 1);
    this.cursor = next;
    this.notify(`${next + 1} of ${items.length}`);
    void this.jumpToMark(items[next]!.mark.id);
  }

  private async jumpToMark(id: string): Promise<void> {
    this.refresh();
    const hit = this.resolved.get(id) ?? (await this.searchOlderMessages(id));
    if (!hit) {
      this.notify("Couldn't find this one on the page. The message may have been edited or deleted.");
      return;
    }
    const target = hit.range.startContainer.parentElement ?? hit.message.el;
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
    this.painter.flashRange(hit.range, JUMP_FLASH_MS);
    if (smooth) {
      // Smooth scrolling can stall (e.g. while the page isn't painting); make sure we still arrive.
      this.ctx.setTimeout(() => {
        if (!isInViewport(target)) target.scrollIntoView({ block: 'center' });
      }, JUMP_SETTLE_MS);
    }
  }

  /**
   * Long chats only keep recent messages on the page. Scroll up a screen at a time,
   * giving the site a chance to load older ones, until the highlight turns up.
   */
  private async searchOlderMessages(id: string): Promise<ResolvedMark | undefined> {
    const scroller = this.findScroller();
    if (!scroller) return undefined;

    const startedAt = scroller.scrollTop;
    this.notify(`Looking further up the ${this.state.noun}…`);
    for (let step = 0; step < LOAD_OLDER_STEPS && !this.ctx.isInvalid; step++) {
      const messagesBefore = this.adapter.getMessages().length;
      const topBefore = scroller.scrollTop;
      scroller.scrollTop = Math.max(0, topBefore - scroller.clientHeight);
      await delay(this.ctx, LOAD_OLDER_WAIT_MS);

      this.refresh();
      const hit = this.resolved.get(id);
      if (hit) {
        this.setState({ notice: null });
        return hit;
      }
      // Nothing moved and nothing loaded: we're as far back as this chat goes.
      if (this.adapter.getMessages().length === messagesBefore && scroller.scrollTop === topBefore) break;
    }

    scroller.scrollTop = startedAt;
    return undefined;
  }

  /** The element the chat actually scrolls in, which is rarely the window. */
  private findScroller(): HTMLElement | null {
    const first = this.adapter.getMessages()[0]?.el;
    for (let el = first?.parentElement ?? null; el; el = el.parentElement) {
      const overflow = getComputedStyle(el).overflowY;
      if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight + 10) {
        return el as HTMLElement;
      }
    }
    const page = document.scrollingElement as HTMLElement | null;
    return page && page.scrollHeight > page.clientHeight + 10 ? page : null;
  }

  /** Lights up a highlight in the chat while its panel entry is hovered; null turns it off. */
  preview(id: string | null): void {
    const range = id ? this.resolved.get(id)?.range : undefined;
    if (range) this.painter.flashRange(range);
    else this.painter.clearFlash();
  }

  /** Opens a highlight's note from the panel, scrolling to the highlight when it's on the page. */
  editNote(id: string): void {
    this.refresh();
    if (this.resolved.has(id)) this.jump(id);
    this.openCard(id, true);
  }

  /** Opens the library page listing highlights from every site. */
  openLibrary(site?: string): void {
    void browser.runtime
      .sendMessage({ type: 'open-library', site } satisfies RuntimeMessage)
      .catch(() => undefined);
  }

  /** Opens one space, for the panel's "added to…" line. */
  openSpace(spaceId: string): void {
    void browser.runtime
      .sendMessage({ type: 'open-space', spaceId } satisfies RuntimeMessage)
      .catch(() => {
        // The page may be closing; nothing to do.
      });
  }

  /** The same library, already narrowed to the site being read. */
  openSiteLibrary(): void {
    this.openLibrary(siteLabel({ site: this.adapter.site, url: location.href }));
  }

  openCard(markId: string, focusNote = false): void {
    this.setState({ card: { markId, position: this.cardPosition(markId), focusNote } });
  }

  closeCard(): void {
    if (this.state.card) this.setState({ card: null });
  }

  /** Jumps to a highlight opened from the library, or from a link ending in #bookmark=<id>. */
  private async followRequestedJump(): Promise<void> {
    const fromLink = location.hash.startsWith(MARK_HASH)
      ? decodeURIComponent(location.hash.slice(MARK_HASH.length))
      : null;
    if (fromLink && this.state.conversationId) {
      history.replaceState(null, '', location.pathname + location.search);
      await this.jumpWhenReady(fromLink, this.state.conversationId);
      return;
    }
    const pending = (await browser.runtime
      .sendMessage({ type: 'take-pending-jump' } satisfies RuntimeMessage)
      .catch(() => null)) as PendingJump | null;
    if (pending) await this.jumpWhenReady(pending.markId, pending.conversationId);
  }

  /** Waits for the chat and the highlight to load, then jumps to it. */
  private async jumpWhenReady(markId: string, conversationId: string): Promise<void> {
    const deadline = Date.now() + JUMP_WAIT_MS;
    while (Date.now() < deadline && !this.ctx.isInvalid) {
      // Wait for the right chat and for its highlights to load, then let jumping do the rest.
      if (this.state.conversationId === conversationId && this.marks.some((m) => m.id === markId)) {
        this.jump(markId);
        return;
      }
      await delay(this.ctx, JUMP_POLL_MS);
    }
  }

  private async openConversation(url: URL): Promise<void> {
    const conversationId = this.adapter.getConversationId(url);
    if (conversationId === this.state.conversationId) return;

    this.unwatch?.();
    this.unwatch = undefined;
    this.marks = [];
    this.pending = null;
    this.cursor = -1;
    this.openedAt = Date.now();
    this.painter.clearFlash();
    this.setState({
      conversationId,
      items: [],
      selection: null,
      card: null,
        health: 'ok',
    });
    if (!conversationId) {
      this.refresh();
      return;
    }

    this.unwatch = watchMarks(this.adapter.site, conversationId, (marks) => {
      this.marks = marks;
      this.refresh();
      void this.countElsewhere(conversationId);
    });
    const marks = await loadMarks(this.adapter.site, conversationId);
    if (this.state.conversationId !== conversationId) return;
    this.marks = marks;
    this.refresh();
    void this.countElsewhere(conversationId);
    // Re-check once the page has had time to render, so a broken layout gets reported.
    this.ctx.setTimeout(() => this.refresh(), BROKEN_AFTER_MS + 100);
  }

  /**
   * How much is kept on this site outside the conversation being looked at.
   * Only worth knowing when there is nothing here, so it is not counted
   * otherwise; it reads every highlight there is.
   */
  /**
   * Writing down which highlights this page can no longer land on (13).
   *
   * The in-page notice is live and needs nothing stored. The library's half
   * does: *marks it in the library, so you can see what has rotted rather
   * than meeting it one at a time*, and the library never visits the page.
   *
   * Everything here is about not being wrong. A highlight goes unresolved for
   * plenty of innocent reasons, and writing "this is gone" on one of those is
   * the main ability degrading quietly, which is worse than not saying it at
   * all. So this is deliberately narrow:
   *
   * - **Ordinary web pages only.** The chat sites render their older messages
   *   when you scroll to them, so a passage merely further up the thread looks
   *   exactly like one that has been edited away.
   * - **Only once the page has settled**, which is the same five seconds the
   *   broken-layout notice waits, and only when the adapter found content at
   *   all. A page still loading has not failed to hold anything.
   * - **It clears itself.** A page that was rewritten can be rewritten back,
   *   and a highlight found again is not rotted. So every pass that finds one
   *   takes the mark off.
   */
  private async recordLandings(messageCount: number): Promise<void> {
    if (this.adapter.site !== 'web') return;
    if (messageCount === 0) return;
    if (Date.now() - this.openedAt <= BROKEN_AFTER_MS) return;

    const changed: Mark[] = [];
    for (const mark of this.marks) {
      const found = this.resolved.has(mark.id) || this.images.has(mark.id);
      if (!found && mark.landing !== 'lost') changed.push({ ...mark, landing: 'lost' });
      if (found && mark.landing === 'lost') {
        const { landing: _gone, ...rest } = mark;
        changed.push(rest as Mark);
      }
    }
    if (changed.length === 0) return;

    // `updatedAt` is left alone on purpose. Nobody edited anything, and a
    // library sorted by when you last touched something should not reshuffle
    // because a page you were reading had been rewritten.
    const byId = new Map(changed.map((mark) => [mark.id, mark]));
    this.marks = this.marks.map((mark) => byId.get(mark.id) ?? mark);
    for (const mark of changed) await upsertMark(mark);
  }

  /**
   * Keeping a picture (18).
   *
   * Right-click, keep. The menu hands over the picture's address and this
   * finds the element it belongs to, which is what makes the rest possible:
   * the bytes are already decoded in the page, the words near it are readable,
   * and where it sits is known.
   *
   * Everything about it is a highlight. It goes in the library, it takes a
   * pen, it can carry a note, it files into the active space. What differs is
   * underneath: no quote selector, an outline instead of paint, and a weaker
   * way back.
   */
  async highlightImage(src: string): Promise<void> {
    const conversationId = this.state.conversationId;
    if (!conversationId) return;
    const pictures = [...document.images];
    const found =
      pictures.find((img) => img.currentSrc === src || img.src === src) ??
      pictures.find((img) => img.currentSrc.startsWith(src) || src.startsWith(img.currentSrc));
    if (!found) return;

    const now = Date.now();
    const id = crypto.randomUUID();
    const kept = await keepACopy(found, id);
    const words = wordsFor({
      alt: found.alt,
      caption: found.closest('figure')?.querySelector('figcaption')?.textContent,
      title: found.title,
      nearby: nearestWords(found),
    });

    const mark: Mark = {
      id,
      site: this.adapter.site,
      conversationId,
      conversationTitle: this.adapter.getConversationTitle(),
      url: location.href,
      label: '',
      color: this.state.pens[0] ?? 'yellow',
      order: nextOrder(this.marks),
      snapshot: words || UNDESCRIBED,
      image: {
        src: found.currentSrc || found.src,
        index: pictures.indexOf(found),
        width: found.naturalWidth || found.width,
        height: found.naturalHeight || found.height,
        kept,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.marks = [...this.marks, mark];
    this.refresh();
    await upsertMark(mark);
    const space = await fileIntoActiveSpace(mark.id, await loadMe());
    if (space) this.notify(`Kept in ${space.name}`);
    else if (!kept) {
      // Said once, where it happened. The highlight is real either way, and
      // somebody who keeps a chart expects the chart (18).
      this.notify('Kept. That site would not let Kona copy the picture itself.');
    }
  }

  /**
   * Where each kept picture is on the page right now.
   *
   * By source first and by its place among the page's pictures second, which
   * is the weaker half of the anchor and the reason a picture is likelier than
   * a passage to end up in 13's state. Nothing is written into the page: the
   * outline is drawn in Kona's own layer, from these rectangles.
   */
  private resolveImages(): Outline[] {
    this.images.clear();
    const pictures = [...document.images];
    const outlines: Outline[] = [];
    for (const mark of this.marks) {
      const anchor = mark.image;
      if (!anchor) continue;
      const found =
        pictures.find((img) => img.currentSrc === anchor.src || img.src === anchor.src) ??
        pictures[anchor.index];
      if (!found || !found.isConnected) continue;
      this.images.set(mark.id, found);
      const box = found.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      outlines.push({
        markId: mark.id,
        color: mark.color,
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
      });
    }
    return outlines;
  }

  private async countElsewhere(conversationId: string): Promise<void> {
    if (this.marks.length > 0) {
      if (this.state.elsewhere !== 0) this.setState({ elsewhere: 0 });
      return;
    }
    const all = await loadAllMarks();
    // The conversation may have changed while that was being read.
    if (this.state.conversationId !== conversationId) return;
    const self = { site: this.adapter.site, url: location.href };
    const here = (mark: Mark) =>
      sameSite(mark, self) && mark.conversationId !== conversationId;
    this.setState({
      elsewhere: all.filter(here).length,
      noun: this.adapter.conversationNoun ?? 'chat',
    });
  }

  private refresh(): void {
    const { conversationId, card, enabled } = this.state;
    if (!enabled) {
      // Switched off here: stop painting and show nothing, but keep everything saved.
      this.resolved.clear();
      this.painter.paint([]);
      this.painter.clearFlash();
      this.setState({ items: [], card: null, selection: null });
      return;
    }
    const messages = conversationId ? this.adapter.getMessages() : [];
    const { resolved } = resolveMarks(this.marks, messages, (m) => this.adapter.getContentRoot(m));
    this.resolved = new Map(resolved.map((r) => [r.mark.id, r]));
    this.painter.paint(
      resolved
        .filter((r) => r.mark.quote)
        .map((r) => ({ color: r.mark.color, range: r.range, noted: !!r.mark.note })),
    );

    // The ink on a mark depends on the page under it, because a mark is
    // transparent and the words end up sitting on both. Told here rather than
    // read by the painter, so there is one answer to how dark the page is.
    const pageDark = this.theme === 'system' ? isDarkPage() : this.theme === 'dark';
    this.painter.setPageDark(pageDark);

    const brokenLayout =
      !!conversationId && messages.length === 0 && Date.now() - this.openedAt > BROKEN_AFTER_MS;
    void this.recordLandings(messages.length);
    const cardStillValid = card && this.marks.some((m) => m.id === card.markId);
    this.scroller = this.findScroller();
    const outlines = this.resolveImages();
    this.setState({
      outlines,
      items: sortByOrder(this.marks).map((mark) => ({
        mark,
        found: this.resolved.has(mark.id) || this.images.has(mark.id),
      })),
      card: cardStillValid ? { ...card, position: this.cardPosition(card.markId) } : null,
      health: brokenLayout ? 'no-messages' : 'ok',
      // "System" means matching the page we're sitting on, which is what looks right in context.
      dark: pageDark,
    });
  }

  private cardPosition(markId: string): NoteCardState['position'] {
    const outline = this.state.outlines.find((each) => each.markId === markId);
    if (outline) {
      const below = outline.top + outline.height + CARD_GAP;
      return below + CARD_HEIGHT <= innerHeight
        ? { top: below, left: outline.left }
        : { top: Math.max(CARD_GAP, outline.top - CARD_GAP - CARD_HEIGHT), left: outline.left };
    }
    const range = this.resolved.get(markId)?.range;
    if (!range) return null;
    const rects = range.getClientRects();
    const first = rects[0];
    const last = rects[rects.length - 1];
    if (!first || !last) return null;
    const fitsBelow = last.bottom + CARD_GAP + CARD_HEIGHT <= innerHeight;
    const top = fitsBelow ? last.bottom + CARD_GAP : first.top - CARD_GAP - CARD_HEIGHT;
    return {
      top: clamp(top, CARD_GAP, innerHeight - CARD_HEIGHT - CARD_GAP),
      left: clamp(last.left, CARD_GAP, innerWidth - CARD_WIDTH - CARD_GAP),
    };
  }

  private captureSelection = (): void => {
    const selection = window.getSelection();
    if (!this.state.enabled) return;
    if (!this.state.conversationId || !selection || selection.isCollapsed || !selection.rangeCount) {
      this.clearSelectionDraft();
      return;
    }
    const range = selection.getRangeAt(0);
    const messages = this.adapter.getMessages();
    const containing = (node: Node) =>
      messages.find((m) => this.adapter.getContentRoot(m).contains(node));
    const message = containing(range.startContainer) ?? containing(range.endContainer);
    if (!message) {
      this.clearSelectionDraft();
      return;
    }

    const index = buildTextIndex(this.adapter.getContentRoot(message));
    const span = spanFromRange(index, range);
    if (!span || !index.text.slice(span.start, span.end).trim()) {
      this.clearSelectionDraft();
      return;
    }

    const rect = range.getBoundingClientRect();
    this.pending = { message, index, span };
    this.setState({
      selection: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left + rect.width / 2,
        streaming: this.adapter.isStreaming(message),
      },
    });
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse') this.mouseDown = true;
  };

  private onPointerUp = (): void => {
    this.mouseDown = false;
  };

  private clearSelectionDraft = (): void => {
    if (!this.pending && !this.state.selection) return;
    this.pending = null;
    this.setState({ selection: null });
  };

  /** A plain click on highlighted text opens that highlight's note. */
  private onClick = (event: MouseEvent): void => {
    if (!this.state.enabled || event.button !== 0 || !window.getSelection()?.isCollapsed) return;
    const ignored = event
      .composedPath()
      .some((node) => node instanceof Element && (node.localName === UI_TAG || node.matches(INTERACTIVE)));
    if (ignored) return;
    const markId = this.markAt(event.clientX, event.clientY);
    if (markId) this.openCard(markId);
  };

  private markAt(x: number, y: number): string | undefined {
    // Pictures first: an outline sits over an image, and an image is usually
    // inside something that also holds text.
    for (const outline of this.state.outlines) {
      if (
        x >= outline.left &&
        x <= outline.left + outline.width &&
        y >= outline.top &&
        y <= outline.top + outline.height
      ) {
        return outline.markId;
      }
    }
    for (const { mark, range } of this.resolved.values()) {
      if (!mark.quote) continue;
      for (const rect of range.getClientRects()) {
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return mark.id;
      }
    }
    return undefined;
  }

  private onKeyUp = (event: KeyboardEvent): void => {
    if (!this.state.enabled) return;
    if (event.altKey && event.shiftKey && (event.code === 'KeyH' || event.code === 'KeyN')) {
      void this.highlight('yellow', { withNote: event.code === 'KeyN' });
    } else if (event.altKey && event.shiftKey && (event.code === 'ArrowDown' || event.code === 'ArrowUp')) {
      this.step(event.code === 'ArrowDown' ? 1 : -1);
    } else if (event.shiftKey || event.key.startsWith('Arrow')) {
      this.captureSelection();
    }
  };

  // Scroll events already arrive at most once per frame, so updating right away is cheap.
  private onViewportChange = (): void => {
    this.clearSelectionDraft();
    const card = this.state.card;
    this.setState({
      card: card?.position ? { ...card, position: this.cardPosition(card.markId) } : card,
    });
  };

  private notify(notice: string): void {
    this.setState({ notice });
    this.ctx.setTimeout(() => {
      if (this.state.notice === notice) this.setState({ notice: null });
    }, NOTICE_MS);
  }

  private setState(patch: Partial<ViewState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
}

function delay(ctx: ContentScriptContext, ms: number): Promise<void> {
  return new Promise((resolve) => ctx.setTimeout(() => resolve(), ms));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function isInViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < innerHeight;
}

function isDarkPage(): boolean {
  for (const el of [document.body, document.documentElement]) {
    const [r, g, b, alpha = 1] = (getComputedStyle(el).backgroundColor.match(/[\d.]+/g) ?? []).map(Number);
    if (r === undefined || g === undefined || b === undefined || alpha === 0) continue;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
  }
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Keeping the picture itself, not a link to it (18).
 *
 * Showing it later by its original address would fetch it from the site it
 * came from every time the library was opened, which tells that host what you
 * kept, and decision 6 forbids a request made on account of a page you read.
 * So the bytes are copied here, scaled down, and stored on the device.
 *
 * Two routes, and the order matters. The picture is already decoded in the
 * page, so drawing it to a canvas costs nothing and asks nobody. That fails
 * for a picture served from another host without CORS headers, because the
 * canvas is then tainted and refuses to give its bytes up: a browser rule, not
 * a Kona one. The second try is an ordinary fetch, which many image hosts do
 * allow.
 *
 * **And where both fail, the highlight is kept anyway, without the picture.**
 * That is the honest answer rather than a broken image or a link that phones
 * home: what Kona has then is the words near it, which is what makes it
 * findable, and it says so once rather than pretending.
 */
async function keepACopy(img: HTMLImageElement, markId: string): Promise<boolean> {
  const bytes = (await fromCanvas(img)) ?? (await fromFetch(img.currentSrc || img.src));
  if (!bytes) return false;
  try {
    await storage.setItem(imageKey(markId), bytes);
    return true;
  } catch {
    // Out of room on the device. The highlight still exists; the picture does
    // not, and it says so like any other picture it could not keep.
    return false;
  }
}

/** The quick way: it is already decoded on the page, so nothing is requested. */
async function fromCanvas(img: HTMLImageElement): Promise<string | null> {
  try {
    const natural = { width: img.naturalWidth, height: img.naturalHeight };
    if (!natural.width || !natural.height) return null;
    const size = scaleTo(natural.width, natural.height);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(img, 0, 0, size.width, size.height);
    // Throws on a tainted canvas, which is the cross-origin case.
    return canvas.toDataURL(KEPT_AS, KEPT_QUALITY);
  } catch {
    return null;
  }
}

/** The second try, for a picture the canvas would not give up. */
async function fromFetch(src: string): Promise<string | null> {
  try {
    const response = await fetch(src, { credentials: 'omit' });
    if (!response.ok) return null;
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const size = scaleTo(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close();
    return canvas.toDataURL(KEPT_AS, KEPT_QUALITY);
  } catch {
    return null;
  }
}

/**
 * The words nearest a picture, when it has no caption and no alt text.
 *
 * Walks out from the picture rather than taking the whole page: the paragraph
 * it sits in, or its figure, or the block above it. A page's worth of text
 * attached to one chart would make that chart match everything.
 */
function nearestWords(img: HTMLImageElement): string {
  let at: Element | null = img.parentElement;
  for (let up = 0; up < 4 && at; up += 1) {
    const text = at.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (text.length > 2) return text.slice(0, 300);
    at = at.parentElement;
  }
  const before = img.previousElementSibling ?? img.parentElement?.previousElementSibling;
  return (before?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
}
