import { useEffect, useState } from 'preact/hooks';
import { grantTeam, isTeam, load, planLabel, watch as watchEntitlement } from './entitlement';
import { activeSeats, log, watch as watchStore } from './store';
import { Admin } from './views/Admin';
import { Checkout } from './views/Checkout';
import { Members } from './views/Members';
import { Pricing } from './views/Pricing';
import { Space } from './views/Space';
import { Spaces } from './views/Spaces';
import { Workspace } from './views/Workspace';

type RouteName = 'workspace' | 'spaces' | 'space' | 'members' | 'admin' | 'plans' | 'checkout';

interface Route {
  name: RouteName;
  id?: string;
}

const SPACE_PREFIX = '#/spaces/';
const INTRO_KEY = 'kona:team:intro-seen';

function currentRoute(): Route {
  const hash = location.hash;
  if (hash.startsWith(SPACE_PREFIX)) {
    return { name: 'space', id: decodeURIComponent(hash.slice(SPACE_PREFIX.length)) };
  }
  switch (hash) {
    case '#/spaces':
      return { name: 'spaces' };
    case '#/members':
      return { name: 'members' };
    case '#/admin':
      return { name: 'admin' };
    case '#/plans':
      return { name: 'plans' };
    case '#/checkout':
      return { name: 'checkout' };
    default:
      return { name: 'workspace' };
  }
}

function go(hash: string): void {
  location.hash = hash;
}

function introSeen(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === '1';
  } catch {
    // Private browsing refuses storage; showing the intro again is harmless.
    return false;
  }
}

function rememberIntro(): void {
  try {
    localStorage.setItem(INTRO_KEY, '1');
  } catch {
    // Not remembering it only means it appears once more.
  }
}

/**
 * Most people arrive here from a link with no idea what they are looking at,
 * and the best part of the demo is two clicks behind a paywall. So say what
 * this is, and say which two clicks.
 */
function Intro({ onClose }: { onClose: () => void }) {
  return (
    <aside class="intro">
      <button type="button" class="intro-close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <h2>This is a demo of the paid tier.</h2>
      <p>
        The company, the people and every highlight in it are invented. There is no
        sign-up, nothing is charged, and the checkout is a stand-in that walks the same
        steps a real one would.
      </p>
      <p class="intro-path">
        <strong>Thirty seconds:</strong> upgrade, open <strong>Spaces</strong>, pick the
        Postgres one, and press <strong>Write it up</strong>.
      </p>
      <div class="intro-actions">
        <a
          class="primary"
          href="#/plans"
          onClick={() => {
            rememberIntro();
            onClose();
          }}
        >
          Start
        </a>
        <button
          type="button"
          class="action"
          onClick={() => {
            grantTeam(Math.max(1, activeSeats()));
            log('demo.skipped_checkout', 'Granted Team without going through checkout');
            rememberIntro();
            onClose();
            go('#/spaces');
          }}
        >
          Skip the checkout
        </button>
      </div>
    </aside>
  );
}

export function App() {
  const [route, setRoute] = useState<Route>(currentRoute);
  const [showIntro, setShowIntro] = useState(() => !introSeen());
  // One counter re-renders the tree when either store moves underneath it.
  const [, bump] = useState(0);

  useEffect(() => {
    const onHash = (): void => setRoute(currentRoute());
    addEventListener('hashchange', onHash);
    const redraw = (): void => bump((count) => count + 1);
    const stopEntitlement = watchEntitlement(redraw);
    const stopStore = watchStore(redraw);
    return () => {
      removeEventListener('hashchange', onHash);
      stopEntitlement();
      stopStore();
    };
  }, []);

  const entitlement = load();
  const onTeam = isTeam(entitlement);

  const nav: Array<{ name: RouteName; hash: string; label: string; locked: boolean }> = [
    { name: 'workspace', hash: '#/', label: onTeam ? 'Workspace' : 'Highlights', locked: false },
    { name: 'spaces', hash: '#/spaces', label: 'Spaces', locked: !onTeam },
    { name: 'members', hash: '#/members', label: 'Members', locked: !onTeam },
    { name: 'admin', hash: '#/admin', label: 'Admin', locked: !onTeam },
    { name: 'plans', hash: '#/plans', label: 'Plans', locked: false },
  ];

  // A space you are reading is still the Spaces tab.
  const activeTab: RouteName = route.name === 'space' ? 'spaces' : route.name;

  const closeIntro = (): void => {
    rememberIntro();
    setShowIntro(false);
  };

  return (
    <div class="shell">
      <header class="top">
        <div class="brand">
          <span class="logo" aria-hidden="true" />
          <div>
            <strong>Kona</strong>
            <span class="mark-meta">{onTeam ? 'Meridian workspace' : 'This computer only'}</span>
          </div>
        </div>

        <nav>
          {nav.map((item) => (
            <a
              key={item.hash}
              href={item.hash}
              class={activeTab === item.name ? 'nav-on' : undefined}
              aria-current={activeTab === item.name ? 'page' : undefined}
            >
              {item.label}
              {item.locked && <span class="lock">Team</span>}
            </a>
          ))}
        </nav>

        <div class="top-right">
          <span class={onTeam ? 'plan plan-team' : 'plan'}>{planLabel(entitlement.plan)}</span>
          <button
            type="button"
            class="action"
            title="Put the seeded workspace back and return to the free plan"
            onClick={() => {
              try {
                localStorage.removeItem('kona:team:entitlement');
                localStorage.removeItem(INTRO_KEY);
              } catch {
                // Nothing to clear if storage was refused in the first place.
              }
              location.hash = '#/';
              location.reload();
            }}
          >
            Reset
          </button>
        </div>
      </header>

      <main>
        {showIntro && !onTeam && route.name !== 'checkout' && <Intro onClose={closeIntro} />}

        {route.name === 'workspace' && (
          <Workspace entitlement={entitlement} onUpgrade={() => go('#/plans')} />
        )}
        {route.name === 'spaces' && (
          <Spaces
            entitlement={entitlement}
            onUpgrade={() => go('#/plans')}
            onOpen={(id) => go(`${SPACE_PREFIX}${encodeURIComponent(id)}`)}
          />
        )}
        {route.name === 'space' && route.id && (
          <Space id={route.id} entitlement={entitlement} onBack={() => go('#/spaces')} />
        )}
        {route.name === 'members' && (
          <Members entitlement={entitlement} onUpgrade={() => go('#/plans')} />
        )}
        {route.name === 'admin' && (
          <Admin entitlement={entitlement} onUpgrade={() => go('#/plans')} />
        )}
        {route.name === 'plans' && (
          <Pricing entitlement={entitlement} onCheckout={() => go('#/checkout')} />
        )}
        {route.name === 'checkout' && (
          <Checkout onDone={() => go('#/spaces')} onCancel={() => go('#/plans')} />
        )}
      </main>

      <footer class="bottom">
        <span>
          A demo of the paid tier. The highlights, people and company in it are invented; the
          free version it sits on top of is the real extension.
        </span>
        <a href="https://github.com/aniketpandey05/kona">Source</a>
      </footer>
    </div>
  );
}
