import type { AuditEvent, Member, Space, TeamMark } from './types';

/**
 * A fictional 70-person company's workspace, seeded so the demo has something
 * to show the moment it opens. Everything here is invented; no real
 * conversation, person or company appears in it.
 *
 * Times are relative to when the page loads, so the feed never looks stale in
 * a screen recording made months from now.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const now = Date.now();
const ago = (days: number, hours = 0): number => now - days * DAY - hours * HOUR;

export const YOU = 'm-priya';

export const MEMBERS: Member[] = [
  {
    id: YOU,
    name: 'Priya Raghavan',
    email: 'priya@meridian.example',
    role: 'owner',
    initials: 'PR',
    hue: 24,
    seatActive: true,
  },
  {
    id: 'm-tom',
    name: 'Tom Okafor',
    email: 'tom@meridian.example',
    role: 'admin',
    initials: 'TO',
    hue: 196,
    seatActive: true,
  },
  {
    id: 'm-lena',
    name: 'Lena Fischer',
    email: 'lena@meridian.example',
    role: 'member',
    initials: 'LF',
    hue: 268,
    seatActive: true,
  },
  {
    id: 'm-diego',
    name: 'Diego Marchetti',
    email: 'diego@meridian.example',
    role: 'member',
    initials: 'DM',
    hue: 142,
    seatActive: true,
  },
  {
    id: 'm-sarah',
    name: 'Sarah Kim',
    email: 'sarah@meridian.example',
    role: 'member',
    initials: 'SK',
    hue: 338,
    seatActive: true,
  },
  {
    id: 'm-noah',
    name: 'Noah Bergström',
    email: 'noah@meridian.example',
    role: 'member',
    initials: 'NB',
    hue: 48,
    // Invited, not accepted — holds no seat, so it is not billed.
    seatActive: false,
  },
];

/**
 * Five spaces: three asking a question, two that are only shelves. The
 * difference is the point — a shelf is where good things are kept, a question
 * is something a team is trying to settle, and both are the same object.
 */
export const SPACES: Space[] = [
  {
    id: 's-pg17',
    name: 'Postgres 17 upgrade',
    purpose: 'Everything anyone worked out while planning it.',
    question: 'Can we upgrade to Postgres 17 without downtime, and when?',
    memberIds: [YOU, 'm-tom', 'm-diego'],
    findings: [
      {
        id: 'f-pg-1',
        claim:
          'Link mode is much faster and uses far less disk, but a failure part-way through leaves the old cluster unusable as well — so it is only safe behind a verified backup.',
        stance: 'supports',
        markIds: ['k-01', 'k-06'],
        authorId: 'm-tom',
        createdAt: ago(8, 18),
      },
      {
        id: 'f-pg-2',
        claim:
          'Pausing the connection pool rather than stopping it turns the cutover into latency the clients absorb, instead of errors they report.',
        stance: 'supports',
        markIds: ['k-07'],
        authorId: YOU,
        createdAt: ago(2, 6),
      },
    ],
    openQuestions: ['How long does pg_upgrade actually take on 1.4TB? Diego is timing it.'],
    decision: {
      body: 'Going ahead in the first week of January, with --link behind a verified backup as a hard gate in the runbook. Diego owns the call to roll back.',
      decidedBy: YOU,
      decidedAt: ago(1, 10),
    },
  },
  {
    id: 's-pricing',
    name: 'What Team should cost',
    purpose: 'Working out the pricing before we commit to it in public.',
    question: 'Do we charge per seat, and at what price?',
    memberIds: [YOU, 'm-lena'],
    findings: [
      {
        id: 'f-pr-1',
        claim:
          'Size the market bottom-up. The published category totals bundle three different buyers together, and only one of them has the budget line we are selling into.',
        stance: 'supports',
        markIds: ['k-03'],
        authorId: 'm-lena',
        createdAt: ago(5, 5),
      },
      {
        id: 'f-pr-2',
        claim:
          'Per-seat pricing fails when the people who get the value are not the people who hold a seat — which is exactly our case, because one person highlighting benefits everyone reading.',
        stance: 'contradicts',
        markIds: ['k-13'],
        authorId: 'm-lena',
        createdAt: ago(0, 4),
      },
    ],
    openQuestions: [
      'Per seat, or per workspace with a seat cap?',
      'Should a read-only seat cost anything at all?',
    ],
  },
  {
    id: 's-policy',
    name: 'AI policy evidence',
    purpose: 'Which AI output was relied on for a decision, and where it came from.',
    question: 'What do we have to be able to show at the AI policy audit?',
    memberIds: [YOU, 'm-sarah'],
    findings: [
      {
        id: 'f-po-1',
        claim:
          'Sub-processors belong in an annex rather than the body of the agreement, so adding one needs notice instead of a signed amendment.',
        stance: 'supports',
        markIds: ['k-05'],
        authorId: 'm-sarah',
        createdAt: ago(3, 4),
      },
      {
        id: 'f-po-2',
        claim:
          'A retention policy that cannot be demonstrated is not a policy. Whatever window we choose, the control is the deletion job and the log proving it ran.',
        stance: 'supports',
        markIds: ['k-10'],
        authorId: 'm-sarah',
        createdAt: ago(1, 4),
      },
    ],
    openQuestions: ['Which retention window do we actually commit to in the DPA?'],
  },
  {
    id: 's-prompts',
    name: 'Prompts that worked',
    purpose: 'The ones worth running again, kept by whoever got them to work.',
    memberIds: [YOU, 'm-tom', 'm-lena', 'm-diego', 'm-sarah'],
    findings: [],
    openQuestions: [],
  },
  {
    id: 's-onboard',
    name: 'Onboarding: how we ship',
    purpose: 'What a new engineer needs in week one, in the words that explained it.',
    memberIds: [YOU, 'm-tom', 'm-diego', 'm-noah'],
    findings: [],
    openQuestions: [],
  },
];

