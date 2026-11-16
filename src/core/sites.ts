import type { Mark } from './types';

const SITE_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
};

/** What to call the place a highlight came from; unknown sites fall back to their domain. */
export function siteLabel(mark: Pick<Mark, 'site' | 'url'>): string {
  return SITE_LABELS[mark.site] ?? hostnameOf(mark.url);
}

/**
 * Whether two highlights came from the same place. Every ordinary website
 * shares the site id 'web', so that alone would lump all of them together;
 * the label splits them back apart by domain.
 */
export function sameSite(a: Pick<Mark, 'site' | 'url'>, b: Pick<Mark, 'site' | 'url'>): boolean {
  return siteLabel(a) === siteLabel(b);
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown site';
  }
}

/**
 * Which content script runs on which site.
 *
 * 3e: nothing is built in, so none of these are in the manifest and none is
 * granted at install. Kona asks for a site while you are standing on it, and
 * when a site is allowed the background registers the script that knows it.
 * The chat sites are not special, they are simply sites Kona happens to have
 * an adapter for, and until you allow one, Kona cannot read it.
 *
 * Keeping the table here rather than in the background script is what makes it
 * testable: deciding which script owns a host is the part that can quietly go
 * wrong, and when it does ChatGPT silently falls back to the plain-page
 * adapter and stops understanding a conversation.
 */
export interface SiteScript {
  id: string;
  js: string;
  /** Hosts this adapter knows, matched on the registrable end of the name. */
  domains: string[];
}

export const SITE_SCRIPTS: readonly SiteScript[] = [
  {
    id: 'chatgpt',
    js: 'content-scripts/chatgpt.js',
    domains: ['chatgpt.com', 'chat.openai.com'],
  },
  { id: 'claude', js: 'content-scripts/claude.js', domains: ['claude.ai'] },
  { id: 'gemini', js: 'content-scripts/gemini.js', domains: ['gemini.google.com'] },
];

/** Everything else, which is most of the web. */
export const WEB_SCRIPT = { id: 'web-pages', js: 'content-scripts/web.js' } as const;

/** The host out of a match pattern: `https://*.claude.ai/*` is `*.claude.ai`. */
export function hostOfPattern(pattern: string): string {
  const match = /^[a-z*]+:\/\/([^/]+)/i.exec(pattern);
  return (match?.[1] ?? '').replace(/^\*\./, '').toLowerCase();
}

/** Which script owns a host. Falls back to the plain-page one, as the web does. */
export function scriptForHost(host: string): string {
  const clean = host.replace(/^www\./, '').toLowerCase();
  for (const script of SITE_SCRIPTS) {
    if (script.domains.some((domain) => clean === domain || clean.endsWith(`.${domain}`))) {
      return script.id;
    }
  }
  return WEB_SCRIPT.id;
}

/**
 * Split the origins the user has allowed among the scripts that handle them.
 *
 * Only scripts with something to do come back, so a person who has allowed
 * three ordinary websites and no chat site has exactly one script registered.
 */
export function scriptsForOrigins(
  origins: readonly string[],
): { id: string; js: string; matches: string[] }[] {
  const byId = new Map<string, string[]>();
  for (const origin of origins) {
    const id = scriptForHost(hostOfPattern(origin));
    byId.set(id, [...(byId.get(id) ?? []), origin]);
  }
  const all = [...SITE_SCRIPTS, { ...WEB_SCRIPT, domains: [] }];
  return all
    .filter((script) => byId.has(script.id))
    .map((script) => ({ id: script.id, js: script.js, matches: byId.get(script.id)! }));
}
