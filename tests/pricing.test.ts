import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PLANS } from '../src/core/plans';
import { TIERS } from '../team/src/billing';

/**
 * The landing page and the extension both quote the prices, and they have
 * drifted apart more than once, a tier gaining a line in `plans.ts` that the
 * site never heard about, or the site still selling something that moved.
 *
 * `plans.ts` is the copy of record. The extension imports it, so it cannot
 * drift; the site is hand-written HTML and can, so this reads it back and
 * checks the two agree line for line. It is a blunt test on purpose: a
 * mismatch here means somebody changed the price of the product in one place.
 */

// Relative to the project root: under happy-dom `import.meta.url` is not a
// file URL, so it cannot be resolved against.
const site = readFileSync(resolve('site', 'index.html'), 'utf8');

const UNESCAPE: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&rsquo;': '’',
  '&mdash;': '—',
  '&rarr;': '→',
};

const plain = (html: string): string =>
  html
    .replace(/&[a-z]+;/g, (entity) => UNESCAPE[entity] ?? entity)
    .replace(/\s+/g, ' ')
    .trim();

/** The bullets the site lists under one tier's heading. */
function bulletsFor(name: string): string[] {
  const block = new RegExp(`<h3>${name}</h3>([\\s\\S]*?)</ul>`).exec(site);
  if (!block?.[1]) return [];
  return [...block[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((match) => plain(match[1] ?? ''));
}

describe('the price of the product, in both places it is written down', () => {
  for (const plan of PLANS) {
    const name = plan.name;

    it(`${name} lists the same things on the site as in plans.ts`, () => {
      expect(bulletsFor(name)).toEqual([...plan.included]);
    });

    it(`${name} costs the same on the site as in plans.ts`, () => {
      // The price sits in its own element right under the heading.
      const block = new RegExp(`<h3>${name}</h3>([\\s\\S]*?)</p>`).exec(site);
      expect(plain(block?.[1] ?? '')).toContain(plan.price);
    });
  }

  it('the site has no tier the plans do not', () => {
    const headings = [...site.matchAll(/<article class="tier[^"]*">\s*<h3>([^<]+)<\/h3>/g)].map(
      (match) => match[1],
    );
    expect(headings).toEqual(PLANS.map((plan) => plan.name));
  });

  it('the Team demo sells the same tiers as everywhere else', () => {
    // It held a fourth hand-written copy and drifted: still selling Slack and
    // Notion sync long after that stopped being what Team was. It derives from
    // PLANS now, and this fails if anybody writes one out by hand again.
    expect(TIERS.map((tier) => tier.name)).toEqual(PLANS.map((plan) => plan.name));
    for (const [index, tier] of TIERS.entries()) {
      expect(tier.features).toEqual([...(PLANS[index]?.included ?? [])]);
      expect(tier.price).toBe(PLANS[index]?.price);
      expect(tier.pitch).toBe(PLANS[index]?.pitch);
    }
  });

  it('nothing anywhere still sells Kona as being for one person only', () => {
    // It was never true once a space could be handed to somebody, and the
    // page said it in five places while showing the opposite two sections up.
    expect(site).not.toMatch(/single user|for one person/i);
  });
});
