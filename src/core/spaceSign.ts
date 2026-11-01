/**
 * Signing what you wrote in a space, and checking what came back.
 *
 * This sits between the space model, which stays pure and knows nothing about
 * keys, and `identity.ts`, which knows about keys and nothing about spaces.
 * Signing happens when a space is handed over and checking when one is looked
 * at, so neither the ordinary editing path nor the merge has to be async.
 *
 * **What is signed, and what is deliberately not.** A contribution is signed
 * over the parts its author wrote: the words, who they are, and when. It is
 * *not* signed over which highlight it hangs off, because that is the one
 * thing the file does not carry intact — adopting a space rewrites every mark
 * id onto the ids this copy already uses for the same passages, and a
 * signature over a rewritten id would break on every honest import.
 *
 * So the guarantee is: nobody can write words in your name, change the words
 * you wrote, or sign as you. Somebody determined could in principle move your
 * reply to a different passage within a space they are forwarding. That is a
 * smaller thing than the alternative, which is a signature that fails for
 * everyone doing nothing wrong.
 */

import { canonical, sign, verify } from './identity';
import { joinPeople, personIn, type Person } from './people';
import type { Comment, Decision, Finding, Space } from './spaces';

/** The decision is the one contribution with no id of its own. */
export const DECISION = 'decision';

export function commentForm(comment: Comment): string {
  return canonical([
    'comment',
    comment.id,
    comment.by,
    comment.createdAt,
    comment.editedAt,
    comment.body,
  ]);
}

export function findingForm(finding: Finding): string {
  return canonical([
    'finding',
    finding.id,
    finding.stance,
    finding.by,
    finding.createdAt,
    finding.claim,
  ]);
}

export function decisionForm(decision: Decision): string {
  return canonical(['decision', decision.by, decision.decidedAt, decision.body]);
}

/**
 * Everything of yours in this space that is not signed yet, signed.
 *
 * Called on the way out rather than on every keystroke: a signature is only
 * worth anything to somebody else, and making one costs a trip through
 * WebCrypto that the editing path should not have to wait for.
 */
export async function signMine(
  space: Space,
  me: Person,
  privateKey: JsonWebKey,
): Promise<Space> {
  const mine = (by: string | undefined): boolean => by === me.id;
  const next: Space = { ...space, people: joinPeople(space.people, me) };

  if (space.comments) {
    next.comments = await Promise.all(
      space.comments.map(async (comment) => {
        if (comment.sig || !mine(comment.by)) return comment;
        const sig = await sign(privateKey, commentForm(comment));
        return sig ? { ...comment, sig } : comment;
      }),
    );
  }

  next.findings = await Promise.all(
    space.findings.map(async (finding) => {
      if (finding.sig || !mine(finding.by)) return finding;
      const sig = await sign(privateKey, findingForm(finding));
      return sig ? { ...finding, sig } : finding;
    }),
  );

  if (space.decision && !space.decision.sig && mine(space.decision.by)) {
    const sig = await sign(privateKey, decisionForm(space.decision));
    if (sig) next.decision = { ...space.decision, sig };
  }

  return next;
}

export interface Checked {
  /** Contributions carrying a signature that is really theirs. */
  verified: Set<string>;
  /**
   * Contributions whose signature does not hold: the words have moved since
   * it was made, it was made with a different key than the one held for that
   * person, or it claims a person there is no key for at all.
   */
  broken: Set<string>;
  /** People who signed something here and had nothing fail. */
  proven: Set<string>;
}

const nothing = (): Checked => ({
  verified: new Set<string>(),
  broken: new Set<string>(),
  proven: new Set<string>(),
});

/**
 * Checks every signature in a space against the keys the space carries.
 *
 * An unsigned contribution is not a failure. Most spaces have never been
 * anywhere, plenty were written before any of this existed, and treating
 * "unsigned" as "suspect" would cry wolf on almost everything. Only a
 * signature that is present and wrong is wrong.
 */
export async function checkSpace(space: Space): Promise<Checked> {
  const found = nothing();

  const items = [
    ...(space.comments ?? []).map((comment) => ({
      id: comment.id,
      by: comment.by,
      sig: comment.sig,
      form: commentForm(comment),
    })),
    ...space.findings.map((finding) => ({
      id: finding.id,
      by: finding.by,
      sig: finding.sig,
      form: findingForm(finding),
    })),
    ...(space.decision
      ? [
          {
            id: DECISION,
            by: space.decision.by,
            sig: space.decision.sig,
            form: decisionForm(space.decision),
          },
        ]
      : []),
  ];

  const failed = new Set<string>();
  const signed = new Set<string>();

  for (const item of items) {
    if (!item.sig) continue;
    if (item.by) signed.add(item.by);
    const key = personIn(space.people, item.by)?.key;
    // A signature nothing can be checked against is not evidence of anything,
    // and saying so is the point of having it.
    const ok = key ? await verify(key, item.form, item.sig) : false;
    if (ok) {
      found.verified.add(item.id);
    } else {
      found.broken.add(item.id);
      if (item.by) failed.add(item.by);
    }
  }

  for (const by of signed) if (!failed.has(by)) found.proven.add(by);
  return found;
}
