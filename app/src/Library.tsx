import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { KonaMark } from '../../src/ui/KonaMark';
import { Passage } from '../../src/design/Passage';
import { PEN_COLORS } from '../../src/design/tokens';
import {
  archive,
  archivedOnly,
  countArchived,
  FREE_ARCHIVE_LIMIT,
  isArchived,
  notArchived,
  roomToArchive,
  unarchive,
} from '../../src/core/archive';
import { linkToMark } from '../../src/core/link';
import { searchLibrary } from '../../src/core/search';
import { siteLabel } from '../../src/core/sites';
import type { Space } from '../../src/core/spaces';
import type { HighlightColor, Mark } from '../../src/core/types';
import { openLibrary, type LibrarySource } from './source';

/**
 * The library: Highlights, which is everything you kept, organised by where
 * you read (3f).
 *
 * Three kinds of control, in three places (17), which is the thing the first
 * mockup got wrong:
 *
 *   the nav     where you are, one at a time
 *   the search  across all of it (15)
 *   the chips   colour, site, when -- they stack
 *
 * The nav is what makes Pro's unlimited spaces survivable: forty rows scan,
 * forty tabs do not.
 *
 * This is paper, not the slab. It is your own room rather than something
 * floating over somebody else's article (17), so it takes the paper tokens and
 * the passage reads back as prose in Source Serif at 18px -- which is the
 * whole reason for reading it here rather than in the panel's strip.
 */
const PENS = Object.keys(PEN_COLORS) as HighlightColor[];

type When = 'any' | 'today' | 'week' | 'month';

const WHEN_LABEL: Record<When, string> = {
  any: 'When',
  today: 'Today',
  week: 'This week',
  month: 'This month',
};

const SINCE: Record<Exclude<When, 'any'>, number> = {
  today: 86_400_000,
  week: 7 * 86_400_000,
  month: 30 * 86_400_000,
};

