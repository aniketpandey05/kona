import { useEffect, useState } from 'preact/hooks';
import { KonaMark } from '../../src/ui/KonaMark';
import { Passage } from '../../src/design/Passage';
import type { Mark } from '../../src/core/types';
import { planShare, readShare, type SharedPayload } from './share';
import { loadAll, save } from './storage';

/**
 * Something shared into Kona, arriving.
 *
 * **Android, mostly** (1h). Chrome there has no extensions for anyone, so
 * capture is the share sheet: *Share › Kona* from any app, and what Chrome
 * hands over for a selection is already a link to the highlighted text, which
 * is Kona's own format. The app captures by *being handed* something, that
 * is as far as an app can go, since it never runs inside the page you are
 * reading.
 *
 * It is its own screen because a share has no route. It arrives on a plain URL
 * with a query on it and nothing else, which is how it went unnoticed for two
 * commits when the library took the default route: it was landing on the
 * library and capturing nothing, silently.
 *
 * **Adopting an orphan.** A phone shares in two goes: the text first, then
 * the link, so a passage kept moments ago with no page attached is almost
 * certainly waiting for this URL rather than being a second thing. `planShare`
 * decides; this only says what happened.
 */
export function Shared({ payload }: { payload: SharedPayload }) {
  const [kept, setKept] = useState<Mark | null>(null);
  const [said, setSaid] = useState('Keeping it…');

  useEffect(() => {
    void (async () => {
      const plan = planShare(payload, await loadAll());
      if (plan.kind === 'nothing') {
        setSaid('There was nothing in that to keep.');
        return;
      }
      if (plan.kind === 'adopt') {
        // The link for a passage shared a moment ago, not a second thing.
        const [orphan] = plan.orphans;
        if (orphan) {
          const joined = { ...orphan, url: plan.url, updatedAt: Date.now() };
          await save(joined);
          setKept(joined);
          setSaid('Added the link to what you just shared.');
          return;
        }
      }
      if (plan.kind === 'keep') {
        await save(plan.mark);
        setKept(plan.mark);
        setSaid('Kept.');
      }
    })();
  }, []);

  return (
    <main class="lib">
      <header class="lib-top">
        <span class="lib-brand">
          <KonaMark size={22} />
          <strong>Kona</strong>
        </span>
      </header>

      <div class="lib-body">
        <main class="lib-main">
          <div class="lib-head">
            <h1>{said}</h1>
          </div>

          {kept && (
            <div class="lib-row">
              <div>
                <Passage color={kept.color} text={kept.label || kept.snapshot} note={kept.note} />
                {kept.url && <p class="lib-row-where">{hostOf(kept.url)}</p>}
              </div>
            </div>
          )}

          <p class="set-row">
            {/* A plain link, because the share arrived on a URL and leaving by
                one keeps the back button meaning what it looks like it means. */}
            <a class="sp-do" href={`${location.pathname}#/`}>
              Open your library
            </a>
          </p>
        </main>
      </div>
    </main>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Whether this page load is a share arriving at all. */
export function sharedNow(): SharedPayload | null {
  return readShare(location.search);
}
