import { penOf, type PenId } from './pens';
import { MARK_FLASH, MARK_NOTED, PEN_COLORS, PEN_MARKS, markInk } from '../design/tokens';

/**
 * The pens, from the one place they are decided (`src/design/tokens.json`).
 *
 * These two names are what the screens already import, and they are kept so
 * that moving the values out of this file changes nothing else. The product
 * word is *pen*, so they go when the screens are rebuilt on `PEN_MARKS` and
 * `PEN_COLORS` directly.
 */
export const HIGHLIGHT_COLORS = PEN_MARKS;
export const UI_COLORS = PEN_COLORS;

const FLASH = 'kona-flash';
const NOTED = 'kona-noted';
/**
 * `::highlight()` takes a custom ident, and a colour id is `#14b8a6@45`, so
 * everything that is not a letter or a digit becomes a hyphen.
 */
const layerName = (color: PenId) => `kona-${color.replace(/[^a-z0-9]/gi, '-')}`;

export interface PaintEntry {
  color: PenId;
  range: Range;
  /** Highlights with a note get a dotted underline so they stand out. */
  noted: boolean;
}

/**
 * Paints highlights with the CSS Custom Highlight API. Nothing is inserted into
 * the chat's DOM, so the site's re-renders can't break or duplicate highlights.
 */
export class HighlightPainter {
  /**
   * One layer per colour actually on the page, made as they appear.
   *
   * Not one per default pen: a palette is a set of pens you add to (12), so
   * the colours a page carries are whatever its highlights were made with,
   * including ones that are no longer in the case.
   */
  private readonly layers = new Map<PenId, Highlight>();
  private readonly noted = new Highlight();
  private readonly flash = new Highlight();
  private readonly style: HTMLStyleElement;
  /** How dark the page under the marks is, which decides the ink on them. */
  private pageIsDark = false;
  private flashTimer: ReturnType<typeof setTimeout> | undefined;

  static isSupported(): boolean {
    return typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight === 'function';
  }

  constructor(doc: Document = document) {
    this.style = doc.createElement('style');
    this.style.setAttribute('data-kona-ui', '');
    this.writeRules();
    doc.head.append(this.style);

    this.noted.priority = 1;
    CSS.highlights.set(NOTED, this.noted);
    this.flash.priority = 2;
    CSS.highlights.set(FLASH, this.flash);
  }

  /**
   * Tell the painter how dark the page is.
   *
   * A mark is transparent, so the words sit on the mark *and* the page under
   * it. Dark ink over a light page reads at 9.5:1 or better; the same ink over
   * a dark page lands on a dark composite and falls to 1.5:1, which is a
   * highlight that makes the text harder to read than not highlighting it at
   * all. Measured in `tests/painter.test.ts`.
   */
  setPageDark(dark: boolean): void {
    if (dark === this.pageIsDark) return;
    this.pageIsDark = dark;
    this.writeRules();
  }

  private writeRules(): void {
    const colors = [...this.layers.keys()];
    const ink = markInk(this.pageIsDark);
    this.style.textContent = [
      ...colors.map(
        (c) => `::highlight(${layerName(c)}) { background-color: ${penOf(c).mark}; color: ${ink}; }`,
      ),
      // Firefox does not apply text-decoration inside ::highlight(), so a noted
      // highlight simply looks unmarked there. The panel still shows the note.
      `::highlight(${NOTED}) { text-decoration: underline dotted ${MARK_NOTED}; text-decoration-thickness: 2px; }`,
      `::highlight(${FLASH}) { background-color: ${MARK_FLASH}; color: ${ink}; }`,
    ].join('\n');
  }

  paint(entries: PaintEntry[]): void {
    const wanted = new Set(entries.map((each) => each.color));
    let changed = false;

    // A colour nobody on this page is using any more loses its layer, so the
    // registry does not grow for every pen ever seen in a long session.
    for (const id of [...this.layers.keys()]) {
      if (wanted.has(id)) continue;
      CSS.highlights.delete(layerName(id));
      this.layers.delete(id);
      changed = true;
    }
    for (const id of wanted) {
      if (this.layers.has(id)) continue;
      const layer = new Highlight();
      this.layers.set(id, layer);
      CSS.highlights.set(layerName(id), layer);
      changed = true;
    }
    // Painting happens on every scroll and every mutation the page makes, and
    // the rules only depend on which colours are present, so the stylesheet is
    // rewritten when that set moves and not otherwise.
    if (changed) this.writeRules();

    for (const layer of this.layers.values()) layer.clear();
    this.noted.clear();
    for (const { color, range, noted } of entries) {
      this.layers.get(color)?.add(range);
      if (noted) this.noted.add(range);
    }
  }

  /** Emphasizes one highlight, for `durationMs` or until `clearFlash` when no duration is given. */
  flashRange(range: Range, durationMs?: number): void {
    this.flash.clear();
    this.flash.add(range);
    clearTimeout(this.flashTimer);
    if (durationMs !== undefined) this.flashTimer = setTimeout(() => this.flash.clear(), durationMs);
  }

  clearFlash(): void {
    clearTimeout(this.flashTimer);
    this.flash.clear();
  }

  dispose(): void {
    clearTimeout(this.flashTimer);
    for (const color of this.layers.keys()) CSS.highlights.delete(layerName(color));
    CSS.highlights.delete(NOTED);
    CSS.highlights.delete(FLASH);
    this.style.remove();
  }
}
