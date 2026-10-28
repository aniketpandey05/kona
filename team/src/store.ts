import { AUDIT, MARKS, MEMBERS, SPACES, YOU } from './demo';
import type { AuditEvent, Finding, Member, Space, Stance, TeamMark } from './types';

/**
 * The workspace as the demo can change it: share a highlight into a space, draw
 * a finding out of it, settle a question, invite someone — and watch the audit
 * log and the seat count follow.
 *
 * Deliberately in memory only. A reload puts the seeded workspace back, which
 * is what you want between takes of a screen recording; the chosen plan is the
 * one thing that persists, and the Reset button clears that too.
 */

let marks: TeamMark[] = MARKS.map((mark) => ({ ...mark }));
let members: Member[] = MEMBERS.map((member) => ({ ...member }));
let spaces: Space[] = SPACES.map((space) => ({
  ...space,
  findings: [...space.findings],
  openQuestions: [...space.openQuestions],
}));
let audit: AuditEvent[] = [...AUDIT];

export function allMarks(): readonly TeamMark[] {
  return marks;
}

export function allMembers(): readonly Member[] {
  return members;
}

export function allSpaces(): readonly Space[] {
  return spaces;
}

export function spaceOf(id: string | undefined): Space | undefined {
  return id ? spaces.find((space) => space.id === id) : undefined;
}

