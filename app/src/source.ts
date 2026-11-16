import {
  extensionPresent,
  loadExtensionMarks,
  loadExtensionSpaces,
  removeExtensionMark,
  saveExtensionMark,
  watchExtension,
} from './bridge';
import * as local from './storage';
import type { Space } from '../../src/core/spaces';
import type { Mark } from '../../src/core/types';

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
  save(mark: Mark): Promise<void>;
  remove(mark: Mark): Promise<void>;
  watch(onChange: () => void): () => void;
}

const fromExtension: LibrarySource = {
  kind: 'extension',
  marks: loadExtensionMarks,
  spaces: loadExtensionSpaces,
  save: saveExtensionMark,
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
