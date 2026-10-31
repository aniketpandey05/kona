import { describe, expect, it } from 'vitest';
import { fold, stem, stems, words } from '../src/core/tokens';

describe('breaking text into words', () => {
  it('folds case and accents together', () => {
    expect(fold('Café CAFÉ cafe')).toBe('cafe cafe cafe');
  });

  it('keeps what programmers write inside a word', () => {
    expect(words('pg_upgrade and c++')).toEqual(['pg_upgrade', 'pg', 'upgrade', 'and', 'c++']);
  });

  it('reads a compound as itself and as its parts', () => {
    expect(words('sub-processor')).toEqual(['sub-processor', 'sub', 'processor']);
  });

  it('drops the punctuation around a word', () => {
    expect(words('"Really?" — yes, truly.')).toEqual(['really', 'yes', 'truly']);
  });

  it('keeps an apostrophe out of the middle of a word', () => {
    expect(words("doesn't")).toEqual(['doesnt']);
  });

  it('finds nothing in punctuation alone', () => {
    expect(words('… — ,')).toEqual([]);
  });
});

describe('reducing a word to its stem', () => {
  // Each group is words that have to meet, because a search for any one of
  // them should find a passage that uses any other.
  const families = [
    ['migrate', 'migrated', 'migrates', 'migrating', 'migration', 'migrations'],
    ['upgrade', 'upgraded', 'upgrades', 'upgrading'],
    ['volume', 'volumes'],
    ['cache', 'caches', 'caching'],
    ['query', 'queries'],
    ['price', 'prices', 'pricing'],
    ['secure', 'security'],
    ['operate', 'operates', 'operation', 'operations'],
    ['happy', 'happiness'],
    ['perform', 'performs', 'performance'],
    ['run', 'running'],
    ['set', 'settings'],
    ['deploy', 'deploys', 'deployment', 'deployments'],
  ];

  for (const family of families) {
    it(`treats ${family[0]} and ${family[family.length - 1]} as one word`, () => {
      const found = new Set(family.map(stem));
      expect([...found]).toHaveLength(1);
    });
  }

  it('leaves a short word alone, rather than stemming it to nothing', () => {
    expect(stem('is')).toBe('is');
    expect(stem('sing')).toBe('sing');
    expect(stem('ate')).toBe('ate');
  });

  it('keeps words that only look alike apart', () => {
    expect(stem('database')).not.toBe(stem('data'));
  });

  it('stems a whole passage in order', () => {
    expect(stems('Running the migrations')).toEqual(['run', 'the', 'migrat']);
  });
});
