import { useState } from 'preact/hooks';
import { linkToMark } from '../../src/core/link';
import { siteLabel } from '../../src/core/sites';
import { YOU, memberById } from './demo';
import {
  allSpaces,
  comment as addComment,
  deleteComment,
  deleteMark,
  editComment,
  editNote,
  setResolved,
  shareMark,
  spaceOf,
  unshareMark,
} from './store';
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
      style={{ background: `hsl(${member.hue} 62% 46%)` }}
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
}: {
  mark: TeamMark;
  /** Whether the workspace is shared; off on the free plan, where only yours exist. */
  shared: boolean;
  canWrite: boolean;
}) {
  const author = memberById(mark.authorId);
  const space = spaceOf(mark.spaceId);
  const mine = mark.authorId === YOU;
  const comments = mark.comments ?? [];

  // The thread stays shut until it is asked for. A feed where every card is
  // also an open conversation is a feed nobody reads to the bottom.
  const [openThread, setOpenThread] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(mark.note ?? '');
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
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

  const threadLabel = mark.resolved
    ? 'Settled'
    : comments.length === 0
      ? 'Reply'
      : `${comments.length} ${comments.length === 1 ? 'reply' : 'replies'}`;

  return (
    <article class={mark.resolved ? 'mark mark-resolved' : 'mark'}>
      <header class="mark-top">
        {shared && <Avatar member={author} />}
        <div class="mark-who">
          {shared && (
            <strong>
              {author.name}
              {mine && <span class="you">you</span>}
            </strong>
          )}
          <span class="mark-meta">
            {siteLabel(mark)} · {mark.conversationTitle} · {timeAgo(mark.createdAt)}
          </span>
        </div>
        {space ? (
          <span class="chip chip-space">{space.name}</span>
        ) : (
          <span class="chip chip-private">Only you</span>
        )}
      </header>

      <blockquote class={`mark-quote mark-${mark.color}`} title={COLOR_LABELS[mark.color]}>
        {mark.snapshot}
      </blockquote>

      {editingNote ? (
        <form
          class="note-edit"
          onSubmit={(event) => {
            event.preventDefault();
            editNote(mark.id, noteDraft);
            setEditingNote(false);
          }}
        >
          <input
            type="text"
            aria-label="Your note on this highlight"
            placeholder="Why this mattered"
            value={noteDraft}
            onInput={(event) => setNoteDraft((event.currentTarget as HTMLInputElement).value)}
          />
          <button type="submit" class="action">
            Save
          </button>
          <button
            type="button"
            class="action"
            onClick={() => {
              setNoteDraft(mark.note ?? '');
              setEditingNote(false);
            }}
          >
            Cancel
          </button>
        </form>
      ) : (
        mark.note && <p class="mark-note">{mark.note}</p>
      )}

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

        {/* Your own highlight is yours to change on any plan, and whatever the
            billing is doing: the local copy belongs to whoever made it. Only the
            shared actions below wait on canWrite. */}
        {mine && !editingNote && (
          <button type="button" class="action" onClick={() => setEditingNote(true)}>
            {mark.note ? 'Edit note' : 'Add a note'}
          </button>
        )}

        {shared && canWrite && !mark.spaceId && (
          <select
            class="action action-select"
            aria-label="Share this highlight to a space"
            value=""
            onChange={(event) => {
              const select = event.currentTarget as HTMLSelectElement;
              if (select.value) shareMark(mark.id, select.value);
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

        {shared && canWrite && mark.spaceId && (
          <button type="button" class="action" onClick={() => unshareMark(mark.id)}>
            Make it mine again
          </button>
        )}

        {shared && (
          <button
            type="button"
            class={openThread ? 'action action-on' : 'action'}
            aria-expanded={openThread}
            onClick={() => setOpenThread(!openThread)}
          >
            {threadLabel}
          </button>
        )}

        {mine && (
          <button type="button" class="action action-danger" onClick={() => deleteMark(mark.id)}>
            Delete
          </button>
        )}
      </footer>

      {shared && openThread && (
        <div class="thread">
          {comments.length === 0 && (
            <p class="subtle">
              Nothing said yet, and this is the place to say it. A highlight somebody has to
              go and find in Slack is a highlight nobody discusses.
            </p>
          )}

          {comments.length > 0 && (
            <ul class="comments">
              {comments.map((entry) => {
                const who = memberById(entry.authorId);
                const ownReply = entry.authorId === YOU;
                return (
                  <li key={entry.id}>
                    <Avatar member={who} small />
                    <div>
                      <strong>{who.name}</strong>{' '}
                      <span class="mark-meta">
                        {timeAgo(entry.createdAt)}
                        {entry.editedAt ? ' · edited' : ''}
                      </span>
                      {editingReply === entry.id ? (
                        <form
                          class="note-edit"
                          onSubmit={(event) => {
                            event.preventDefault();
                            if (!replyDraft.trim()) return;
                            editComment(mark.id, entry.id, replyDraft.trim());
                            setEditingReply(null);
                          }}
                        >
                          <input
                            type="text"
                            aria-label="Edit your reply"
                            value={replyDraft}
                            onInput={(event) =>
                              setReplyDraft((event.currentTarget as HTMLInputElement).value)
                            }
                          />
                          <button type="submit" class="action">
                            Save
                          </button>
                          <button type="button" class="action" onClick={() => setEditingReply(null)}>
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <>
                          <p>{entry.body}</p>
                          {ownReply && canWrite && !mark.resolved && (
                            <div class="reply-actions">
                              <button
                                type="button"
                                class="link-button"
                                onClick={() => {
                                  setReplyDraft(entry.body);
                                  setEditingReply(entry.id);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                class="link-button"
                                onClick={() => deleteComment(mark.id, entry.id)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {canWrite && !mark.resolved && (
            <form
              class="comment-form"
              onSubmit={(event) => {
                event.preventDefault();
                const body = draft.trim();
                if (!body) return;
                addComment(mark.id, body);
                setDraft('');
              }}
            >
              <input
                type="text"
                aria-label="Write a reply"
                placeholder="Reply to this highlight"
                value={draft}
                onInput={(event) => setDraft((event.currentTarget as HTMLInputElement).value)}
              />
              <button type="submit" class="action" disabled={!draft.trim()}>
                Post
              </button>
            </form>
          )}

          {canWrite && comments.length > 0 && (
            <button
              type="button"
              class="action thread-settle"
              onClick={() => setResolved(mark.id, !mark.resolved)}
            >
              {mark.resolved ? 'Reopen this thread' : 'Settle this thread'}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
