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
      'Search by meaning as well as by word, learned from your own library',
      'Links that land on the exact sentence, for people without Kona',
      'Spaces: a question, its evidence, and the write-up that comes out',
      'Hand a space to anyone as a file, and take one back',
      'Discussion on a highlight, carried in the file and merged both ways',
      'Who found what and who concluded what, named in the write-up',
      'Everything you write in a space is signed, so a copy coming back is provably theirs',
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
      'Nothing to arrange: no folder to pick, no sync client of your own to keep running',
      'On a phone, in Safari and in Firefox, where a folder cannot reach',
      'Meaning from a model too, so it knows words you have never kept together',
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
      'A space that updates as people type, not as a sync client catches up',
      'Permissions, and taking access away again',
      'Names your organisation vouches for, rather than ones you took on trust the first time',
      "Search that runs over everyone's highlights, not only your own",
      'Admin console and seats',
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
