import { useEffect, useState } from 'preact/hooks';

/**
 * Getting Kona onto a home screen, which is the thing "get it" ought to mean.
 *
 * Until now the only way in was Chrome's own menu, three taps down under *Add
 * to Home screen*, which nobody finds. Chrome fires `beforeinstallprompt`
 * when a site is installable and lets you hold on to the event and fire it
 * later from a button of your own, which is what this does.
 *
 * Safari fires nothing and has no API: on an iPhone the only route really is
 * Share then *Add to Home Screen*, so there it says so rather than showing a
 * button that cannot work. That is a platform limit and not worth pretending
 * about.
 */

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED = 'kona:install-dismissed';

/** Already on the home screen: there is nothing to offer. */
function installed(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone = (navigator as { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || standalone === true;
}

function isApple(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED) === '1';
  } catch {
    return false;
  }
}

export function Install() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [hidden, setHidden] = useState(() => installed() || dismissed());
  // Safari cannot be asked, so it gets told how instead.
  const [apple] = useState(() => isApple() && !installed());

  useEffect(() => {
    const offer = (incoming: Event) => {
      // Holding on to it is the whole trick: left alone, Chrome shows its own
      // prompt whenever it feels like it, which is usually not now.
      incoming.preventDefault();
      setEvent(incoming as InstallEvent);
    };
    const done = () => setHidden(true);
    window.addEventListener('beforeinstallprompt', offer);
    window.addEventListener('appinstalled', done);
    return () => {
      window.removeEventListener('beforeinstallprompt', offer);
      window.removeEventListener('appinstalled', done);
    };
  }, []);

  if (hidden || (!event && !apple)) return null;

  const put = () => {
    try {
      localStorage.setItem(DISMISSED, '1');
    } catch {
      // Not remembering it only costs one more banner.
    }
    setHidden(true);
  };

  return (
    <aside class="app-install">
      <div class="app-install-what">
        <strong>Put Kona on your home screen</strong>
        <small>
          {apple
            ? 'Tap Share, then Add to Home Screen. It opens like an app and keeps working offline.'
            : 'It opens like an app, works offline, and you can share text straight into it.'}
        </small>
      </div>
      {event && (
        <button
          class="app-install-go"
          onClick={() => {
            void event.prompt().then(() => event.userChoice.then(put));
          }}
        >
          Install
        </button>
      )}
      <button class="app-install-no" onClick={put} aria-label="Not now">
        ✕
      </button>
    </aside>
  );
}
