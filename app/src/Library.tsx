import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { KonaMark } from '../../src/ui/KonaMark';
import { Passage } from '../../src/design/Passage';
import { DEFAULT_PENS, penOf, pensInUse } from '../../src/core/pens';
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
import { ago } from '../../src/core/ago';
import { linkToMark } from '../../src/core/link';
import { searchLibrary } from '../../src/core/search';
import { sameTag } from '../../src/core/tags';
import { siteLabel } from '../../src/core/sites';
import type { Space } from '../../src/core/spaces';
import type { Mark, PenId } from '../../src/core/types';
import { browserFolders } from '../../src/core/folder';
import { useFolderSync } from '../../src/ui/useFolderSync';
import { createBackup } from '../../src/core/backup';
import { identityForBackup, loadMe, syncStore } from './storage';
import { openLibrary, type LibrarySource } from './source';
import type { FolderSource } from '../../src/core/folder';
import { About } from './About';
import { bridgeVersion } from './bridge';
import { Pens } from './Pens';
import { usePictures } from './usePictures';
import { Settings } from './Settings';
import { SpacesView } from './SpacesView';

/**
 * The library: Highlights, which is everything you kept, organised by where
 * you read (3f).
 *
 * Three kinds of control, in three places (17), which is the thing the first
 * mockup got wrong:
 *
 *   the nav     where you are, one at a time
 *   the search  across all of it (15)
 *   the chips   colour, site, when, they stack
 *
 * The nav is what makes Pro's unlimited spaces survivable: forty rows scan,
 * forty tabs do not.
 *
 * This is paper, not the slab. It is your own room rather than something
 * floating over somebody else's article (17), so it takes the paper tokens and
 * the passage reads back as prose in Source Serif at 18px, which is the
 * whole reason for reading it here rather than in the panel's strip.
 */

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