export function marksIn(spaceId: string): TeamMark[] {
  return marks
    .filter((mark) => mark.spaceId === spaceId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function marksByIds(ids: readonly string[]): TeamMark[] {
  return ids
    .map((id) => marks.find((mark) => mark.id === id))
    .filter((mark): mark is TeamMark => mark !== undefined);
}

export function auditEvents(): readonly AuditEvent[] {
  return [...audit].sort((a, b) => b.at - a.at);
}

/** Seats billed: an invited member who has not accepted does not hold one. */
export function activeSeats(): number {
  return members.filter((member) => member.seatActive).length;
}

// ---- highlights ----

export function shareMark(id: string, spaceId: string): void {
  marks = marks.map((mark) => (mark.id === id ? { ...mark, spaceId } : mark));
  log('highlight.shared', `Shared a highlight to "${spaceOf(spaceId)?.name ?? spaceId}"`);
}

export function unshareMark(id: string): void {
  marks = marks.map((mark) => (mark.id === id ? { ...mark, spaceId: undefined } : mark));
  log('highlight.unshared', 'Made a highlight private again');
}

export function comment(id: string, body: string): void {
  const now = Date.now();
  marks = marks.map((mark) =>
    mark.id === id
      ? {
          ...mark,
          comments: [
            ...(mark.comments ?? []),
            { id: `cm-${now}`, authorId: YOU, body, createdAt: now },
          ],
        }
      : mark,
  );
  log('comment.added', 'Commented on a highlight');
}

/** Only ever your own note; somebody else's wording is not yours to change. */
export function editNote(id: string, note: string): void {
  const trimmed = note.trim();
  marks = marks.map((mark) =>
    mark.id === id ? { ...mark, note: trimmed || undefined, updatedAt: Date.now() } : mark,
  );
  log('highlight.note_edited', trimmed ? 'Edited a note' : 'Cleared a note');
}

/**
 * Deleting leaves an Undo for a few seconds, the way it does in the extension.
 * Only one deletion is held at a time, which is all a few seconds needs.
 */
let lastDeleted: { mark: TeamMark; at: number } | null = null;

export function deleteMark(id: string): void {
  const mark = marks.find((entry) => entry.id === id);
  if (!mark) return;
  lastDeleted = { mark, at: Date.now() };
  marks = marks.filter((entry) => entry.id !== id);
  log('highlight.deleted', 'Deleted a highlight');
}

export function undoDelete(): void {
  if (!lastDeleted) return;
  marks = [...marks, lastDeleted.mark];
  lastDeleted = null;
  log('highlight.restored', 'Undid a deletion');
}

export function pendingUndo(): TeamMark | null {
  return lastDeleted?.mark ?? null;
}

export function clearUndo(): void {
  lastDeleted = null;
  notify();
}

export function editComment(markId: string, commentId: string, body: string): void {
  marks = marks.map((mark) =>
    mark.id === markId
      ? {
          ...mark,
          comments: (mark.comments ?? []).map((entry) =>
            entry.id === commentId ? { ...entry, body, editedAt: Date.now() } : entry,
          ),
        }
      : mark,
  );
  log('comment.edited', 'Edited a reply');
}

export function deleteComment(markId: string, commentId: string): void {
  marks = marks.map((mark) =>
    mark.id === markId
      ? { ...mark, comments: (mark.comments ?? []).filter((entry) => entry.id !== commentId) }
      : mark,
  );
  log('comment.deleted', 'Deleted a reply');
}

/** Calling a thread finished, so it stops asking for replies. */
export function setResolved(id: string, resolved: boolean): void {
  marks = marks.map((mark) => (mark.id === id ? { ...mark, resolved } : mark));
  log(resolved ? 'thread.resolved' : 'thread.reopened', resolved ? 'Settled a thread' : 'Reopened a thread');
}

// ---- spaces ----

function updateSpace(id: string, change: (space: Space) => Space): void {
  spaces = spaces.map((space) => (space.id === id ? change(space) : space));
}

/** Turning evidence into something the team now believes. */
export function addFinding(
  spaceId: string,
  claim: string,
  stance: Stance,
  markIds: readonly string[],
): void {
  const finding: Finding = {
    id: `f-${Date.now()}`,
    claim,
    stance,
    markIds: [...markIds],
    authorId: YOU,
    createdAt: Date.now(),
  };
  updateSpace(spaceId, (space) => ({ ...space, findings: [...space.findings, finding] }));
  log('finding.added', `Added a finding to "${spaceOf(spaceId)?.name ?? spaceId}"`);
}

export function addOpenQuestion(spaceId: string, text: string): void {
  updateSpace(spaceId, (space) => ({
    ...space,
    openQuestions: [...space.openQuestions, text],
  }));
  log('question.opened', `Opened a question in "${spaceOf(spaceId)?.name ?? spaceId}"`);
}

export function closeOpenQuestion(spaceId: string, index: number): void {
  updateSpace(spaceId, (space) => ({
    ...space,
    openQuestions: space.openQuestions.filter((_, i) => i !== index),
  }));
  log('question.closed', `Closed a question in "${spaceOf(spaceId)?.name ?? spaceId}"`);
}

export function recordDecision(spaceId: string, body: string): void {
  updateSpace(spaceId, (space) => ({
    ...space,
    decision: { body, decidedBy: YOU, decidedAt: Date.now() },
  }));
  log('decision.recorded', `Recorded the decision in "${spaceOf(spaceId)?.name ?? spaceId}"`);
}

export function reopenSpace(spaceId: string): void {
  updateSpace(spaceId, (space) => ({ ...space, decision: undefined }));
  log('decision.reopened', `Reopened "${spaceOf(spaceId)?.name ?? spaceId}"`);
}

// ---- members ----

export type InviteResult = { ok: true } | { ok: false; reason: string };

export function invite(email: string): InviteResult {
  const address = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    return { ok: false, reason: 'That does not look like an email address.' };
  }
  if (members.some((member) => member.email.toLowerCase() === address)) {
    return { ok: false, reason: 'That person is already in the workspace.' };
  }
  const name = address.split('@')[0] ?? address;
  members = [
    ...members,
    {
      id: `m-${Date.now()}`,
      name,
      email: address,
      role: 'member',
      initials: name.slice(0, 2).toUpperCase(),
      hue: (members.length * 47) % 360,
      // Invited, not accepted: no seat yet, so nothing is billed for them.
      seatActive: false,
    },
  ];
  log('member.invited', `Invited ${address} as member`);
  return { ok: true };
}

/** Accepting an invitation is what turns an invite into a billed seat. */
export function activateSeat(id: string): void {
  const member = members.find((entry) => entry.id === id);
  members = members.map((entry) => (entry.id === id ? { ...entry, seatActive: true } : entry));
  log('seat.activated', `${member?.email ?? id} accepted — seat count updated in Stripe`);
}

export function removeMember(id: string): void {
  const member = members.find((entry) => entry.id === id);
  members = members.filter((entry) => entry.id !== id);
  log('member.removed', `Removed ${member?.email ?? id}; their shared highlights stay`);
}

export function log(action: string, detail: string, actorId = YOU): void {
  audit = [
    ...audit,
    { id: `a-${Date.now()}-${audit.length}`, at: Date.now(), actorId, action, detail },
  ];
  notify();
}

const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach((listener) => listener());

export function watch(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}
