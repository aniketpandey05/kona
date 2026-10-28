import type { PlanId } from './types';

/**
 * Checkout, as far as a demo can take it.
 *
 * With a Stripe payment link configured this really does hand off to Stripe —
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

export const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    pitch: 'Everything Kona does today, on your own computer, with no account.',
    features: [
      'Unlimited highlights, notes and tags',
      'One searchable library across every site',
      'Links back to the exact sentence',
      'Markdown export and backups',
      'Nothing leaves your computer',
    ],
    action: 'none',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$7',
    cadence: 'per month',
    pitch: 'The same thing, on all of your own devices.',
    features: [
      'Everything in Free',
      'Sync across your own devices',
      'Semantic search over your own highlights — by meaning, not wording',
      'Unlimited private collections',
    ],
    action: 'none',
  },
  {
    id: 'team',
    name: 'Team',
    price: '$14',
    cadence: 'per user / month',
    pitch: 'Where your team works on a question together.',
    features: [
      'Everything in Pro',
      'Shared spaces: a question, its evidence, and what was decided',
      'Write-ups where every claim cites the exact sentence',
      'Comments on any highlight',
      'Semantic search across the whole workspace',
      'Slack, Notion and Obsidian sync',
      'Admin console and seat management',
    ],
    action: 'upgrade',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'from $25',
    cadence: 'per user / month, annual',
    pitch: 'For a security review that has to pass.',
    features: [
      'Everything in Team',
      'SSO (SAML / OIDC) and SCIM provisioning',
      'Audit log with export',
      'Retention policy and legal hold',
      'EU or US data residency, DPA, SLA',
      'Self-hosted or VPC deployment',
    ],
    action: 'contact',
  },
];
