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
