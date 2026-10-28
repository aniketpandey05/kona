import type { Mark } from '../../src/core/types';

/** The two plans this demo switches between. Pro and Enterprise are priced but not simulated. */
export type PlanId = 'free' | 'team';

export type MemberRole = 'owner' | 'admin' | 'member';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  initials: string;
  /** Avatar colour, so a face is recognisable down a long feed without loading an image. */
  hue: number;
  /** An invited member who has not accepted yet holds no seat, and so is not billed. */
  seatActive: boolean;
}

export interface Comment {
  id: string;
  authorId: string;
  body: string;
  createdAt: number;
  /** Set when it has been changed since, so a reader knows the wording moved. */
  editedAt?: number;
}

/**
 * A highlight as it appears in a shared workspace. Everything that makes a
 * highlight — the quote, the context, the link back — is the extension's
 * `Mark`, unchanged; sharing only adds who made it and where it was put.
 */
export interface TeamMark extends Mark {
  authorId: string;
  /**
   * Absent until someone deliberately shares it. A highlight is private to the
   * person who made it first; putting it in a space is a separate decision,
   * taken after they have decided it is worth anyone else's time.
   */
  spaceId?: string;
  comments?: Comment[];
  /**
   * A thread somebody has called finished. It collapses and stops asking for
   * replies, the way a resolved thread does anywhere else.
   */
  resolved?: boolean;
}

/**
 * Where a claim sits relative to the question the space is asking. Marking the
 * ones that disagree is the point: a pile of evidence that all nods along is
 * usually a pile that stopped looking.
 */
export type Stance = 'supports' | 'contradicts' | 'open';

/**
 * Something the team now believes, and the highlights it rests on. The claim is
 * written by a person; the evidence is whatever anyone highlighted. Because each
 * piece of evidence is an ordinary Kona highlight, every claim can be followed
 * back to the exact sentence it came from.
 */
export interface Finding {
  id: string;
  claim: string;
  stance: Stance;
  /** Ids of the highlights this rests on; they may come from different people. */
  markIds: string[];
  authorId: string;
  createdAt: number;
}

export interface Decision {
  body: string;
  decidedBy: string;
  decidedAt: number;
}

/**
 * A shared space: the unit a team actually works in.
 *
 * With a `question` it is a piece of research — evidence gathered under
 * something the team is trying to settle, the things still unknown, and
 * eventually the decision that came out of it. Without one it is a shelf, like
 * a prompt library, where keeping the good ones together is the whole job.
 * Same object either way, which keeps there being one thing to explain.
 */
export interface Space {
  id: string;
  name: string;
  purpose: string;
  /** What the team is trying to settle. Absent on a shelf. */
  question?: string;
  memberIds: string[];
  findings: Finding[];
  /** What is still not known. The reason to come back to a space. */
  openQuestions: string[];
  decision?: Decision;
}

export interface AuditEvent {
  id: string;
  at: number;
  actorId: string;
  action: string;
  detail: string;
}

/**
 * What the client is allowed to do. In the real product this arrives as a
 * short-lived signed token the client caches, so a billing outage never locks
 * a paying customer out of their own highlights — see docs/enterprise.md §6.
 */
export interface Entitlement {
  plan: PlanId;
  seats: number;
  status: 'active' | 'past_due' | 'none';
  /** When the current billing period ends. */
  periodEnd: number;
  issuedAt: number;
  expiresAt: number;
}
