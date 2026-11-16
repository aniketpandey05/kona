import { browser } from '#imports';
import { useEffect, useState } from 'preact/hooks';
import type { RuntimeMessage } from '../../core/messages';
import { KonaMark } from '../../ui/KonaMark';

/**
 * The popup, as 3e leaves it: **this site, and whether Kona may read it.**
 *
 * It survives for one reason. `browser.permissions.request` must be called
 * from an extension page on a user gesture: a content script cannot ask, and
 * on a site Kona is not yet allowed on there is no content script at all, so
 * the toolbar button has to open *something*.
 *
 * What went, and why:
 *
 * - **The built-in sites.** Nothing is built in. Preloading the chat sites is
 *   a treadmill (every new chat product is a release), wrong by default for
 *   everybody who does not use them, and claims four origins before you have
 *   highlighted anything.
 * - **The list of sites you have added.** Fine at three and unreadable at
 *   twenty, and twenty is the success case. A list that gets worse the more
 *   you use the product is the wrong list: and the browser already draws it,
 *   authoritatively, on its own extensions screen.
 * - **The soft switch.** `local:disabled-sites` was a second list that could
 *   disagree with the browser's: revoke a site from the browser's screen and
 *   Kona's copy never heard, so the popup went on offering a switch for a site
 *   it could no longer touch. With nothing built in, *allowed* and *on*
 *   collapse into one fact and the second list has no reason to exist.
 */
const send = (message: RuntimeMessage) => browser.runtime.sendMessage(message);
const patternFor = (url: URL) => `${url.protocol}//${url.hostname}/*`;

export function Popup() {
  const [url, setUrl] = useState<URL | null>(null);
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState<string[]>([]);

  const refresh = async () => {
    setAllowed(((await send({ type: 'list-sites' })) as string[]) ?? []);
  };

  useEffect(() => {
    void (async () => {
      const [active] = await browser.tabs.query({ active: true, currentWindow: true });
      try {
        setUrl(active?.url ? new URL(active.url) : null);
      } catch {
        setUrl(null);
      }
      await refresh();
      setReady(true);
    })();
  }, []);

  const hostname = url?.hostname ?? '';
  const supported = url?.protocol === 'https:' || url?.protocol === 'http:';
  const pattern = url && supported ? patternFor(url) : null;
  const on = pattern ? allowed.includes(pattern) : false;

  /**
   * One switch, and it is the permission itself. Turning it on asks the
   * browser; turning it off hands the permission back, so Kona's idea of where
   * it may run and the browser's cannot drift apart.
   */
  const toggle = async () => {
    if (!pattern) return;
    if (on) await browser.permissions.remove({ origins: [pattern] });
    else if (!(await browser.permissions.request({ origins: [pattern] }))) return;
    await send({ type: 'sites-changed' });
    await refresh();
  };

  return (
    <main class="pop">
      <h1>
        <KonaMark size={24} />
        Kona
      </h1>

      {!ready ? (
        <p class="pop-note">Loading…</p>
      ) : !url ? (
        <p class="pop-note">Couldn't tell which page this is. Close this and click the icon again.</p>
      ) : !pattern ? (
        <p class="pop-note">
          Highlighting doesn't work on this page. Chrome blocks extensions on its own pages, the Web
          Store and PDFs.
        </p>
      ) : (
        <label class="pop-toggle">
          <input type="checkbox" checked={on} onChange={() => void toggle()} />
          <span class="pop-switch" aria-hidden="true" />
          <span>
            Highlight on <strong>{hostname}</strong>
          </span>
        </label>
      )}

      {ready && pattern && !on && (
        <p class="pop-hint">Your browser will ask you to allow this site. Nothing happens until you do.</p>
      )}

      {/*
        One way in, and it has to go through the background. A plain <a> here
        navigates the popup itself, which is a 380px window. `open-library`
        opens a real tab, or focuses the one already open, and since 3c the
        library is the web app, at an ordinary address.
      */}
      <section class="pop-open">
        <button
          class="pop-library"
          onClick={() => {
            void send({ type: 'open-library' });
            window.close();
          }}
        >
          Library
        </button>
        <p class="pop-hint pop-open-hint">Your highlights and your spaces, in a tab.</p>
      </section>
    </main>
  );
}
