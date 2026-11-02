/**
 * What Kona costs, in one place.
 *
 * The extension's Plans page and the landing page both have to say the same
 * thing, and a price that disagrees with itself is worse than no price at all.
 * This is the copy of record; `site/index.html` mirrors it, and the comment
 * there says so.
 *
 * The honest part is `built`. Only Free exists, and `CURRENT_PLAN` says so:
 * there is no billing in here and nothing asks anyone for money.
 *
 * Which means something has to be said out loud rather than left to be
 * discovered. Sync and shared spaces are listed under Pro and Team, and both
 * are **built and running today**, ahead of any way to pay for them. They are
 * where the line will fall once the paid tiers exist, not a gate that is
 * closed now. `SHIPPED_AHEAD` is that sentence, kept here so the extension and
 * the site cannot tell two different stories about it.
 */

/** Said wherever a paid tier lists something that already works. */
export const SHIPPED_AHEAD =
  'Sync and shared spaces are built and working today, ahead of any billing. ' +
  'They are where the line will fall when Pro and Team exist, not something ' +
  'switched off now, and nothing you have already made stops working.';

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
    per: 'forever, on one device',
    pitch: 'Everything Kona does, on the device you read on, with no account.',
    included: [
      'Highlight anything you read, papers, docs, Stack Overflow, AI chats',
      'Unlimited highlights, notes and tags',
      'One searchable library across every site',
      'Search by meaning as well as by word, learned from your own library',
      'Links that land on the exact sentence, for people without Kona',
      'Spaces: a question, its evidence, and the write-up that comes out',
      'Markdown export, and a backup file to carry it to a new machine by hand',
      'Nothing leaves your computer',
    ],
    built: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$7',
    per: 'per month',
    pitch: 'The same library, on every device you read on.',
    included: [
      'Everything in Free',
      'Sync across your own devices, through a folder you already keep in step',
      'Every surface on one library, the extension, the phone app and the desktop app',
      'The desktop app, which keeps that folder in step with its window shut',
      'Or nothing to arrange at all: no folder to pick, no sync client of your own to run',
      'On a phone, and inside Safari and Firefox, where neither a folder nor an app reaches',
      'Meaning from a model too, so it knows words you have never kept together',
    ],
    built: false,
  },
  {
    id: 'team',
    name: 'Team',
    price: '$14',
    per: 'per user / month',
    pitch: 'The same spaces, with other people in them.',
    included: [
      'Everything in Pro',
      'Hand a space to a colleague as a file, and take it back with their work in it',
      'Discussion on a highlight, carried in the file and merged both ways',
      'Who found what and who concluded what, named in the write-up and signed with a key',
      'A shared folder that carries only the spaces you tick, and only the passages they cite',
      'A space that updates as people type, not as a sync client catches up',
      'Who may read and who may write, set per person and taken back when you need to',
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

export const TEAM_DEMO_URL = 'https://aniketpandey05.github.io/kona/team/#/tour';
export const PRICING_URL = 'https://aniketpandey05.github.io/kona/#pricing';
