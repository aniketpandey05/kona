import {
  extensionPresent,
  loadExtensionMarks,
  loadExtensionImage,
  loadExtensionPens,
  loadExtensionSpaces,
  removeExtensionMark,
  removeExtensionSpace,
  saveExtensionMark,
  saveExtensionPens,
  saveExtensionSpace,
  watchExtension,
} from './bridge';
import * as local from './storage';
import type { Space } from '../../src/core/spaces';
import type { Mark, PenId } from '../../src/core/types';

/**
 * Where the library reads from.
 *
 * On Free there is no sync, so the highlights are on the device the extension
 * is installed on and nowhere else. When the extension is here, the bridge is
 * the library's source and the app's own storage is left alone; when it is
 * not: a phone, a machine Kona was never installed on, the library opened
 * signed out, the app reads what it has itself.
 *
 * It is deliberately one or the other and never both at once. Merging two
 * stores on every read is how the same highlight comes to exist twice with
 * different notes, which is the duplicated *meaning* the design log counts as
 * a defect rather than a cost.
 */
export interface LibrarySource {
  /** Where this library is actually reading from, which the account row says. */
  readonly kind: 'extension' | 'device';
  marks(): Promise<Mark[]>;
  spaces(): Promise<Space[]>;
  /**
   * The pens in the case on this device (12, rule 7).
   *
   * It follows the same one-or-the-other rule as the highlights, for a sharper
   * reason: where the extension is installed, the bar in the page marks with
   * *its* palette, so a library editing its own list would offer pens you
   * could not then mark with.
   */
  pens(): Promise<PenId[]>;
  savePens(pens: readonly PenId[]): Promise<void>;
  /**
   * Writing a space back where it was read from.
   *
   * This used to go straight to the device on the grounds that the extension
   * and the web app share one store, which is not true: they are two origins
   * with two stores and the bridge is the only thing between them. A space
   * made in the library while the extension was installed was written where
   * the panel could never see it, so setting it active while you read, which
   * is the whole of 1a, could not work.
   */
  saveSpace(space: Space): Promise<void>;
  removeSpace(id: string): Promise<void>;
  /**
   * A kept picture's bytes (18). Null where there are none: a picture a site
   * would not let Kona copy, or a device that has never had the extension and
   * so has never captured one.
   */
  image(markId: string): Promise<string | null>;
  save(mark: Mark): Promise<void>;
  remove(mark: Mark): Promise<void>;
  watch(onChange: () => void): () => void;
}

const fromExtension: LibrarySource = {
  kind: 'extension',
  marks: loadExtensionMarks,
  spaces: loadExtensionSpaces,
  save: saveExtensionMark,
  pens: loadExtensionPens,
  savePens: saveExtensionPens,
  saveSpace: saveExtensionSpace,
  image: loadExtensionImage,
  removeSpace: removeExtensionSpace,
  // The extension keys highlights by the page they are on, so removing one
  // needs the page as well as the id.
  remove: (mark) => removeExtensionMark(mark.site, mark.conversationId, mark.id),
  watch: watchExtension,
};

const fromDevice: LibrarySource = {
  kind: 'device',
  marks: local.loadAll,
  spaces: local.loadSpaces,
  save: local.save,
  pens: async () => local.loadPens(),
  savePens: async (pens) => local.savePens(pens),
  saveSpace: local.saveSpace,
  image: async () => null,
  removeSpace: local.removeSpace,
  remove: (mark) => local.remove(mark.id),
  watch: local.watch,
};

/**
 * Asked once, when the library opens.
 *
 * Not re-asked on every read: the answer cannot change without the page being
 * reloaded, since installing an extension does not inject its content script
 * into tabs that were already open.
 */
export async function openLibrary(): Promise<LibrarySource> {
  return (await extensionPresent()) ? fromExtension : fromDevice;
}