export function Library() {
  const [source, setSource] = useState<LibrarySource | null>(null);
  const [marks, setMarks] = useState<Mark[] | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [query, setQuery] = useState('');
  const [colours, setColours] = useState<HighlightColor[]>([]);
  const [site, setSite] = useState<string | null>(null);
  const [when, setWhen] = useState<When>('any');
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<'highlights' | 'archived'>('highlights');
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [wall, setWall] = useState(false);
  // No entitlement system exists yet, so everyone is Free. When one does, this
  // is the single place the library asks.
  const pro = false;

  /**
   * Which read is the newest one asked for.
   *
   * Every save tells the store, and the store tells us, so archiving fifteen
   * highlights starts fifteen reads at once. They do not come back in the
   * order they went out, and without this an early one can land last and put
   * a stale library on the screen — the data right, the counts wrong, which
   * is the worst version of being wrong because nothing looks broken.
   */
  const reading = useRef(0);

  useEffect(() => {
    let stop: (() => void) | undefined;
    void (async () => {
      const opened = await openLibrary();
      setSource(opened);
      const read = async () => {
        const mine = ++reading.current;
        const [found, spacesFound] = await Promise.all([opened.marks(), opened.spaces()]);
        if (mine !== reading.current) return;
        setMarks(found);
        setSpaces(spacesFound);
      };
      await read();
      stop = opened.watch(() => void read());
    })();
    return () => stop?.();
  }, []);

  const sites = useMemo(() => {
    const seen = new Map<string, number>();
    for (const mark of marks ?? []) {
      const label = siteLabel(mark);
      seen.set(label, (seen.get(label) ?? 0) + 1);
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1]);
  }, [marks]);

  const { shown, alsoMatched } = useMemo(() => {
    let found = marks ?? [];
    let also: string[] = [];
    // Search spans everything (15) and must never lose an archived highlight:
    // an archive that hides things from search is a bin with extra steps. So
    // searching looks at the whole library, and the rows say which are put
    // away rather than leaving them out.
    if (query.trim()) {
      const result = searchLibrary(found, query);
      found = result.marks;
      also = result.alsoMatched;
    } else {
      // 10: the only thing archiving changes is the default view of one list.
      found = view === 'archived' ? archivedOnly(found) : notArchived(found);
    }
    if (colours.length) found = found.filter((mark) => colours.includes(mark.color));
    if (site) found = found.filter((mark) => siteLabel(mark) === site);
    if (when !== 'any') {
      const cutoff = Date.now() - SINCE[when];
      found = found.filter((mark) => mark.createdAt >= cutoff);
    }
    // Newest first, as the board says under the heading.
    return { shown: [...found].sort((a, b) => b.createdAt - a.createdAt), alsoMatched: also };
  }, [marks, query, colours, site, when, view]);

  const toggleColour = (pen: HighlightColor) =>
    setColours((current) =>
      current.includes(pen) ? current.filter((each) => each !== pen) : [...current, pen],
    );

  const filtered = query.trim() !== '' || colours.length > 0 || site !== null || when !== 'any';
  const archivedCount = countArchived(marks ?? []);
  const room = roomToArchive(marks ?? [], pro);

  const apply = async (ids: string[], put: boolean) => {
    if (!source || ids.length === 0) return;
    const all = marks ?? [];
    const changed = put ? archive(all, ids, pro).changed : unarchive(all, ids);
    if (put && changed.length < ids.length) setWall(true);
    for (const each of changed) await source.save(each);
    // Read once at the end, and let the sequence guard drop the reads the
    // saves kicked off on the way.
    const mine = ++reading.current;
    const found = await source.marks();
    if (mine === reading.current) setMarks(found);
    setChosen(new Set());
  };

  const choose = (id: string) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div class="lib">
      <header class="lib-top">
        <button
          type="button"
          class="lib-bars"
          aria-label="Show or hide the menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>

        <span class="lib-brand">
          <KonaMark size={22} />
          <strong>Kona</strong>
        </span>

        <label class="lib-search">
          <SearchIcon />
          <span class="lib-sr">Search everything you kept</span>
          <input
            type="search"
            placeholder="Search everything you kept"
            value={query}
            onInput={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
      </header>

      <div class="lib-body">
        <nav class={menuOpen ? 'lib-nav lib-nav--open' : 'lib-nav'} aria-label="Library">
          <button
            type="button"
            class={view === 'highlights' ? 'lib-nav-item lib-nav-item--on' : 'lib-nav-item'}
            aria-current={view === 'highlights' ? 'page' : undefined}
            onClick={() => setView('highlights')}
          >
            Highlights <span class="lib-nav-count">{notArchived(marks ?? []).length}</span>
          </button>
          <button
            type="button"
            class={view === 'archived' ? 'lib-nav-item lib-nav-item--on' : 'lib-nav-item'}
            aria-current={view === 'archived' ? 'page' : undefined}
            onClick={() => setView('archived')}
          >
            Archived <span class="lib-nav-count">{archivedCount}</span>
          </button>

          {/* Spaces are the library's other view (3f), still the old screen. */}
          <p class="lib-nav-head">Spaces · {spaces.length}</p>
          {spaces.map((space) => (
            <a class="lib-nav-item" key={space.id} href={`#/spaces/${space.id}`}>
              <span class="lib-nav-dot" aria-hidden="true" />
              {space.name} <span class="lib-nav-count">{space.markIds.length}</span>
            </a>
          ))}

          {/* Sync, backups and installing are still the old screen. Linked
              rather than left stranded, which is what happened when Highlights
              took the default route. */}
          <p class="lib-nav-head">More</p>
          <a class="lib-nav-item" href="#/settings">
            Settings &amp; sync
          </a>

          <div class="lib-nav-foot">
            {/* 17a: the account row sits at the foot, quiet. It says where this
                library is reading from, because on Free that is the one thing
                that explains why a highlight is or is not here. */}
            <p class="lib-account">
              {source?.kind === 'extension'
                ? 'Reading the extension on this device'
                : 'Reading this device'}
            </p>
          </div>
        </nav>

        <main class="lib-main">
          <div class="lib-head">
            <h1>{view === 'archived' ? 'Archived' : 'Highlights'}</h1>
            <p>
              {view === 'archived'
                ? `Out of the way, still searchable. ${archivedCount} of ${FREE_ARCHIVE_LIMIT} put away.`
                : 'Newest first. Archived left out.'}
            </p>
          </div>

          <div class="lib-chips">
            <span class="lib-chip lib-chip--pens">
              <span class="lib-chip-label">Colour</span>
              {PENS.map((pen) => (
                <button
                  key={pen}
                  type="button"
                  class={colours.includes(pen) ? 'lib-pen lib-pen--on' : 'lib-pen'}
                  style={{ background: PEN_COLORS[pen] }}
                  aria-label={pen}
                  aria-pressed={colours.includes(pen)}
                  onClick={() => toggleColour(pen)}
                />
              ))}
            </span>

            <select
              class="lib-chip"
              aria-label="Site"
              value={site ?? ''}
              onChange={(event) => setSite(event.currentTarget.value || null)}
            >
              <option value="">Site</option>
              {sites.map(([label, count]) => (
                <option key={label} value={label}>
                  {label} ({count})
                </option>
              ))}
            </select>

            <select
              class="lib-chip"
              aria-label="When"
              value={when}
              onChange={(event) => setWhen(event.currentTarget.value as When)}
            >
              {(Object.keys(WHEN_LABEL) as When[]).map((each) => (
                <option key={each} value={each}>
                  {WHEN_LABEL[each]}
                </option>
              ))}
            </select>
            <span class="lib-chips-gap" />
            <button
              type="button"
              class={picking ? 'lib-chip lib-chip--on' : 'lib-chip'}
              aria-pressed={picking}
              onClick={() => {
                setPicking((on) => !on);
                setChosen(new Set());
              }}
            >
              Select
            </button>
          </div>

          {/* 10a: the wall at fifteen. Bring one back, or Pro — and no delete
              in this notice, because offering it here would teach people to
              delete when they meant to tidy. */}
          {wall && (
            <p class="lib-wall" role="status">
              Fifteen is as many as Free puts away at once. Bring one back and
              the slot returns, or Pro archives without limit.{' '}
              <button type="button" class="lib-wall-close" onClick={() => setWall(false)}>
                Close
              </button>
            </p>
          )}

          {/* Bulk, or it is not a feature: archiving two hundred one at a time
              is a punishment. */}
          {picking && chosen.size > 0 && (
            <p class="lib-chosen" role="status">
              {chosen.size} chosen
              <button
                type="button"
                class="lib-chosen-do"
                onClick={() => void apply([...chosen], view !== 'archived')}
              >
                {view === 'archived' ? 'Bring back' : 'Archive'}
              </button>
            </p>
          )}

          {/* Words nobody typed that earned a result its place, so a hit using
              none of your words does not read as a bug (15). */}
          {alsoMatched.length > 0 && (
            <p class="lib-also">Also matched {alsoMatched.join(', ')}</p>
          )}

          {marks === null ? (
            <p class="lib-none">Reading your library…</p>
          ) : shown.length === 0 ? (
            <p class="lib-none">
              {filtered
                ? 'Nothing matches that.'
                : view === 'archived'
                  ? 'Nothing put away. Archiving takes a highlight out of this list and leaves it everywhere else.'
                  : 'Nothing kept yet. Highlight something and it lands here.'}
            </p>
          ) : (
            <ul class="lib-list">
              {shown.map((mark) => (
                <li key={mark.id} class="lib-row">
                  {picking && (
                    <label class="lib-pick">
                      <input
                        type="checkbox"
                        checked={chosen.has(mark.id)}
                        aria-label={`Choose ${mark.label || mark.snapshot}`}
                        onChange={() => choose(mark.id)}
                      />
                    </label>
                  )}
                  <a class="lib-row-link" href={linkToMark(mark)} target="_blank" rel="noopener">
                    <Passage
                      color={mark.color}
                      text={mark.label || mark.snapshot}
                      note={mark.note}
                    />
                  </a>
                  {/* The frame's own extras (3b): where it came from, and when.
                      The domain is text and nothing is fetched for it -- a
                      favicon would tell that site you kept something. */}
                  <p class="lib-row-where">
                    {siteLabel(mark)} · {ago(mark.createdAt)}
                    {/* Search spans everything, so a hit that is put away says
                        so rather than being left out (10). */}
                    {isArchived(mark) && <span class="lib-archived"> · archived</span>}
                    <button
                      type="button"
                      class="lib-row-do"
                      onClick={() => void apply([mark.id], !isArchived(mark))}
                    >
                      {isArchived(mark) ? 'Bring back' : 'Archive'}
                    </button>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
}

function ago(at: number): string {
  const minutes = Math.round((Date.now() - at) / 60_000);
  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(at).toLocaleDateString();
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
      <circle cx="6.8" cy="6.8" r="4.6" />
      <path d="M10.4 10.4 L14 14" />
    </svg>
  );
}
