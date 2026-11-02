/**
 * Where an installed Kona opens.
 *
 * The landing page and the app sit on one origin, the landing page is what
 * people are sent to, and "Add to Home screen" keeps whatever URL is open
 * rather than reading the manifest. So the icon on a phone could be the page
 * that sells Kona instead of Kona, which is what happened. Two things stop it,
 * and both are easy to undo by accident from the other end of the repo:
 * the manifest's scope has to reach the landing page for an install there to
 * install the app, and the landing page has to bounce a standalone window into
 * the app for every shortcut made before that was true.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const page = readFileSync(resolve('site', 'index.html'), 'utf8');
const manifest = JSON.parse(readFileSync(resolve('app', 'public', 'manifest.webmanifest'), 'utf8'));

/** Where the manifest is served from, which is what its members resolve against. */
const AT = 'https://kona.example/app/manifest.webmanifest';

describe('the manifest', () => {
  it('starts the app at the app, not at the site root', () => {
    expect(new URL(manifest.start_url, AT).pathname).toBe('/app/');
  });

  it('is scoped widely enough to be installed from the landing page', () => {
    // Chrome will not offer to install a document that sits outside the scope
    // of the manifest it links, so a scope of ./ here would make the link on
    // the landing page do nothing at all.
    expect(new URL(manifest.scope, AT).pathname).toBe('/');
  });

  it('keeps the share target inside the scope, and in the app', () => {
    expect(new URL(manifest.share_target.action, AT).pathname).toBe('/app/');
  });

  it('is linked from the landing page', () => {
    expect(page).toContain('<link rel="manifest" href="./app/manifest.webmanifest" />');
  });
});

/** The landing page's first script, run with the globals it reaches for. */
function runRedirect(standalone: boolean) {
  const source = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .find((body) => body.includes('display-mode'));
  expect(source, 'the landing page has no display-mode script').toBeTruthy();

  const replace = vi.fn();
  const fakeWindow = { matchMedia: vi.fn(() => ({ matches: standalone })) };
  new Function('window', 'navigator', 'location', source as string)(
    fakeWindow,
    { standalone: false },
    { replace },
  );
  return { replace, matchMedia: fakeWindow.matchMedia };
}

describe('the landing page', () => {
  it('sends an installed window to the app', () => {
    const { replace, matchMedia } = runRedirect(true);
    expect(matchMedia).toHaveBeenCalledWith('(display-mode: standalone)');
    expect(replace).toHaveBeenCalledWith('./app/');
  });

  it('stays put in an ordinary browser tab', () => {
    expect(runRedirect(false).replace).not.toHaveBeenCalled();
  });

  it('also catches an iPhone home-screen shortcut', () => {
    // iOS has no display-mode for a shortcut made before iOS 16.4, which is
    // exactly the case this is here for, so the non-standard flag is checked too.
    const source = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)]
      .map((match) => match[1])
      .find((body) => body.includes('display-mode')) as string;
    const replace = vi.fn();
    new Function('window', 'navigator', 'location', source)(
      { matchMedia: () => ({ matches: false }) },
      { standalone: true },
      { replace },
    );
    expect(replace).toHaveBeenCalledWith('./app/');
  });
});
