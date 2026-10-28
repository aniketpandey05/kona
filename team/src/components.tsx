import { useState } from 'preact/hooks';
import { linkToMark } from '../../src/core/link';
import { siteLabel } from '../../src/core/sites';
import { memberById } from './demo';
import { allSpaces, spaceOf } from './store';
import type { HighlightColor } from '../../src/core/types';
import type { Member, Space, TeamMark } from './types';

export function timeAgo(at: number): string {
  const seconds = Math.max(1, Math.round((Date.now() - at) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * A space with a decision is settled, a space still asking is open, and a space
 * that never asked anything is a shelf. Shown as a word rather than a colour so
 * it reads the same to everyone.
 */
export function spaceStatus(space: Space): { label: string; tone: 'settled' | 'open' | 'shelf' } {
  if (!space.question) return { label: 'Shelf', tone: 'shelf' };
  if (space.decision) return { label: 'Settled', tone: 'settled' };
  return { label: 'Open', tone: 'open' };
}

export function Avatar({ member, small = false }: { member: Member; small?: boolean }) {
  return (
    <span
      class={small ? 'avatar avatar-small' : 'avatar'}
      style={{
        background: `hsl(${member.hue} 62% 46%)`,
      }}
      title={`${member.name} · ${member.email}`}
    >
      {member.initials}
    </span>
  );
}

/** What a locked feature shows instead of itself. */
export function Locked({
  title,
  body,
  onUpgrade,
}: {
  title: string;
  body: string;
  onUpgrade: () => void;
}) {
  return (
    <div class="locked">
      <div class="locked-badge">Team</div>
      <h2>{title}</h2>
      <p>{body}</p>
      <button type="button" class="primary" onClick={onUpgrade}>
        See what Team costs
      </button>
    </div>
  );
}

const COLOR_LABELS: Record<HighlightColor, string> = {
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  pink: 'Pink',
};

export function MarkCard({
  mark,
  shared,
  canWrite,
  onShare,
  onUnshare,
  onComment,
}: {
  mark: TeamMark;
  /** Whether the workspace view is on; off in the free tier, where only your own show. */
  shared: boolean;
  canWrite: boolean;
  onShare?: (id: string, collectionId: string) => void;
  onUnshare?: (id: string) => void;
  onComment?: (id: string, body: string) => void;
}) {
  const author = memberById(mark.authorId);
  const space = spaceOf(mark.spaceId);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const link = linkToMark(mark);

  const copy = (): void => {
    void navigator.clipboard?.writeText(link).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      },
      () => {
        // Clipboard permission can be refused; the link is on screen anyway.
      },
    );
  };

  return (
    <article class="mark">
      <header class="mark-top">
        {shared && <Avatar member={author} />}
        <div class="mark-who">
          {shared && <strong>{author.name}</strong>}
          <span class="mark-meta">
            {siteLabel(mark)} · {mark.conversationTitle} · {timeAgo(mark.createdAt)}
          </span>
        </div>
        {space ? (
          <span class="chip chip-space">{space.name}</span>
        ) : (
          <span class="chip chip-private">Private</span>
        )}
      </header>

      <blockquote class={`mark-quote mark-${mark.color}`} title={COLOR_LABELS[mark.color]}>
        {mark.snapshot}
      </blockquote>

      {mark.note && <p class="mark-note">{mark.note}</p>}

      {(mark.tags ?? []).length > 0 && (
        <div class="mark-tags">
          {(mark.tags ?? []).map((tag) => (
            <span key={tag} class="chip">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <footer class="mark-actions">
        <a class="action" href={link} target="_blank" rel="noreferrer noopener">
          Open the exact sentence
        </a>
        <button type="button" class="action" onClick={copy}>
          {copied ? 'Link copied' : 'Copy link'}
        </button>

        {shared && canWrite && !mark.spaceId && onShare && (
          <select
            class="action action-select"
            aria-label="Share this highlight to a space"
            value=""
            onChange={(event) => {
              const select = event.currentTarget as HTMLSelectElement;
              if (select.value) onShare(mark.id, select.value);
              select.value = '';
            }}
          >
            <option value="">Share to…</option>
            {allSpaces().map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        )}

        {shared && canWrite && mark.spaceId && onUnshare && (
          <button type="button" class="action" onClick={() => onUnshare(mark.id)}>
            Make private
          </button>
        )}
      </footer>

      {shared && (mark.comments ?? []).length > 0 && (
        <ul class="comments">
          {(mark.comments ?? []).map((entry) => {
            const who = memberById(entry.authorId);
            return (
              <li key={entry.id}>
                <Avatar member={who} small />
                <div>
                  <strong>{who.name}</strong> <span class="mark-meta">{timeAgo(entry.createdAt)}</span>
                  <p>{entry.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {shared && canWrite && onComment && (
        <form
          class="comment-form"
          onSubmit={(event) => {
            event.preventDefault();
            const body = draft.trim();
            if (!body) return;
            onComment(mark.id, body);
            setDraft('');
          }}
        >
          <input
            type="text"
            placeholder="Add a comment"
            value={draft}
            onInput={(event) => setDraft((event.currentTarget as HTMLInputElement).value)}
          />
          <button type="submit" class="action" disabled={!draft.trim()}>
            Post
          </button>
        </form>
      )}
    </article>
  );
}
