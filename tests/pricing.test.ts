import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CAN_BUY, PLANS } from '../src/core/plans';
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

  it('nothing above Free can be bought, and the walls read that rather than assert it', () => {
    // 25 allows an upgrade to be mentioned where a limit is felt and nowhere
    // else, which makes the two caps the only places Pro is named in the
    // product, and the worst two places to promise it: somebody has just
    // been stopped and is looking for the way out. Both branch on CAN_BUY so
    // that shipping a tier changes the sentences with it.
    expect(CAN_BUY).toBe(false);
    for (const path of ['app/src/SpacesView.tsx', 'app/src/Library.tsx']) {
      const wall = /class="lib-wall"[\s\S]*?<\/p>/.exec(readFileSync(resolve(path), 'utf8'));
      expect(wall?.[0], `${path} has no wall`).toBeDefined();
      expect(wall?.[0], path).toContain('CAN_BUY');
    }
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

  it('every tier that is not built carries the badge, and the built one does not', () => {
    for (const plan of PLANS) {
      const block = new RegExp(`<h3>${plan.name}</h3>([\\s\\S]*?)</article>`).exec(site);
      expect(/class="soon"/.test(block?.[1] ?? ''), plan.name).toBe(!plan.built);
    }
  });

  it('the page no longer says the paid tiers are running today', () => {
    // It said "built and running today" of Pro and Team while the server half
    // of both was missing: a frozen desktop app listed as a Pro feature, a
    // phone that needs a Mac, and shared spaces that update as people type.
    // The same stale promise already removed twice, from the README and from
    // the release notes.
    expect(site).not.toMatch(/built and running/i);
  });

  it('nothing anywhere still sells Kona as being for one person only', () => {
    // It was never true once a space could be handed to somebody, and the
    // page said it in five places while showing the opposite two sections up.
    expect(site).not.toMatch(/single user|for one person/i);
  });
});
