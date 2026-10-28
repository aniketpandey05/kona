import type { Entitlement, PlanId } from './types';

/**
 * What the client is allowed to do, and nothing else. The real product issues
 * this as a short-lived token signed by the billing service, which the client
 * caches — so Stripe or the API being down never locks a paying customer out
 * of their own highlights (docs/enterprise.md §6).
 *
 * Here it lives in localStorage so the demo survives a reload and can be reset
 * between takes. There is no server and no real signature.
 */

const KEY = 'kona:team:entitlement';
const TOKEN_LIFETIME = 24 * 60 * 60 * 1000;
const PERIOD = 30 * 24 * 60 * 60 * 1000;

export const FREE: Entitlement = {
  plan: 'free',
  seats: 1,
  status: 'none',
  periodEnd: 0,
  issuedAt: 0,
  expiresAt: 0,
};

export function load(): Entitlement {
  try {
    const stored = localStorage.getItem(KEY);
    if (!stored) return FREE;
    const parsed = JSON.parse(stored) as Partial<Entitlement>;
    if (parsed.plan !== 'team') return FREE;
    return {
      plan: 'team',
      seats: typeof parsed.seats === 'number' ? parsed.seats : 5,
      status: parsed.status === 'past_due' ? 'past_due' : 'active',
      periodEnd: parsed.periodEnd ?? Date.now() + PERIOD,
      issuedAt: parsed.issuedAt ?? Date.now(),
      expiresAt: parsed.expiresAt ?? Date.now() + TOKEN_LIFETIME,
    };
  } catch {
    // Private browsing can refuse storage outright. Falling back to the free
    // plan is the safe direction to fail in.
    return FREE;
  }
}

function save(entitlement: Entitlement): void {
  try {
    if (entitlement.plan === 'free') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(entitlement));
  } catch {
    // Not remembering the plan is survivable for a demo; crashing is not.
  }
  notify();
}

/** What a successful checkout webhook would write. */
export function grantTeam(seats: number): Entitlement {
  const issuedAt = Date.now();
  const entitlement: Entitlement = {
    plan: 'team',
    seats,
    status: 'active',
    periodEnd: issuedAt + PERIOD,
    issuedAt,
    expiresAt: issuedAt + TOKEN_LIFETIME,
  };
  save(entitlement);
  return entitlement;
}

/** What `invoice.payment_failed` would write: still readable, inside the grace period. */
export function markPastDue(): Entitlement {
  const current = load();
  if (current.plan !== 'team') return current;
  const entitlement: Entitlement = { ...current, status: 'past_due' };
  save(entitlement);
  return entitlement;
}

export function downgrade(): Entitlement {
  save(FREE);
  return FREE;
}

export function setSeats(seats: number): Entitlement {
  const current = load();
  if (current.plan !== 'team') return current;
  const entitlement: Entitlement = { ...current, seats: Math.max(1, seats) };
  save(entitlement);
  return entitlement;
}

export function isTeam(entitlement: Entitlement): boolean {
  return entitlement.plan === 'team';
}

/** Shared features stay readable but go read-only once a payment has failed. */
export function canWrite(entitlement: Entitlement): boolean {
  return entitlement.plan === 'team' && entitlement.status === 'active';
}

export function planLabel(plan: PlanId): string {
  return plan === 'team' ? 'Team' : 'Free';
}

/**
 * The token the client would be holding, rendered so the demo can show it.
 * Real tokens are signed with an asymmetric key the client only verifies; the
 * signature here is a placeholder and says so.
 */
export function tokenFor(entitlement: Entitlement): string {
  const header = { alg: 'EdDSA', typ: 'JWT', kid: 'ent-2026-10' };
  const payload = {
    sub: 'ws_meridian',
    plan: entitlement.plan,
    seats: entitlement.seats,
    status: entitlement.status,
    iat: Math.floor(entitlement.issuedAt / 1000),
    exp: Math.floor(entitlement.expiresAt / 1000),
  };
  return `${b64(header)}.${b64(payload)}.DEMO_NOT_SIGNED`;
}

function b64(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach((listener) => listener());

export function watch(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}
