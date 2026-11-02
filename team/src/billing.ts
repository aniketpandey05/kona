import { PLANS } from '../../src/core/plans';
import type { PlanId } from './types';

/**
 * Checkout, as far as a demo can take it.
 *
 * With a Stripe payment link configured this really does hand off to Stripe,
 * put a test-mode link in `VITE_STRIPE_PAYMENT_LINK` and the Upgrade button
 * leaves for Stripe's hosted page, which is the whole point of Checkout: card
 * details never touch us, so we stay in PCI SAQ-A scope.
 *
 * Without one it falls back to a local stand-in that walks the same steps, so
 * the demo works on a laptop with no keys and no account. The fallback says so
 * on screen; it is never presented as a real payment.
 */

interface TeamEnv {
  VITE_STRIPE_PAYMENT_LINK?: string;
}

// Read defensively: this file is type-checked by the extension's tsconfig,
// which does not pull in Vite's client types.
const env: TeamEnv = (import.meta as unknown as { env?: TeamEnv }).env ?? {};

const PAYMENT_LINK = (env.VITE_STRIPE_PAYMENT_LINK ?? '').trim();

/** The workspace a payment belongs to; Stripe echoes it back on the webhook. */
export const WORKSPACE_REF = 'ws_meridian';

/** Stripe's published test card. Safe to show, and only ever works in test mode. */
export const TEST_CARD = {
  number: '4242 4242 4242 4242',
  expiry: '12 / 34',
  cvc: '123',
};

export function stripeConfigured(): boolean {
  return PAYMENT_LINK.startsWith('https://');
}

/**
 * Where Upgrade should go. A payment link takes `client_reference_id` so the
 * webhook can tell which workspace paid; seat count is adjusted on Stripe's
 * own page when the link has adjustable quantity turned on.
 */
export function checkoutHref(email: string): string | null {
  if (!stripeConfigured()) return null;
  const url = new URL(PAYMENT_LINK);
  url.searchParams.set('client_reference_id', WORKSPACE_REF);
  if (email) url.searchParams.set('prefilled_email', email);
  return url.toString();
}

export interface Tier {
  id: PlanId | 'pro' | 'enterprise';
  name: string;
  price: string;
  cadence: string;
  pitch: string;
  features: string[];
  /** Only the two the demo can actually switch between are actionable. */
  action: 'current' | 'upgrade' | 'contact' | 'none';
}

/**
 * What each tier is, taken from the one place that says so.
 *
 * This used to be a fourth hand-written copy of the price list, beside
 * `src/core/plans.ts`, the landing page and the extension's own Plans page.
 * It drifted, as a fourth copy does: it was still selling Slack and Notion
 * sync and still telling people nothing is ever taken out of Free, after
 * both had stopped being true. Somebody clicking Pricing and then Try the
 * demo saw two different products.
 *
 * All the demo adds is which button each tier gets.
 */
const ACTION: Record<string, Tier['action']> = {
  free: 'none',
  pro: 'none',
  team: 'upgrade',
  enterprise: 'contact',
};

export const TIERS: Tier[] = PLANS.map((plan) => ({
  id: plan.id,
  name: plan.name,
  price: plan.price,
  cadence: plan.per,
  pitch: plan.pitch,
  features: [...plan.included],
  action: ACTION[plan.id] ?? 'none',
}));
