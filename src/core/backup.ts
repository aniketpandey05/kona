/**
 * Everything you have, in one file you can move.
 *
 * There is no sync, so this is the only way to get from one computer to the
 * next, which makes what it leaves out as important as what it holds. It used
 * to hold only highlights — so a backup restored on a new machine arrived with
 * every passage you had ever kept and none of the questions you had been
 * asking, none of what you concluded, and none of the discussion. That is
 * silent loss of the part that took the most work, and the reason this file
 * now carries spaces too.
 *
 * It also carries who you are, signing key and all, which deserves saying out
 * loud: a backup is as private as everything in it, and this makes it as
 * private as your key. Kona keeps the key out of anything that goes to
 * somebody else — a shared space never contains it. A backup is the one file
 * that is meant to come back to you, so the alternative is worse: restore
 * without it and you arrive as a stranger whose own past conclusions no
 * longer check out against the name on them.
 */

import type { Person } from './people';
import type { Space } from './spaces';
import { cleanSpace } from './spaceShare';
import type { Mark } from './types';

export interface Identity {
  me: Person;
  /** The private half of the signing key. Only ever in a file meant for you. */
  signingKey?: JsonWebKey;
}

export interface Backup {
  app: 'kona';
  version: 2;
  exportedAt: number;
  marks: Mark[];
  spaces?: Space[];
  identity?: Identity;
}

export interface Restored {
  marks: Mark[];
  spaces: Space[];
  identity: Identity | null;
}

export function createBackup(
  marks: readonly Mark[],
  spaces: readonly Space[] = [],
  identity: Identity | null = null,
): string {
  const backup: Backup = {
    app: 'kona',
    version: 2,
    exportedAt: Date.now(),
    marks: [...marks],
    ...(spaces.length > 0 ? { spaces: [...spaces] } : {}),
    ...(identity ? { identity } : {}),
  };
  return JSON.stringify(backup, null, 2);
}

/**
 * Reads a backup file, keeping only what looks like the real thing.
 *
 * A backup is usually your own, but it arrives as a file like any other, so
 * it is treated like one: spaces go through the same validation a space
 * somebody sent you does, and a claim that is not supported by the rest of
 * the file is dropped rather than trusted.
 *
 * Older backups, and the bare array of highlights the very first ones were,
 * still read. They simply have no spaces in them.
 */
export function readBackup(text: string): Restored {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't readable as a backup.");
  }
  const raw = (Array.isArray(data) ? null : (data as Partial<Backup> | null)) ?? null;
  const rawMarks = Array.isArray(data) ? data : raw?.marks;
  if (!Array.isArray(rawMarks)) throw new Error("That file doesn't look like a backup.");

  const marks = rawMarks.filter(isMark);
  const held = new Set(marks.map((mark) => mark.id));
  const spaces = Array.isArray(raw?.spaces)
    ? raw.spaces
        .map((entry) => cleanSpace(entry, held))
        .filter((space): space is Space => !!space)
    : [];

  if (marks.length === 0 && spaces.length === 0) {
    throw new Error('No highlights were found in that file.');
  }
  return { marks, spaces, identity: cleanIdentity(raw?.identity) };
}

function cleanIdentity(value: unknown): Identity | null {
  const raw = value as Partial<Identity> | null;
  const me = raw?.me as Partial<Person> | undefined;
  if (!me || typeof me.id !== 'string' || typeof me.name !== 'string') return null;
  const person: Person = {
    id: me.id,
    name: me.name.trim().slice(0, 60),
    ...(typeof me.key === 'string' ? { key: me.key } : {}),
  };
  // A key that is not a key is simply absent; `identity.ts` would refuse it
  // later anyway, and refusing it here keeps the stored record clean.
  const signingKey = raw?.signingKey;
  const usable =
    !!signingKey && typeof signingKey === 'object' && typeof (signingKey as JsonWebKey).kty === 'string';
  return { me: person, ...(usable ? { signingKey: signingKey as JsonWebKey } : {}) };
}

function isMark(value: unknown): value is Mark {
  const mark = value as Partial<Mark> | null;
  return (
    !!mark &&
    typeof mark.id === 'string' &&
    typeof mark.site === 'string' &&
    typeof mark.conversationId === 'string' &&
    typeof mark.snapshot === 'string'
  );
}
