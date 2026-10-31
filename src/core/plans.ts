/**
 * What Kona costs, in one place.
 *
 * The extension's Plans page and the landing page both have to say the same
 * thing, and a price that disagrees with itself is worse than no price at all.
 * This is the copy of record; `site/index.html` mirrors it, and the comment
 * there says so.
 *
 * The honest part is `built`. Only Free exists. The rest is written down
 * because a plan you can read is worth more than a plan you are told about,
 * but the page says plainly that it is not here yet, and nothing in the
 * extension asks anyone for money.
 */

export type PlanId = 'free' | 'pro' | 'team' | 'enterprise';

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  per: string;
  /** One line on who it is for. */
  pitch: string;
  /** What this plan adds. The first line says what it inherits. */
  included: readonly string[];
  built: boolean;
}

/** The plan the extension actually runs on. There is no billing in here. */
export const CURRENT_PLAN: PlanId = 'free';

export const PLANS: readonly Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    per: 'forever, for one person',
    pitch: 'Everything Kona does, on your own computer, with no account.',
    included: [
      'Highlight anything you read — papers, docs, Stack Overflow, AI chats',
      'Unlimited highlights, notes and tags',
      'One searchable library across every site',
      'Links that land on the exact sentence, for people without Kona',
      'Spaces: a question, its evidence, and the write-up that comes out',
      'Hand a space to anyone as a file, and take one back',
      'Discussion on a highlight, carried in the file and merged both ways',
      'Who found what and who concluded what, named in the write-up',
      'Markdown export and backups',
      'Nothing leaves your computer',
    ],
    built: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$7',
    per: 'per month',
    pitch: 'The same thing, on all of your own devices.',
    included: [
      'Everything in Free',
      'Sync across your own devices',
      'Hybrid search over your own highlights — meaning as well as words',
      'Highlights from your phone, through the share sheet',
    ],
    built: false,
  },
  {
    id: 'team',
    name: 'Team',
    price: '$14',
    per: 'per user / month',
    pitch: 'The same spaces, live — so nobody is passing a file around.',
    included: [
      'Everything in Pro',
      'One space several people work in at once, with no file to send',
      'Replies that arrive when they are written, not when the file does',
      'Names there is an account behind, rather than ones people type',
      'Hybrid search across the whole workspace',
      'Admin console, seats and permissions',
    ],
    built: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'from $25',
    per: 'per user / month, annual',
    pitch: 'For a security review that has to pass.',
    included: [
      'Everything in Team',
      'SSO (SAML / OIDC) and SCIM provisioning',
      'Audit log with export, retention policy, legal hold',
      'Your own search index, inside your residency region',
      'EU or US data residency, DPA, SLA',
      'Self-hosted or VPC deployment',
    ],
    built: false,
  },
];

export const TEAM_DEMO_URL = 'https://aniketpandey05.github.io/kona/team/';
export const PRICING_URL = 'https://aniketpandey05.github.io/kona/#pricing';
