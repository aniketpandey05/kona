import { PEN_COLORS, PEN_MARKS } from '../design/tokens';
import type { HighlightColor, PenId } from './types';

export type { PenId };

/**
 * Your highlighting pens.
 *
 * **The governing image, and it settles most of decision 12 on its own: a
 * palette is a set of highlighting pens.** Not a theme, not a colour scheme.
 * Four to begin with, and a palette is where you make your own.
 *
 * Four rules follow from the image, and each one is a rule here:
 *
 * 1. **One palette, which you add to.** Not four palettes.
 * 2. **A colour's meaning is yours.** Kona never defines it and lets you
 *    filter by it. That is the usefulness without a taxonomy.
 * 3. **Named by hue, derived from the value.** Never named by you: a
 *    highlighter has a colour, not a label. Deterministic, or two devices name
 *    one colour differently and sync has a disagreement to carry.
 * 4. **A highlight keeps the colour it was made with.** Swapping a pen in the
 *    case does not change the marks already on the paper. So editing the
 *    palette repaints nothing, the colours in use can outnumber the pens, and
 *    filtering by colour works on what the library contains rather than on the
 *    palette.
 *
 * And an opacity slider with **no ceiling**. A solid pen hides the text under
 * it, which was my objection and was weaker than it sounded: rule 4 means a
 * bad pick affects nothing already marked, and the preview shows it before it
 * is made. It is the person's own pen.
 */

/**
 * `PenId`, which lives in `types.ts` with the rest of what a highlight stores,
 * is either one of the four names Kona started with or a colour of your own as
 * `#rrggbb@NN`, where NN is the opacity as a percentage. A value rather than a
 * reference to a palette slot, because of rule 4: the mark has to keep its
 * colour when the pen is gone.
 */

export interface Pen {
  id: PenId;
  /** The pen at full strength, for a dot in Kona's own rooms. */
  ink: string;
  /** What it paints over somebody else's text, transparent so the words show. */
  mark: string;
  /** Derived from the hue, for a list and for a screen reader. */
  name: string;
}

/**
 * The four Kona starts with. Their ids are names, so nothing already saved
 * moves, and their values come from the token file rather than from here.
 *
 * That last part matters more than it looks. The boards draw the dot and the
 * mark as two different values: yellow's dot is #eab308 and its mark is
 * rgba(250, 204, 21, 0.45), a lighter yellow, because a dot sits on a plain
 * background and a mark sits under somebody's text. Deriving one from the
 * other here looked tidy and quietly repainted every yellow highlight ever
 * made. `tests/pens.test.ts` holds that to the tokens now.
 */
export const DEFAULT_PENS: PenId[] = ['yellow', 'green', 'blue', 'pink'];

/**
 * Hue names, in the order a colour wheel passes through them.
 *
 * Deterministic on purpose (rule 3): the same value names the same pen on
 * every device, so there is never a disagreement for sync to carry. The list
 * is deliberately ordinary English rather than paint-catalogue names, because
 * it is read aloud by a screen reader as often as it is read on screen.
 */
const HUES: Array<[number, string]> = [
  [15, 'Red'],
  [40, 'Orange'],
  [52, 'Amber'],
  [66, 'Yellow'],
  [80, 'Lime'],
  [150, 'Green'],
  [175, 'Teal'],
  [195, 'Cyan'],
  [235, 'Blue'],
  [255, 'Indigo'],
  [275, 'Violet'],
  [305, 'Purple'],
  [340, 'Pink'],
  [360, 'Red'],
];

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

/** Hue in degrees, saturation and lightness in 0..1. */
export function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/**
 * A colour from the saturation-and-lightness square, where x is how much of
 * the hue there is and y is how dark it is.
 *
 * The square is drawn as white-to-hue with black laid over it, which is an HSV
 * square, and the rest of this file speaks HSL. So the two meet here rather
 * than in the screen: colour maths belongs with the colour, and a screen that
 * does its own conversion is a second place for it to be wrong.
 */
export function hsvToHex(h: number, s: number, v: number): string {
  const l = v * (1 - s / 2);
  const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
  return hslToHex(h, sl, l);
}

/**
 * What to call a colour.
 *
 * Grey is its own answer rather than a hue, because a colour with no
 * saturation has no hue to name and "Red" for something grey is worse than
 * saying grey.
 */
export function nameOf(hex: string): string {
  const [h, s, l] = hexToHsl(hex);
  if (s < 0.12) return l > 0.75 ? 'Pale grey' : l < 0.25 ? 'Charcoal' : 'Grey';
  const hue = HUES.find(([limit]) => h < limit)?.[1] ?? 'Red';
  // Measured rather than guessed: #fde68a sits at 0.77 and reads as pale,
  // #78350f at 0.26 and reads as deep, so the thresholds sit outside both.
  if (l > 0.75) return `Pale ${hue.toLowerCase()}`;
  if (l < 0.3) return `Deep ${hue.toLowerCase()}`;
  return hue;
}

/** `#14b8a6@45` is that teal at 45% opacity. */
export function penIdFor(hex: string, opacity: number): PenId {
  return `${hex.toLowerCase()}@${Math.round(opacity * 100)}`;
}

export function isDefaultPen(id: PenId): id is HighlightColor {
  return id in PEN_COLORS;
}

/**
 * Everything a pen is, worked out from what a highlight stored.
 *
 * Unreadable ids fall back to yellow rather than throwing: a highlight whose
 * colour cannot be parsed is still a passage somebody kept, and losing it over
 * a colour would be the wrong trade entirely.
 */
export function penOf(id: PenId): Pen {
  if (isDefaultPen(id)) {
    // Named by the name it shipped with rather than by its hue: Kona's yellow
    // measures as amber, and calling it that would rename a pen that has been
    // called yellow since the first board. Rule 3 governs colours you mix.
    return {
      id,
      ink: PEN_COLORS[id],
      mark: PEN_MARKS[id],
      name: `${id[0]!.toUpperCase()}${id.slice(1)}`,
    };
  }
  const match = /^(#[0-9a-f]{6})@(\d{1,3})$/i.exec(id);
  if (!match) return penOf('yellow');
  const hex = match[1]!.toLowerCase();
  const alpha = Math.min(100, Number(match[2])) / 100;
  const [r, g, b] = hexToRgb(hex);
  return { id, ink: hex, mark: `rgba(${r}, ${g}, ${b}, ${alpha})`, name: nameOf(hex) };
}

/**
 * The colours actually marked with, and how many times, commonest first.
 *
 * Rule 4's consequence: filtering by colour works on this rather than on the
 * palette, because a pen you took out of the case is still in everything you
 * marked with it.
 */
export function pensInUse(colors: readonly PenId[]): Array<{ pen: Pen; count: number }> {
  const counts = new Map<PenId, number>();
  for (const id of colors) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, count]) => ({ pen: penOf(id), count }))
    .sort((a, b) => b.count - a.count);
}

/** Colours in the library that are not pens any more, which stay filterable. */
export function outlivedThePalette(
  palette: readonly PenId[],
  inUse: readonly { pen: Pen; count: number }[],
): Array<{ pen: Pen; count: number }> {
  const kept = new Set(palette);
  return inUse.filter((each) => !kept.has(each.pen.id));
}
