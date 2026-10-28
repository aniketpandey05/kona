import { useEffect, useState } from 'preact/hooks';
import { isTeam, load, planLabel, watch as watchEntitlement } from './entitlement';
import { watch as watchStore } from './store';
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

export function App() {
  const [route, setRoute] = useState<Route>(currentRoute);
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
              {item.locked && (
                <span class="lock" title="Team plan">
                  ·
                </span>
              )}
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
              localStorage.removeItem('kona:team:entitlement');
              location.hash = '#/';
              location.reload();
            }}
          >
            Reset
          </button>
        </div>
      </header>

      <main>
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
          <Checkout onDone={() => go('#/')} onCancel={() => go('#/plans')} />
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
