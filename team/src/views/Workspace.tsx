import { useEffect, useMemo, useState } from 'preact/hooks';
import { countTags } from '../../../src/core/tags';
import { searchMarks } from '../../../src/core/search';
import { toMarkdown } from '../../../src/core/markdown';
import { MarkCard } from '../components';
import { YOU } from '../demo';
import { canWrite, isTeam } from '../entitlement';
import { hybridSearch } from '../hybrid';
import { allMarks, allMembers, allSpaces, clearUndo, pendingUndo, undoDelete } from '../store';
import type { Entitlement, TeamMark } from '../types';

type Tab = 'mine' | 'team';

export function Workspace({
  entitlement,
  onUpgrade,
}: {
  entitlement: Entitlement;
  onUpgrade: () => void;
}) {
  const shared = isTeam(entitlement);
  const writable = canWrite(entitlement);

  const [tab, setTab] = useState<Tab>('team');
  const [query, setQuery] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [tag, setTag] = useState('');

  const everything = allMarks();
  const undoable = pendingUndo();

  // An Undo that never goes away is just a second delete button.
  useEffect(() => {
    if (!undoable) return;
    const timer = setTimeout(clearUndo, 8000);
    return () => clearTimeout(timer);
  }, [undoable]);

  const mine = useMemo(() => everything.filter((mark) => mark.authorId === YOU), [everything]);
  const team = useMemo(() => everything.filter((mark) => mark.spaceId), [everything]);

  // On the free plan there is no shared layer, so there is only ever "mine".
  const activeTab: Tab = shared ? tab : 'mine';
  const pool = activeTab === 'mine' ? mine : team;

  const hiddenCount = everything.length - mine.length;
  const colleagues = new Set(
    everything.filter((mark) => mark.authorId !== YOU).map((mark) => mark.authorId),
  ).size;

  const { list: filtered, added } = useMemo(() => {
    let list = pool;
    if (activeTab === 'team' && spaceId) list = list.filter((mark) => mark.spaceId === spaceId);
    if (activeTab === 'team' && authorId) list = list.filter((mark) => mark.authorId === authorId);
    if (tag) {
      list = list.filter((mark) =>
        (mark.tags ?? []).some((entry) => entry.toLowerCase() === tag.toLowerCase()),
      );
    }
    const empty: string[] = [];
    if (!query.trim()) {
      return { list: [...list].sort((a, b) => b.createdAt - a.createdAt), added: empty };
    }
    // Hybrid is what the paid tiers buy. Free gets the extension's own lexical
    // search, which is exactly what the free extension has.
    if (shared) {
      const result = hybridSearch(list, query);
      return { list: result.marks, added: result.alsoMatched };
    }
    // searchMarks returns the same objects it was given, so they are still TeamMarks.
    return { list: searchMarks(list, query) as TeamMark[], added: empty };
  }, [pool, activeTab, spaceId, authorId, tag, query, shared]);

  const tags = useMemo(() => countTags(pool).slice(0, 8), [pool]);

  const exportMarkdown = (): void => {
    const blob = new Blob([toMarkdown(filtered)], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'kona-highlights.md';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const switchTab = (next: Tab): void => {
    setTab(next);
    setSpaceId('');
    setAuthorId('');
    setTag('');
  };

  return (
    <section>
      <div class="view-top">
        <div>
          <h1>{shared ? 'Workspace' : 'Your highlights'}</h1>
          <p class="subtle">
            {activeTab === 'mine'
              ? shared
                ? 'Everything you have kept. None of it is shared until you share it.'
                : `${mine.length} highlights, on this computer only`
              : `${team.length} shared by ${allMembers().filter((m) => m.seatActive).length} people`}
          </p>
        </div>
        <button
          type="button"
          class="action"
          onClick={exportMarkdown}
          disabled={filtered.length === 0}
        >
          Export Markdown
        </button>
      </div>

      {shared && (
        <div class="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'mine'}
            class={activeTab === 'mine' ? 'tab tab-on' : 'tab'}
            onClick={() => switchTab('mine')}
          >
            Mine <span class="tab-count">{mine.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'team'}
            class={activeTab === 'team' ? 'tab tab-on' : 'tab'}
            onClick={() => switchTab('team')}
          >
            Team <span class="tab-count">{team.length}</span>
          </button>
        </div>
      )}

      {undoable && (
        <div class="undo">
          <span>Deleted a highlight.</span>
          <button type="button" class="action" onClick={undoDelete}>
            Undo
          </button>
        </div>
      )}

      {!shared && hiddenCount > 0 && (
        <div class="upsell">
          <div>
            <strong>
              {hiddenCount} highlights from {colleagues} teammates are not here.
            </strong>
            <p>
              Your colleagues are keeping the same kind of thing you are — in their own
              browsers, where nobody else can search it. Team puts them in one place.
            </p>
          </div>
          <button type="button" class="primary" onClick={onUpgrade}>
            Upgrade to Team
          </button>
        </div>
      )}

      {entitlement.status === 'past_due' && (
        <div class="warn">
          <strong>A payment did not go through.</strong> The shared workspace is read-only
          until it is sorted out. Nobody&rsquo;s highlights have been deleted, and the local
          copies are untouched.
        </div>
      )}

      <div class="filters">
        <input
          type="search"
          placeholder={activeTab === 'mine' ? 'Search your highlights' : 'Search the workspace'}
          value={query}
          onInput={(event) => setQuery((event.currentTarget as HTMLInputElement).value)}
        />
        {activeTab === 'team' && (
          <>
            <select
              aria-label="Filter by space"
              value={spaceId}
              onChange={(event) => setSpaceId((event.currentTarget as HTMLSelectElement).value)}
            >
              <option value="">Every space</option>
              {allSpaces().map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by person"
              value={authorId}
              onChange={(event) => setAuthorId((event.currentTarget as HTMLSelectElement).value)}
            >
              <option value="">Anyone</option>
              {allMembers()
                .filter((member) => member.seatActive)
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.id === YOU ? 'You' : member.name}
                  </option>
                ))}
            </select>
          </>
        )}
      </div>

      {added.length > 0 && (
        <p class="also-matched">Also matched on: {added.join(', ')}.</p>
      )}

      {tags.length > 0 && (
        <div class="tag-row">
          {tags.map(([label, count]) => (
            <button
              key={label}
              type="button"
              class={tag.toLowerCase() === label.toLowerCase() ? 'chip chip-on' : 'chip'}
              onClick={() => setTag(tag.toLowerCase() === label.toLowerCase() ? '' : label)}
            >
              #{label} <span class="chip-count">{count}</span>
            </button>
          ))}
          {tag && (
            <button type="button" class="chip" onClick={() => setTag('')}>
              Clear
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p class="empty">
          {/* An empty shelf and an empty result are different things to be told. */}
          {pool.length === 0
            ? activeTab === 'mine'
              ? 'You have not kept anything yet. Highlight something and it lands here.'
              : 'Nothing has been shared yet. Share one of yours from the Mine tab.'
            : activeTab === 'mine'
              ? 'Nothing of yours matches that.'
              : 'Nothing shared matches that.'}
        </p>
      ) : (
        <div class="feed">
          {filtered.map((mark) => (
            <MarkCard key={mark.id} mark={mark} shared={shared} canWrite={writable} />
          ))}
        </div>
      )}

      {shared && activeTab === 'mine' && (
        <p class="subtle footnote">
          Everything here is private to you. <strong>Share with the team</strong> on any
          card puts it in a space, where the people in that space can read it and reply;{' '}
          <strong>Make private</strong> takes it straight back. The highlight itself never
          moves — only who can see it changes.
        </p>
      )}
    </section>
  );
}
