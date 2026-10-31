import { describe, expect, it } from 'vitest';
import { hueOf, initials, joinPeople, makePerson, mergePeople, nameIn } from '../src/core/people';

describe('a person', () => {
  it('gets an id of its own and a trimmed name', () => {
    const me = makePerson('  Priya Raman  ');
    expect(me.name).toBe('Priya Raman');
    expect(me.id).not.toBe('');
  });

  it('falls back to a name rather than an empty one', () => {
    expect(makePerson('   ').name).toBe('Anonymous');
  });

  it('keeps an id it is given, so renaming yourself does not split your work', () => {
    const first = makePerson('Priya', 'p1');
    const renamed = makePerson('Priya Raman', first.id);
    expect(renamed.id).toBe('p1');
  });

  it('is initialled from the first and last word', () => {
    expect(initials('Priya Raman')).toBe('PR');
    expect(initials('Priya')).toBe('P');
    expect(initials('Ada Beth Carol')).toBe('AC');
    expect(initials('   ')).toBe('?');
  });

  it('takes its colour from the id, so two people with one name stay apart', () => {
    expect(hueOf('p1')).not.toBe(hueOf('p2'));
    expect(hueOf('p1')).toBe(hueOf('p1'));
    expect(hueOf('p1')).toBeGreaterThanOrEqual(0);
    expect(hueOf('p1')).toBeLessThan(360);
  });
});

describe('the people in a space', () => {
  const priya = makePerson('Priya', 'p1');
  const sam = makePerson('Sam', 's1');

  it('adds somebody who is not there yet', () => {
    expect(joinPeople([], priya)).toEqual([priya]);
    expect(joinPeople([priya], sam)).toEqual([priya, sam]);
  });

  it('does not add the same person twice', () => {
    expect(joinPeople([priya], priya)).toEqual([priya]);
  });

  it('brings a name up to date rather than filing a second copy', () => {
    const renamed = makePerson('Priya Raman', 'p1');
    expect(joinPeople([priya, sam], renamed)).toEqual([renamed, sam]);
  });

  it('merges two lists, keeping the name I already have for somebody', () => {
    const theirIdeaOfPriya = makePerson('priya r', 'p1');
    expect(mergePeople([priya], [theirIdeaOfPriya, sam])).toEqual([priya, sam]);
  });

  it('leaves work unattributed when it cannot name whose it is', () => {
    expect(nameIn([priya], 'nobody')).toBeNull();
    expect(nameIn(undefined, 'p1')).toBeNull();
    expect(nameIn([priya], undefined)).toBeNull();
    expect(nameIn([priya], 'p1')).toBe('Priya');
  });
});