/**
 * Highlights made by five people across the three chat sites and the open web.
 * The ones authored by YOU are what the free tier shows; the rest only appear
 * once the workspace is shared, which is the difference the demo is built to
 * make visible.
 */
export const MARKS: TeamMark[] = [
  {
    id: 'k-01',
    authorId: 'm-tom',
    spaceId: 's-pg17',
    site: 'claude',
    conversationId: 'conv-pg17',
    conversationTitle: 'Zero-downtime Postgres major upgrade',
    url: 'https://claude.ai/chat/conv-pg17',
    label: 'Claude',
    color: 'yellow',
    snapshot:
      'Run pg_upgrade with --link only after you have a verified physical backup: it hard-links the data files, so a failure part-way through leaves the old cluster unusable as well.',
    quote: {
      exact:
        'it hard-links the data files, so a failure part-way through leaves the old cluster unusable as well',
      prefix: 'verified physical backup: ',
      suffix: '. The safer order is',
      start: 94,
    },
    note: 'This is the bit that changed the plan — we were going to use --link with no backup step.',
    tags: ['postgres', 'migration', 'gotcha'],
    createdAt: ago(9, 3),
    updatedAt: ago(9, 3),
    comments: [
      {
        id: 'cm-1',
        authorId: 'm-diego',
        body: 'Added the backup verification to the runbook as a hard gate. Cannot be skipped now.',
        createdAt: ago(8, 20),
      },
    ],
  },
  {
    id: 'k-02',
    authorId: YOU,
    spaceId: 's-prompts',
    site: 'chatgpt',
    conversationId: 'conv-review',
    conversationTitle: 'Code review prompt, fourth attempt',
    url: 'https://chatgpt.com/c/conv-review',
    label: 'ChatGPT',
    color: 'green',
    snapshot:
      'Review this diff as if you will be on call for it. List only defects that would wake someone at 3am, ordered by how likely they are, and say what input triggers each one.',
    note: 'Fourth version. The "on call" framing is what stopped it listing style nits.',
    tags: ['prompt', 'code-review'],
    createdAt: ago(6, 1),
    updatedAt: ago(5, 2),
    comments: [
      {
        id: 'cm-2',
        authorId: 'm-tom',
        body: 'Stealing this. Works on migrations too if you swap "diff" for "migration".',
        createdAt: ago(5, 4),
      },
      {
        id: 'cm-3',
        authorId: 'm-lena',
        body: 'Same framing works for contract review. Changed 3am to "in front of a regulator".',
        createdAt: ago(4, 9),
      },
    ],
  },
  {
    id: 'k-03',
    authorId: 'm-lena',
    spaceId: 's-pricing',
    site: 'gemini',
    conversationId: 'conv-market',
    conversationTitle: 'Sizing the mid-market segment',
    url: 'https://gemini.google.com/app/conv-market',
    label: 'Gemini',
    color: 'blue',
    snapshot:
      'Bottom-up sizing beats top-down here because the published category totals bundle three different buyers together, and only one of them has the budget line you are selling into.',
    note: 'The reason our first deck was wrong. Kept it so I stop re-deriving it.',
    tags: ['research', 'sizing'],
    createdAt: ago(5, 7),
    updatedAt: ago(5, 7),
  },
  {
    id: 'k-04',
    authorId: 'm-diego',
    spaceId: 's-onboard',
    site: 'chatgpt',
    conversationId: 'conv-deploy',
    conversationTitle: 'Explaining our deploy to a new hire',
    url: 'https://chatgpt.com/c/conv-deploy',
    label: 'ChatGPT',
    color: 'yellow',
    snapshot:
      'A deploy is two independent steps that look like one: the image is built and pushed on merge, and the rollout is a separate manual promotion. Nothing reaches production because a branch merged.',
    note: 'Every new engineer assumes merge means live. This sentence saves the conversation.',
    tags: ['onboarding', 'deploys'],
    createdAt: ago(4, 2),
    updatedAt: ago(4, 2),
  },
  {
    id: 'k-05',
    authorId: 'm-sarah',
    spaceId: 's-policy',
    site: 'claude',
    conversationId: 'conv-dpa',
    conversationTitle: 'Sub-processor wording for the DPA',
    url: 'https://claude.ai/chat/conv-dpa',
    label: 'Claude',
    color: 'pink',
    snapshot:
      'Naming sub-processors in an annex rather than the body of the agreement lets you add one with notice instead of a signed amendment, which is the difference between a two-day change and a two-month change.',
    note: 'Relied on this for the DPA we sent Harbourline on the 14th. Decision record.',
    tags: ['legal', 'dpa', 'decision'],
    createdAt: ago(3, 5),
    updatedAt: ago(3, 5),
  },
  {
    id: 'k-06',
    authorId: 'm-tom',
    spaceId: 's-pg17',
    site: 'web',
    conversationId: 'doc-pg-upgrade',
    conversationTitle: 'pg_upgrade — PostgreSQL Documentation',
    url: 'https://www.postgresql.org/docs/17/pgupgrade.html',
    label: 'postgresql.org',
    color: 'blue',
    snapshot:
      'If you use link mode, the upgrade will be much faster and use less disk space, but you will not be able to access your old cluster once the new cluster is started.',
    note: 'The docs say the same thing Claude did. Both in the collection so nobody re-asks.',
    tags: ['postgres', 'migration'],
    createdAt: ago(3, 1),
    updatedAt: ago(3, 1),
  },
  {
    id: 'k-07',
    authorId: YOU,
    spaceId: 's-pg17',
    site: 'claude',
    conversationId: 'conv-pgbouncer',
    conversationTitle: 'Connection pooling during the cutover',
    url: 'https://claude.ai/chat/conv-pgbouncer',
    label: 'Claude',
    color: 'yellow',
    snapshot:
      'Pause the pool rather than stopping it. PAUSE holds new queries open at the proxy while in-flight ones drain, so clients see latency instead of errors, and RESUME picks up without a reconnect storm.',
    note: 'This is the whole cutover plan in two sentences.',
    tags: ['postgres', 'migration', 'pgbouncer'],
    createdAt: ago(2, 8),
    updatedAt: ago(2, 8),
    comments: [
      {
        id: 'cm-4',
        authorId: 'm-diego',
        body: 'Tested on staging Tuesday. 40 seconds of held queries, zero errors.',
        createdAt: ago(1, 14),
      },
    ],
  },
  {
    id: 'k-08',
    authorId: 'm-lena',
    spaceId: 's-prompts',
    site: 'chatgpt',
    conversationId: 'conv-interview',
    conversationTitle: 'Turning call notes into findings',
    url: 'https://chatgpt.com/c/conv-interview',
    label: 'ChatGPT',
    color: 'green',
    snapshot:
      'Separate what the customer said from what you concluded. Quote them verbatim first, then label your inference, so the next person can disagree with the inference without re-running the call.',
    note: 'Changed how I write up every interview.',
    tags: ['prompt', 'research', 'interviews'],
    createdAt: ago(2, 3),
    updatedAt: ago(2, 3),
  },
  {
    id: 'k-09',
    authorId: 'm-diego',
    spaceId: 's-onboard',
    site: 'web',
    conversationId: 'doc-runbook',
    conversationTitle: 'On-call runbook — internal wiki',
    url: 'https://wiki.meridian.example/oncall/runbook',
    label: 'wiki.meridian.example',
    color: 'pink',
    snapshot:
      'Page the database owner before you restart anything stateful. The restart is usually right and almost never urgent enough to do alone.',
    note: 'The one line from the runbook people actually need to remember.',
    tags: ['onboarding', 'on-call'],
    createdAt: ago(1, 21),
    updatedAt: ago(1, 21),
  },
  {
    id: 'k-10',
    authorId: 'm-sarah',
    spaceId: 's-policy',
    site: 'gemini',
    conversationId: 'conv-retention',
    conversationTitle: 'Retention periods by data class',
    url: 'https://gemini.google.com/app/conv-retention',
    label: 'Gemini',
    color: 'blue',
    snapshot:
      'A retention policy that cannot be demonstrated is not a policy. Whatever window you choose, the control is the deletion job and the log proving it ran.',
    note: 'Quoted this at the security review. It is why we built the audit export.',
    tags: ['legal', 'retention', 'decision'],
    createdAt: ago(1, 6),
    updatedAt: ago(1, 6),
  },
  {
    id: 'k-11',
    authorId: YOU,
    spaceId: 's-prompts',
    site: 'claude',
    conversationId: 'conv-postmortem',
    conversationTitle: 'Post-mortem without blame',
    url: 'https://claude.ai/chat/conv-postmortem',
    label: 'Claude',
    color: 'green',
    snapshot:
      'Ask what made the wrong action look reasonable at the time. If the answer is "nothing", the timeline is incomplete rather than the person careless.',
    note: 'Opening question for every post-mortem now.',
    tags: ['prompt', 'post-mortem'],
    createdAt: ago(0, 19),
    updatedAt: ago(0, 19),
  },
  {
    id: 'k-12',
    authorId: 'm-tom',
    site: 'chatgpt',
    conversationId: 'conv-index',
    conversationTitle: 'Why the index was not used',
    url: 'https://chatgpt.com/c/conv-index',
    label: 'ChatGPT',
    color: 'yellow',
    snapshot:
      'A partial index is only usable when the planner can prove the query predicate implies the index predicate. A date range expressed against now() cannot be proven at plan time, so the index is skipped.',
    note: 'Not shared to a collection yet — this is why the dashboard query was slow.',
    tags: ['postgres', 'performance'],
    createdAt: ago(0, 11),
    updatedAt: ago(0, 11),
  },
  {
    id: 'k-13',
    authorId: 'm-lena',
    spaceId: 's-pricing',
    site: 'web',
    conversationId: 'doc-pricing',
    conversationTitle: 'Seat-based pricing in practice',
    url: 'https://example.com/writing/seat-based-pricing',
    label: 'example.com',
    color: 'blue',
    snapshot:
      'Per-seat pricing fails when the people who get the value are not the people who get a seat. Check who benefits before you check what to charge.',
    note: 'Worth re-reading before we set Team pricing.',
    tags: ['pricing', 'research'],
    createdAt: ago(0, 5),
    updatedAt: ago(0, 5),
  },
  {
    id: 'k-14',
    authorId: YOU,
    site: 'gemini',
    conversationId: 'conv-scim',
    conversationTitle: 'SCIM vs just-in-time provisioning',
    url: 'https://gemini.google.com/app/conv-scim',
    label: 'Gemini',
    color: 'pink',
    snapshot:
      'Just-in-time provisioning creates accounts but never removes them. If offboarding matters — and for a security questionnaire it always does — you need SCIM deprovisioning, not only SSO.',
    note: 'Private for now. Answers the question every security review asks.',
    tags: ['scim', 'enterprise'],
    createdAt: ago(0, 2),
    updatedAt: ago(0, 2),
  },
  {
    id: 'k-15',
    authorId: 'm-diego',
    spaceId: 's-pg17',
    site: 'claude',
    conversationId: 'conv-pgtime',
    conversationTitle: 'How long does pg_upgrade actually take?',
    url: 'https://claude.ai/chat/conv-pgtime',
    label: 'Claude',
    color: 'green',
    snapshot:
      'In link mode pg_upgrade never copies user data, so the runtime is driven by the number of relations rather than how much data they hold. A few thousand tables takes minutes; a terabyte sitting in a handful of tables takes about the same.',
    note: 'Suggests 1.4TB is not the number that matters. We should be counting relations.',
    tags: ['postgres', 'migration'],
    createdAt: ago(0, 3),
    updatedAt: ago(0, 3),
  },
  {
    id: 'k-16',
    authorId: YOU,
    spaceId: 's-pricing',
    site: 'chatgpt',
    conversationId: 'conv-seatcap',
    conversationTitle: 'Seat caps versus usage pricing',
    url: 'https://chatgpt.com/c/conv-seatcap',
    label: 'ChatGPT',
    color: 'blue',
    snapshot:
      'Charging per seat and then capping usage means you negotiate two numbers at every renewal instead of one. Pick whichever tracks the value and let the other be generous.',
    note: 'Argues for picking one axis. We have not decided which one yet.',
    tags: ['pricing'],
    createdAt: ago(0, 1),
    updatedAt: ago(0, 1),
  },
];

