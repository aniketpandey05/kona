import { describe, expect, it } from 'vitest';
import {
  addLink,
  createSpace,
  inOrder,
  moveSpace,
  removeLink,
  samePage,
  type Space,
} from '../src/core/spaces';

/**
 * Two things a space gained from decision 20 and 1e: pages you have not read
 * yet, and an order you set yourself.
 */
const space = (name: string, position?: number): Space => ({
  ...createSpace(name),
  id: name.toLowerCase(),
  position,
});

describe('a page kept in a space to read', () => {
  it('is held by the space and never reaches the library', () => {
    // Bare links live in spaces, never in the library: the library is
    // passages, and a bookmark put there is clutter nobody chose (20, 14a).
    const kept = addLink(space('Amoebas'), 'https://example.org/motility', 'Cell motility');
    expect(kept.links).toEqual([
      { url: 'https://example.org/motility', title: 'Cell motility', addedAt: expect.any(Number) },
    ]);
    expect(kept.markIds).toEqual([]);
  });

  it('accepts the same page once, however it was addressed', () => {
    // The same identity the library files highlights under, so a link from a
    // tweet and the page itself are not two things to read.
    const once = addLink(space('Amoebas'), 'https://example.org/a');
    const twice = addLink(once, 'https://example.org/a?utm_source=twitter');
    expect(twice.links).toHaveLength(1);
  });

  it('ignores an empty address rather than keeping a blank row', () => {
    expect(addLink(space('Amoebas'), '   ').links).toBeUndefined();
  });

  it('takes one back out', () => {
    const kept = addLink(space('Amoebas'), 'https://example.org/a');
    expect(removeLink(kept, 'https://example.org/a').links).toEqual([]);
    // Something that was never there is not an error, and changes nothing.
    expect(removeLink(kept, 'https://example.org/b')).toBe(kept);
  });

  it('knows when a highlight is from the page a link named', () => {
    expect(samePage('https://example.org/a?utm_source=x', 'https://example.org/a')).toBe(true);
    expect(samePage('https://example.org/a', 'https://example.org/b')).toBe(false);
    expect(samePage('not a url', 'not a url')).toBe(true);
  });
});

describe('the order your spaces are in', () => {
  it('is the one you set, and then the rest by when they last moved', () => {
    const ordered = inOrder([space('C'), space('A', 0), space('B', 1)]);
    expect(ordered.map((each) => each.name)).toEqual(['A', 'B', 'C']);
  });

  it('gives every space a position when one of them moves', () => {
    // Writing only the space that moved would leave the others disagreeing
    // about where they are.
    const spaces = [space('A', 0), space('B', 1), space('C', 2)];
    const written = moveSpace(spaces, 'c', -1);
    expect(written.map((each) => [each.name, each.position])).toEqual([
      ['C', 1],
      ['B', 2],
    ]);
  });

  it('refuses to move the ends off the list', () => {
    const spaces = [space('A', 0), space('B', 1)];
    expect(moveSpace(spaces, 'a', -1)).toEqual([]);
    expect(moveSpace(spaces, 'b', 1)).toEqual([]);
    expect(moveSpace(spaces, 'nobody', 1)).toEqual([]);
  });

  it('gives positions to spaces that never had one, once anything moves', () => {
    const written = moveSpace([space('A'), space('B'), space('C')], 'a', 1);
    expect(written.every((each) => each.position !== undefined)).toBe(true);
  });
});
