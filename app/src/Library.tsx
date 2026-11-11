import { useEffect, useMemo, useState } from 'preact/hooks';
import { KonaMark } from '../../src/ui/KonaMark';
import { Passage } from '../../src/design/Passage';
import { PEN_COLORS } from '../../src/design/tokens';
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

  useEffect(() => {
    let stop: (() => void) | undefined;
    void (async () => {
      const opened = await openLibrary();
      setSource(opened);
      const read = async () => {
        setMarks(await opened.marks());
        setSpaces(await opened.spaces());
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
    // Search spans everything (15), so it runs before the chips narrow it.
    if (query.trim()) {
      const result = searchLibrary(found, query);
      found = result.marks;
      also = result.alsoMatched;
    }
    if (colours.length) found = found.filter((mark) => colours.includes(mark.color));
    if (site) found = found.filter((mark) => siteLabel(mark) === site);
    if (when !== 'any') {
      const cutoff = Date.now() - SINCE[when];
      found = found.filter((mark) => mark.createdAt >= cutoff);
    }
    // Newest first, as the board says under the heading.
    return { shown: [...found].sort((a, b) => b.createdAt - a.createdAt), alsoMatched: also };
  }, [marks, query, colours, site, when]);

  const toggleColour = (pen: HighlightColor) =>
    setColours((current) =>
      current.includes(pen) ? current.filter((each) => each !== pen) : [...current, pen],
    );

  const filtered = query.trim() !== '' || colours.length > 0 || site !== null || when !== 'any';

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
          <a class="lib-nav-item lib-nav-item--on" href="#" aria-current="page">
            Highlights <span class="lib-nav-count">{(marks ?? []).length}</span>
          </a>

          {/* Spaces are the library's other view (3f), still the old screen. */}
          <p class="lib-nav-head">Spaces · {spaces.length}</p>
          {spaces.map((space) => (
            <a class="lib-nav-item" key={space.id} href={`#/spaces/${space.id}`}>
              <span class="lib-nav-dot" aria-hidden="true" />
              {space.name} <span class="lib-nav-count">{space.markIds.length}</span>
            </a>
          ))}

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
            <h1>Highlights</h1>
            <p>Newest first. Archived left out.</p>
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
          </div>

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
                : 'Nothing kept yet. Highlight something and it lands here.'}
            </p>
          ) : (
            <ul class="lib-list">
              {shown.map((mark) => (
                <li key={mark.id} class="lib-row">
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
