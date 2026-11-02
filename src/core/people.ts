/**
 * Who did which part.
 *
 * Kona has no accounts and no server, so a person is not a row in a database
 * somewhere; they are a name and a local id that travels inside the space
 * itself. When you hand a space over, the people who worked on it go with it,
 * which is what lets the other side show your name against your conclusion
 * instead of an id it has no way to look up.
 *
 * A name on its own would be asserted and nothing more. A person who has a
 * key is different: everything they write in a space is signed with it, so a
 * copy coming back can be checked against the key you already hold for them.
 * The first time somebody's name arrives you take it on trust; after that the
 * key has to match. `identity.ts` is careful about where that stops.
 */

export interface Person {
  /** Made once on this computer, and reused so a copy coming back recognises you. */
  id: string;
  name: string;
  /**
   * The public half of a key made on their computer, if they have one. It is
   * what turns the name from a claim into something checkable: see
   * `identity.ts` for exactly how much that proves, and how much it does not.
   */
  key?: string;
}

const newId = (): string => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function makePerson(name: string, id = newId()): Person {
  return { id, name: name.trim().slice(0, 60) || 'Anonymous' };
}

/** One or two letters for an avatar, so a face is recognisable without loading an image. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1] ?? '') : '';
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase() || '?';
}

/**
 * A colour from the id, not from the name, so renaming yourself does not
 * repaint every avatar, and two people called Sam stay told apart.
 */
export function hueOf(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 360;
  return hash;
}

export function personIn(people: readonly Person[] | undefined, id: string | undefined): Person | null {
  if (!id || !people) return null;
  return people.find((person) => person.id === id) ?? null;
}

/**
 * The name to show for a contribution. A space that arrives without its people
 * list, or one written before any of this existed, leaves work unattributed,
 * which is honest, and better than guessing whose it was.
 */
export function nameIn(people: readonly Person[] | undefined, id: string | undefined): string | null {
  return personIn(people, id)?.name ?? null;
}

/**
 * You, added to the list, or your name brought up to date if it is already
 * there. Called by every mutation that records who did something, so there is
 * no way to end up with a `by` that nothing can resolve.
 */
export function joinPeople(people: readonly Person[] | undefined, me: Person): Person[] {
  const list = people ?? [];
  const same = (person: Person): boolean =>
    person.id === me.id && person.name === me.name && person.key === me.key;
  if (list.some(same)) return [...list];
  // Replaced outright rather than patched: a key you have just made is as much
  // a part of who you are here as the name, and a half-updated entry would
  // leave your own signatures unverifiable on your own copy.
  if (list.some((person) => person.id === me.id)) {
    return list.map((person) => (person.id === me.id ? me : person));
  }
  return [...list, me];
}

/**
 * Both lists, mine first.
 *
 * A person I already have is kept exactly as I have them, their name and,
 * more to the point, their key. That is the whole defence against somebody
 * sending a file that claims an id already in my copy: the key I hold wins,
 * so their contributions are checked against the real one and fail.
 */
export function mergePeople(mine: readonly Person[] | undefined, theirs: readonly Person[] | undefined): Person[] {
  const out = [...(mine ?? [])];
  const have = new Set(out.map((person) => person.id));
  for (const person of theirs ?? []) {
    if (!have.has(person.id)) {
      out.push(person);
      have.add(person.id);
      continue;
    }
    // Somebody I already know, who has since made themselves a key. Taking it
    // is the first use the trust rests on; what matters is that a key I
    // already hold is never replaced by one arriving in a file, which is what
    // stops a later file claiming to be them.
    const at = out.findIndex((entry) => entry.id === person.id);
    const ours = out[at];
    if (ours && !ours.key && person.key) out[at] = { ...ours, key: person.key };
  }
  return out;
}
