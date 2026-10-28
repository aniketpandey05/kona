import { useMemo, useState } from 'preact/hooks';
import { countTags } from '../../../src/core/tags';
import { searchMarks } from '../../../src/core/search';
import { toMarkdown } from '../../../src/core/markdown';
import { MarkCard } from '../components';
import { YOU, memberById } from '../demo';
import { canWrite, isTeam } from '../entitlement';
import { allMarks, allMembers, allSpaces, comment, shareMark, unshareMark } from '../store';
import type { Entitlement, TeamMark } from '../types';

export function Workspace({
  entitlement,
  onUpgrade,
}: {
  entitlement: Entitlement;
  onUpgrade: () => void;
}) {
  const shared = isTeam(entitlement);
  const writable = canWrite(entitlement);

  const [query, setQuery] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [tag, setTag] = useState('');

  const everything = allMarks();

  // The free tier is the same workspace with only your own highlights in it.
  // Nothing is deleted or withheld — there is simply no shared layer yet.
  const pool = useMemo(
    () => (shared ? everything : everything.filter((mark) => mark.authorId === YOU)),
    [everything, shared],
  );

  const hiddenCount = everything.length - everything.filter((mark) => mark.authorId === YOU).length;
  const colleagues = new Set(
    everything.filter((mark) => mark.authorId !== YOU).map((mark) => mark.authorId),
  ).size;

  const filtered = useMemo(() => {
    let list = pool;
    if (spaceId) list = list.filter((mark) => mark.spaceId === spaceId);
    if (authorId) list = list.filter((mark) => mark.authorId === authorId);
    if (tag) {
      list = list.filter((mark) =>
        (mark.tags ?? []).some((entry) => entry.toLowerCase() === tag.toLowerCase()),
      );
    }
    // searchMarks returns the same objects it was given, so they are still TeamMarks.
    const ranked = (query.trim() ? searchMarks(list, query) : [...list]) as TeamMark[];
    return query.trim() ? ranked : ranked.sort((a, b) => b.createdAt - a.createdAt);
  }, [pool, spaceId, authorId, tag, query]);

  const tags = useMemo(() => countTags(pool).slice(0, 10), [pool]);

  const exportMarkdown = (): void => {
    const blob = new Blob([toMarkdown(filtered)], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'kona-workspace.md';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section>
      <div class="view-top">
        <div>
          <h1>{shared ? 'Workspace' : 'Your highlights'}</h1>
          <p class="subtle">
            {shared
              ? `${everything.length} highlights from ${allMembers().filter((m) => m.seatActive).length} people`
              : `${pool.length} highlights, on this computer only`}
          </p>
        </div>
        <button type="button" class="action" onClick={exportMarkdown} disabled={filtered.length === 0}>
          Export Markdown
        </button>
      </div>

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
          placeholder={shared ? 'Search the whole workspace' : 'Search your highlights'}
          value={query}
          onInput={(event) => setQuery((event.currentTarget as HTMLInputElement).value)}
        />
        {shared && (
          <>
            <select
              value={spaceId}
              onChange={(event) =>
                setSpaceId((event.currentTarget as HTMLSelectElement).value)
              }
            >
              <option value="">Every space</option>
              {allSpaces().map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
            <select
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

      {tags.length > 0 && (
        <div class="tag-row">
          <button
            type="button"
            class={tag === '' ? 'chip chip-on' : 'chip'}
            onClick={() => setTag('')}
          >
            All tags
          </button>
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
        </div>
      )}

      {filtered.length === 0 ? (
        <p class="empty">Nothing matches that.</p>
      ) : (
        <div class="feed">
          {filtered.map((mark) => (
            <MarkCard
              key={mark.id}
              mark={mark}
              shared={shared}
              canWrite={writable}
              onShare={shareMark}
              onUnshare={unshareMark}
              onComment={comment}
            />
          ))}
        </div>
      )}

      {shared && (
        <p class="subtle footnote">
          Highlights stay where they were made. Sharing one puts it in a space; it is
          still the same highlight, with the same link back to the sentence it came from.
          {authorId && authorId !== YOU && ` Showing ${memberById(authorId).name} only.`}
        </p>
      )}
    </section>
  );
}
