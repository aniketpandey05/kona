/**
 * Highlighting a picture (18).
 *
 * **Yes, and it is a highlight, not a new noun.** A chart can be the whole
 * point of a page, and screenshotting it into a folder is what people do
 * instead. But almost everything about it differs under the surface, which is
 * why this file exists rather than a flag on a passage:
 *
 * - **It cannot be painted the usual way.** The CSS Custom Highlight API takes
 *   text ranges and an image is not text, so it is outlined in Kona's own
 *   layer, over the image, never in the page's DOM.
 * - **Its anchor is weaker, and that is the honest cost.** Text has a quote
 *   selector that survives rewriting. A picture has its source, its place
 *   among the page's images, and the words nearest it. Good enough most of the
 *   time and worse than a passage, so a picture is likelier than a passage to
 *   end up in 13's state: kept, searchable, no longer landable.
 * - **It carries text anyway, or search loses it.** The caption, the alt text
 *   or the paragraph it sits in becomes the highlight's searchable content. A
 *   picture with no words anywhere near it is the one case that is genuinely
 *   hard to find again, and Kona says so rather than pretending.
 * - **Kona keeps a copy, not a link.** Showing a picture in the library by its
 *   original address would fetch it from the site it came from every time the
 *   library was opened, which tells that host you kept something of theirs,
 *   and would do it for Free users too. Decision 6 forbids exactly that. So
 *   the bytes are stored. It has a second benefit worth naming: **the picture
 *   survives the page.**
 */

/** What a highlight remembers about a picture. The bytes live under their own key. */
export interface ImageAnchor {
  /** Where it was, which is how it is found again on a page that still has it. */
  src: string;
  /** Its place among the page's pictures: the weaker half of the anchor. */
  index: number;
  /** The size it was drawn at, so a kept copy can be shown at the right shape. */
  width: number;
  height: number;
  /** Whether Kona got a copy, or the site would not let it have one. */
  kept: boolean;
}

/**
 * The ceiling on a kept picture (18, *two things to bound*).
 *
 * Nobody needs a twenty-megabyte hero image preserved, and images are the one
 * thing in Kona that could make sync expensive: a passage is about a kilobyte,
 * a kept chart is hundreds. So the long edge is capped and the rest follows.
 * Large enough that a chart is still readable, which is the whole reason
 * somebody kept one.
 */
export const LONGEST_EDGE = 1400;

/** What to keep it as. JPEG for photographs would lose a chart's thin lines. */
export const KEPT_AS = 'image/webp';
export const KEPT_QUALITY = 0.86;

/** The size a kept copy is written at, never larger than it was drawn. */
export function scaleTo(
  width: number,
  height: number,
  longest = LONGEST_EDGE,
): { width: number; height: number } {
  const edge = Math.max(width, height);
  if (edge <= longest || edge === 0) return { width, height };
  const by = longest / edge;
  return { width: Math.round(width * by), height: Math.round(height * by) };
}

/**
 * The words that belong to a picture, best first.
 *
 * Search has nothing else to go on: an image carries no text of its own, so
 * whatever is nearest it *is* its searchable content. The order is by how
 * likely each is to describe the picture rather than the page.
 */
export function wordsFor(parts: {
  alt?: string | null;
  caption?: string | null;
  title?: string | null;
  nearby?: string | null;
}): string {
  const first = [parts.caption, parts.alt, parts.title, parts.nearby]
    .map((each) => each?.replace(/\s+/g, ' ').trim())
    .find((each) => each && each.length > 1);
  return first ?? '';
}

/**
 * What to show in a list for a picture with no words anywhere near it.
 *
 * Said rather than left blank, because a row with nothing in it looks like a
 * bug and this is a known limit: a picture nobody captioned is the one case
 * that is genuinely hard to find again.
 */
export const UNDESCRIBED = 'A picture, with nothing written near it';

/** How a kept picture's bytes are filed, one key each so a list read stays small. */
export const imageKey = (markId: string): `local:${string}` => `local:image:${markId}`;