export function Library({
  route = '',
  folders,
  syncOnDemand,
  source: given,
}: {
  route?: string;
  folders?: FolderSource;
  syncOnDemand?: (run: () => void) => void;
  /**
   * Where to read from, when the caller already knows.
   *
   * The library normally asks `openLibrary()` once and is told the bridge or
   * the device. Handing one in is for the cases that cannot wait to be asked:
   * a test, and the screenshot pages, where a headless browser photographs the
   * page before any storage has answered.
   */
  source?: LibrarySource;
}) {
  // 3f: the library is the place, and Highlights and Spaces are two ways in.
  const inSpaces = route.startsWith('#/spaces');
  const inSettings = route.startsWith('#/settings');
  const inPens = route.startsWith('#/pens');
  const inAbout = route.startsWith('#/about');
  /** Whether one of the library's own lists is showing, rather than a screen. */
  const inList = !inSpaces && !inSettings && !inPens && !inAbout;
  // Every view is a route, so the nav and the pane cannot disagree about which
  // one is showing. Holding a view in state beside the route meant clearing
  // one without the other, and the nav said Highlights while Settings showed.
  const view: 'highlights' | 'archived' = route.startsWith('#/archived')
    ? 'archived'
    : 'highlights';
  const openSpaceId = route.startsWith('#/spaces/') ? route.slice('#/spaces/'.length) : null;
  /**
   * A colour named in the route, which is how a colour that is no longer a pen
   * stays reachable: the Pens screen links to it, rather than leaving somebody
   * to recognise a retired colour among the chips (12, rule 4).
   */
  const askedColour = route.includes('?')
    ? new URLSearchParams(route.slice(route.indexOf('?') + 1)).get('colour')
    : null;
  const [source, setSource] = useState<LibrarySource | null>(null);
  const [marks, setMarks] = useState<Mark[] | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [query, setQuery] = useState('');
  const [colours, setColours] = useState<PenId[]>([]);
  const [pens, setPens] = useState<PenId[]>([...DEFAULT_PENS]);
  const [me, setMe] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [menuAt, setMenuAt] = useState(false);
  const [site, setSite] = useState<string | null>(null);
  const [when, setWhen] = useState<When>('any');
  const [menuOpen, setMenuOpen] = useState(false);
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
   * a stale library on the screen: the data right, the counts wrong, which
   * is the worst version of being wrong because nothing looks broken.
   */
  const reading = useRef(0);

  useEffect(() => {
    let stop: (() => void) | undefined;
    void (async () => {
      const opened = given ?? (await openLibrary());
      setSource(opened);
      await readAll(opened);
      stop = opened.watch(() => void readAll(opened));
    })();
    return () => stop?.();
  }, [given]);

  /**
   * The folder sync, run from here rather than from Settings.
   *
   * One pass at a time is the whole point of the hook, so there can only be
   * one of it: two would each write what the other had not read yet. It lives
   * here because the account row has to be able to say that a sync stopped
   * (23) whichever screen you are on, and Settings is handed the same controls
   * rather than making a second set.
   */
  const sync = useFolderSync(folders ?? browserFolders, syncStore);
  const trouble =
    sync.state.kind === 'on' && sync.state.trouble
      ? sync.state.trouble
      : sync.state.kind === 'needs-permission'
        ? `${sync.state.name} needs permission again`
        : null;

  useEffect(() => {
    setMe(loadMe()?.name ?? '');
    setMenuAt(false);
  }, [route]);

  // Which extension is on this machine, for About. Null where there is none,
  // which is the ordinary case for anybody who has only opened the library.
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    void bridgeVersion().then(setVersion);
  }, []);

  // A colour arriving in the route becomes the filter. Written through to the
  // chips rather than held beside them, so the chip row and the list cannot
  // disagree about what is being filtered. It clears when the route stops
  // carrying one, or following the link and coming back leaves the library
  // filtered to a colour nothing on screen mentions any more.
  useEffect(() => {
    setColours(askedColour ? [askedColour] : []);
  }, [askedColour]);

  const inUse = useMemo(() => {
    const found = pensInUse((marks ?? []).map((mark) => mark.color));
    return found.length > 0 ? found : DEFAULT_PENS.map((id) => ({ pen: penOf(id), count: 0 }));
  }, [marks]);

  /**
   * The tags in your library, commonest first.
   *
   * Built from what the highlights carry rather than from a list of tags you
   * keep, for the same reason the colour chips are (12, rule 4): the only tags
   * that exist are the ones on something. A tag could be added from the note
   * card and then never found again, because nothing in the library offered it
   * back. Search already reads them; this is the other half.
   */
  const tags = useMemo(() => {
    const seen = new Map<string, number>();
    for (const mark of notArchived(marks ?? [])) {
      for (const each of mark.tags ?? []) {
        const known = [...seen.keys()].find((kept) => sameTag(kept, each)) ?? each;
        seen.set(known, (seen.get(known) ?? 0) + 1);
      }
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [marks]);

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
    if (tag) found = found.filter((mark) => (mark.tags ?? []).some((each) => sameTag(each, tag)));
    if (site) found = found.filter((mark) => siteLabel(mark) === site);
    if (when !== 'any') {
      const cutoff = Date.now() - SINCE[when];
      found = found.filter((mark) => mark.createdAt >= cutoff);
    }
    // Newest first, as the board says under the heading.
    return {
      shown: [...found].sort((a, b) => b.createdAt - a.createdAt),
      alsoMatched: also,
    };
  }, [marks, query, colours, tag, site, when, view]);

  // The pictures for the rows actually on screen (18), asked for one at a
  // time and then held.
  const pictures = usePictures(shown, source);

  const toggleColour = (pen: PenId) =>
    setColours((current) =>
      current.includes(pen) ? current.filter((each) => each !== pen) : [...current, pen],
    );

  const filtered =
    query.trim() !== '' || colours.length > 0 || tag !== null || site !== null || when !== 'any';
  const archivedCount = countArchived(marks ?? []);
  const room = roomToArchive(marks ?? [], pro);

  /**
   * Everything the library holds, in one read.
   *
   * One function rather than two, which is not tidiness: the effect and the
   * re-read were two copies, and adding the palette to one of them left the
   * nav counting five pens beside a list of six.
   */
  const readAll = async (from: LibrarySource) => {
    const mine = ++reading.current;
    const [found, spacesFound, pensFound] = await Promise.all([
      from.marks(),
      from.spaces(),
      from.pens(),
    ]);
    if (mine !== reading.current) return;
    setMarks(found);
    setSpaces(spacesFound);
    setPens(pensFound);
    // Cheap, and it keeps the account row in step when the name is saved on
    // the settings screen without leaving it.
    setMe(loadMe()?.name ?? '');
  };

  const reread = async () => {
    if (source) await readAll(source);
  };

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
          <a
            class={
              inList && view === 'highlights' ? 'lib-nav-item lib-nav-item--on' : 'lib-nav-item'
            }
            aria-current={inList && view === 'highlights' ? 'page' : undefined}
            href="#/"
          >
            Highlights <span class="lib-nav-count">{notArchived(marks ?? []).length}</span>
          </a>
          <a
            class={inList && view === 'archived' ? 'lib-nav-item lib-nav-item--on' : 'lib-nav-item'}
            aria-current={inList && view === 'archived' ? 'page' : undefined}
            href="#/archived"
          >
            Archived <span class="lib-nav-count">{archivedCount}</span>
          </a>

          {/* Spaces are the library's other view (3f), still the old screen. */}
          <p class="lib-nav-head">
            <a href="#/spaces">Spaces · {spaces.length}</a>
          </p>
          {spaces.map((space) => (
            <a
              class={openSpaceId === space.id ? 'lib-nav-item lib-nav-item--on' : 'lib-nav-item'}
              key={space.id}
              href={`#/spaces/${space.id}`}
            >
              <span class="lib-nav-dot" aria-hidden="true" />
              {space.name} <span class="lib-nav-count">{space.markIds.length}</span>
            </a>
          ))}

          {/* The Main board's third nav section. A tag you added in the note
              card had nowhere to be read back until now. */}
          {tags.length > 0 && <p class="lib-nav-head">Tags</p>}
          {tags.map(([each, count]) => (
            <button
              type="button"
              class={
                tag !== null && sameTag(tag, each)
                  ? 'lib-nav-item lib-nav-item--on'
                  : 'lib-nav-item'
              }
              key={each}
              aria-pressed={tag !== null && sameTag(tag, each)}
              onClick={() => {
                setTag((current) => (current !== null && sameTag(current, each) ? null : each));
                if (!inList) location.hash = '#/';
              }}
            >
              {each} <span class="lib-nav-count">{count}</span>
            </button>
          ))}

          <div class="lib-nav-foot">
            {/* Pens sits at the foot, where the boards put it: it is a thing
                you set up once and then hardly open again (12). */}
            <a class={inPens ? 'lib-nav-item lib-nav-item--on' : 'lib-nav-item'} href="#/pens">
              <PensIcon />
              Pens <span class="lib-nav-count">{pens.length}</span>
            </a>
            {/* 17a: the account row, where signing in, your account, settings
                and saving a copy all live. Quiet almost always, and the one
                thing in Kona allowed to speak up, because 23 allows no
                notifications and a sync that stopped has no other route to
                you.

                It said "Reading this device" before, which is the version the
                board rejected by name: a state you cannot act on, that never
                changes, sitting where the one message that matters has to be
                believed. */}
            <button
              type="button"
              class={trouble ? 'lib-acct lib-acct--trouble' : 'lib-acct'}
              aria-expanded={menuAt}
              aria-haspopup="menu"
              onClick={() => setMenuAt((open) => !open)}
            >
              <span class="lib-acct-face" aria-hidden="true" data-empty={me ? undefined : 'yes'}>
                {initials(me)}
              </span>
              {trouble ? (
                <span class="lib-acct-who">
                  <span class="lib-acct-trouble">{trouble}</span>
                  <span class="lib-acct-quiet">This machine only, for now</span>
                </span>
              ) : (
                <span class="lib-acct-who">{me || 'Your name and your backups'}</span>
              )}
            </button>
            {menuAt && (
              <AccountMenu
                me={me}
                trouble={trouble}
                extension={source?.kind === 'extension'}
                onClose={() => setMenuAt(false)}
                onBackup={() => {
                  setMenuAt(false);
                  downloadBackup(marks ?? [], spaces);
                }}
              />
            )}
          </div>
        </nav>

        <main class="lib-main">
          {inAbout ? (
            <About version={version} />
          ) : inPens && source ? (
            <Pens source={source} marks={marks ?? []} onChanged={() => void reread()} />
          ) : inSettings ? (
            <Settings
              marks={marks ?? []}
              spaces={spaces}
              onChanged={() => void reread()}
              sync={sync}
              syncOnDemand={syncOnDemand}
            />
          ) : inSpaces && source ? (
            <SpacesView
              source={source}
              spaces={spaces}
              marks={marks ?? []}
              openId={openSpaceId}
              onOpen={(id) => {
                location.hash = id ? `#/spaces/${id}` : '#/spaces';
              }}
              onChanged={() => void reread()}
            />
          ) : (
            <>
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
                  {/* Built from the colours your library actually contains, not
                  from the palette: a pen you took out of the case is still in
                  everything you marked with it, and still filterable (12). */}
                  {inUse.map(({ pen }) => (
                    <button
                      key={pen.id}
                      type="button"
                      class={colours.includes(pen.id) ? 'lib-pen lib-pen--on' : 'lib-pen'}
                      style={{ background: pen.ink }}
                      aria-label={pen.name}
                      aria-pressed={colours.includes(pen.id)}
                      onClick={() => toggleColour(pen.id)}
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

              {/* 10a: the wall at fifteen. Bring one back, or Pro, and no delete
              in this notice, because offering it here would teach people to
              delete when they meant to tidy. */}
              {wall && (
                <p class="lib-wall" role="status">
                  Fifteen is as many as Free puts away at once. Bring one back and the slot returns,
                  or Pro archives without limit.{' '}
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
                      {/* The words are the link, rather than a link wrapped
                          around the whole passage: a passage long enough to be
                          folded needs a control of its own to open it out, and
                          that control cannot live inside a link (19). */}
                      <Passage
                        color={mark.color}
                        text={mark.label || mark.snapshot}
                        note={mark.note}
                        href={linkToMark(mark)}
                        isPicture={!!mark.image}
                        picture={pictures.get(mark.id)}
                      />
                      {/* The frame's own extras (3b): where it came from, and when.
                      The domain is text and nothing is fetched for it, a
                      favicon would tell that site you kept something. */}
                      <p class="lib-row-where">
                        {siteLabel(mark)} · {ago(mark.createdAt)}
                        {/* Search spans everything, so a hit that is put away says
                        so rather than being left out (10). */}
                        {isArchived(mark) && <span class="lib-archived"> · archived</span>}
                        {/* 13's other half. The library never visits the page,
                        so this is what the page wrote down last time it was
                        open, or what was true from the start for a passage
                        kept out of a PDF (16). The link stays: an edited page
                        is usually still the page you wanted. */}
                        {mark.landing === 'lost' && (
                          <span class="lib-lost" title="The passage is still yours: searchable, and in its spaces.">
                            {' '}
                            · page has changed
                          </span>
                        )}
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
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
    >
      <circle cx="6.8" cy="6.8" r="4.6" />
      <path d="M10.4 10.4 L14 14" />
    </svg>
  );
}

/** The two nibs from the board's sidebar, at the size the nav draws icons. */
function PensIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
    >
      <circle cx="6.2" cy="6.4" r="2.6" />
      <circle cx="12" cy="11.4" r="2.6" />
      <path d="M2.2 14.8h4" />
      <path d="M13 3.6h2.8" />
    </svg>
  );
}

/**
 * Two letters for the face in the account row.
 *
 * A dashed empty circle when there is no name, which is the board's signed-out
 * state: something to act on rather than a state you cannot change.
 */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0]![0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

/**
 * The account row, opened (17a, 24).
 *
 * It holds what is about *you* rather than about what you kept: saving a copy
 * of everything first, because 14 makes it the only backup that exists;
 * settings; what's new; and the two offers that are only worth making when
 * they are not already true, which is how neither of them nags.
 *
 * There is no signing in yet and nothing to sign out of, so neither is here.
 * The board's signed-out menu is settings and saving a copy, which is what
 * this is.
 */
function AccountMenu({
  me,
  trouble,
  onClose,
  onBackup,
  extension,
}: {
  me: string;
  trouble: string | null;
  onClose: () => void;
  onBackup: () => void;
  /** Whether the bridge found an extension on this machine (3c). */
  extension: boolean;
}) {
  const [installable, setInstallable] = useState<(() => void) | null>(null);

  useEffect(() => {
    // Chrome hands over the install prompt and lets it be fired later from a
    // control of your own; left alone it shows up whenever it feels like it,
    // which is usually not now (24).
    const offer = (event: Event) => {
      event.preventDefault();
      const held = event as Event & { prompt(): Promise<void> };
      setInstallable(() => () => void held.prompt());
    };
    window.addEventListener('beforeinstallprompt', offer);
    return () => window.removeEventListener('beforeinstallprompt', offer);
  }, []);

  // Running in its own window already: there is nothing to offer.
  const inApp =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true;

  return (
    <div class="lib-menu" role="menu">
      <p class="lib-menu-who">{me || 'Nobody signed in'}</p>
      {trouble && <p class="lib-menu-trouble">{trouble}</p>}

      <button type="button" class="lib-menu-item" role="menuitem" onClick={onBackup}>
        Save a copy of everything
        {/* Said here rather than only in settings, because somebody reaching
            for it has to know what it is for the first time they see it. */}
        <span class="lib-menu-why">Kona cannot read your library, so this file is the backup.</span>
      </button>

      <a class="lib-menu-item" role="menuitem" href="#/settings" onClick={onClose}>
        Settings
      </a>
      <a class="lib-menu-item" role="menuitem" href="#/about" onClick={onClose}>
        What&rsquo;s new
      </a>

      {/* The menu shows what you have not got. Both disappear once taken. */}
      {!inApp && installable && (
        <button
          type="button"
          class="lib-menu-item"
          role="menuitem"
          onClick={() => {
            installable();
            onClose();
          }}
        >
          Install Kona
          <span class="lib-menu-why">Its own window and a dock icon, instead of a tab to find.</span>
        </button>
      )}
      {!extension && (
        <a
          class="lib-menu-item"
          role="menuitem"
          href="https://aniketpandey05.github.io/kona/"
          target="_blank"
          rel="noopener"
          onClick={onClose}
        >
          Get the extension
          <span class="lib-menu-why">Only the extension can highlight. This library reads it.</span>
        </a>
      )}
    </div>
  );
}

/** Saving a copy of everything, from the one row that is about you (14). */
function downloadBackup(marks: Mark[], spaces: Space[]): void {
  const text = createBackup(marks, spaces, identityForBackup() ?? undefined);
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `kona-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
