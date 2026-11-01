import { render } from 'preact';
import { App } from '../../app/src/App';
import { diskFolders, onSyncNow } from './folders';
import '../../app/src/app.css';
import './desktop.css';

/**
 * The same library the phone app renders, given a real folder to sync.
 *
 * Nothing is forked here. The whole desktop app is this file's two arguments:
 * folders that are paths rather than expiring handles, and the tray's "sync
 * now". Everything else — the library, the search, the spaces, the signing —
 * is the code the extension and the phone already run.
 */
render(<App folders={diskFolders} syncOnDemand={onSyncNow} />, document.getElementById('app')!);
