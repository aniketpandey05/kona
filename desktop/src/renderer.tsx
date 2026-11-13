import { render } from 'preact';
import { Library } from '../../app/src/Library';
import { diskFolders, onSyncNow } from './folders';
import '../../src/design/fonts.css';
import '../../src/design/tokens.css';
import '../../src/design/passage.css';
import '../../app/src/library.css';
import './desktop.css';

/**
 * The same library the phone app renders, given a real folder to sync.
 *
 * Nothing is forked here. The whole desktop app is this file's two arguments:
 * folders that are paths rather than expiring handles, and the tray's "sync
 * now". Everything else, the library, the search, the spaces, the signing,
 * is the code the extension and the phone already run.
 */
render(
  <Library folders={diskFolders} syncOnDemand={onSyncNow} />,
  document.getElementById('app')!,
);
