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
 * `SHIPPED_AHEAD` used to live here: a promise that sync and shared spaces
 * would not be switched off later, shown on the extension's Plans page and the
 * landing page. The tier decision (11) contradicts it, limits exist on Free
 * so that rung is felt, and 3c took the Plans page out of the extension
 * entirely, which left the sentence with nowhere to be said and nobody relying
 * on it. Removed rather than left as a promise the product no longer makes.
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
    per: 'forever, on one device',
    pitch: 'Alone, on one device, with no account at all.',
    included: [
      'Highlight anything you read, papers, docs, Stack Overflow, AI chats',
      'Unlimited highlights, notes and tags',
      'One searchable library across every site, searched by word',
      'Links that land on the exact sentence, for people without Kona',
      'Five spaces, for gathering highlights about one topic across many pages',
      'Fifteen highlights put out of the way at a time',
      'Markdown export, and a backup file to carry it to a new machine by hand',
      'Nothing leaves your computer, because there is nowhere for it to go',
    ],
    built: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$30',
    per: 'a year, or $3 a month',
    pitch: 'The same library, on every device you read on.',
    included: [
      'Everything in Free',
      'Sync across your own devices, through a folder you already keep in step',
      'Every surface on one library, the extension, the phone app and the desktop app',
      'Or nothing to arrange at all: no folder to pick, no sync client of your own to run',
      'On a phone, and inside Safari and Firefox, where neither a folder nor an app reaches',
      'Meaning from a model too, so it knows words you have never kept together',
    ],
    built: false,
  },
  {
    id: 'team',
    name: 'Team',
    price: 'Not set',
    per: 'per seat, once there is a seat',
    pitch: 'The same spaces, with other people in them.',
    included: [
      'Everything in Pro',
      'Hand a space to a colleague as a file, and take it back with their work in it',
      'Discussion on a highlight, carried in the file and merged both ways',
      'Who gathered what, signed with a key made on your own computer',
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

/**
 * Whether anything above Free can actually be bought.
 *
 * **False, and it is the server that makes it false.** 5's account and 6's
 * sync both need one, 8 cannot price Team until the running cost is known,
 * and nothing in here takes a card. Everywhere a cap is felt (25) reads this
 * rather than asserting that Pro is there to be had, so the day a tier ships
 * one flag changes every sentence that offers it, and none of them is left
 * pointing at a checkout that does not exist.
 *
 * The same defect, twice removed from this product already: a README that
 * promised what was not built, and release notes still promising archiving a
 * version after it shipped. A wall saying *or Pro* is the third form of it,
 * and the worst placed, because it is read by somebody who has just been
 * stopped and is looking for the way out.
 */
export const CAN_BUY: boolean = PLANS.some((plan) => plan.id !== 'free' && plan.built);

/**
 * The clause to say instead, where a paid tier would have been offered.
 *
 * One wording, in one place, so the two walls cannot drift apart or each
 * invent their own apology.
 */
export const NOT_YET = 'which is not ready to buy yet';

/**
 * Where Kona is published, once it is.
 *
 * Empty until the listing is live. The landing page shows "Add to Chrome" when
 * this is set and the build-it-yourself route when it is not, so publishing is
 * one edit here rather than a hunt through the HTML.
 */
export const CHROME_STORE_URL = '';

export const TEAM_DEMO_URL = 'https://aniketpandey05.github.io/kona/team/#/tour';
export const PRICING_URL = 'https://aniketpandey05.github.io/kona/#pricing';