/** Seeded history, so the audit log is not empty on a fresh open. */
export const AUDIT: AuditEvent[] = [
  {
    id: 'a-1',
    at: ago(12),
    actorId: YOU,
    action: 'workspace.created',
    detail: 'Workspace "Meridian" created',
  },
  {
    id: 'a-2',
    at: ago(11, 4),
    actorId: YOU,
    action: 'member.invited',
    detail: 'Invited tom@meridian.example as admin',
  },
  {
    id: 'a-3',
    at: ago(9, 3),
    actorId: 'm-tom',
    action: 'highlight.shared',
    detail: 'Shared a highlight to "Postgres 17 upgrade"',
  },
  {
    id: 'a-4',
    at: ago(5, 4),
    actorId: 'm-tom',
    action: 'comment.added',
    detail: 'Commented on a highlight in "Prompts that worked"',
  },
  {
    id: 'a-5',
    at: ago(3, 5),
    actorId: 'm-sarah',
    action: 'space.created',
    detail: 'Created "AI policy evidence" — restricted to 2 members',
  },
  {
    id: 'a-6',
    at: ago(1, 2),
    actorId: YOU,
    action: 'member.invited',
    detail: 'Invited noah@meridian.example as member',
  },
];

export function memberById(id: string): Member {
  return (
    MEMBERS.find((member) => member.id === id) ?? {
      id,
      name: 'Former member',
      email: '',
      role: 'member',
      initials: '—',
      hue: 220,
      seatActive: false,
    }
  );
}

export function spaceById(id: string | undefined): Space | undefined {
  return id ? SPACES.find((space) => space.id === id) : undefined;
}
