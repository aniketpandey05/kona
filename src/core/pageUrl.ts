/**
 * Which URLs are the same page.
 *
 * A highlight is stored under the page it was made on, so this decides
 * whether you see it again. It used to be `origin + pathname + search`, and
 * the search was the problem: almost every inbound link on the open web
 * carries something that identifies where you came from rather than what you
 * are looking at. These were three different pages to Kona:
 *
 *   example.com/article
 *   example.com/article?utm_source=twitter
 *   example.com/article?fbclid=abc123
 *
 * So you highlighted something, came back from a search result, and your
 * highlights were not there. Nothing was lost; they were filed under a URL
 * you had no way to return to.
 *
 * The query string still has to be kept, because on plenty of pages it *is*
 * the page: `?page=2`, `?q=`, `?v=` on YouTube, an issue filter. So this
 * removes a named list rather than guessing. The list only holds parameters
 * that are unambiguously about tracking, never a plain word like `ref`,
 * `source` or `s` that a site may well be using for something real: `ref` is
 * a branch on GitHub. Taking too little only leaves today's behaviour in
 * place for that one parameter. Taking too much merges two genuinely
 * different pages into one library entry, and that loses work.
 */

/** Everything beginning with this is a campaign tag and never addresses a page. */
const TRACKING_PREFIXES = ['utm_'];

/** Click identifiers, each one tied to a single ad network or mailer. */
const TRACKING_PARAMS = new Set([
  'fbclid', // Facebook
  'gclid', // Google Ads
  'dclid', // Google Display
  'gbraid', // Google, app-to-web
  'wbraid', // Google, web-to-app
  'msclkid', // Microsoft
  'twclid', // Twitter
  'ttclid', // TikTok
  'yclid', // Yandex
  'igshid', // Instagram
  'igsh', // Instagram, newer
  'si', // YouTube and Spotify share links
  'mc_cid', // Mailchimp campaign
  'mc_eid', // Mailchimp recipient
  '_hsenc', // HubSpot
  '_hsmi', // HubSpot
  'vero_id',
  'vero_conv',
  '_openstat',
  'oly_anon_id',
  'oly_enc_id',
  'rb_clickid',
  'ef_id', // Adobe
  's_cid', // Adobe
  'scid',
]);

export function isTracking(name: string): boolean {
  const lower = name.toLowerCase();
  return TRACKING_PREFIXES.some((prefix) => lower.startsWith(prefix)) || TRACKING_PARAMS.has(lower);
}

/**
 * The query string with the tracking taken out, and what is left in a fixed
 * order so that `?a=1&b=2` and `?b=2&a=1` are one page rather than two.
 */
export function meaningfulSearch(url: URL): string {
  const kept = [...url.searchParams]
    .filter(([name]) => !isTracking(name))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  // Rebuilt through URLSearchParams rather than joined by hand, so that a
  // value holding an `&` cannot come back out as two parameters.
  const text = new URLSearchParams(kept).toString();
  return text ? `?${text}` : '';
}

/** What Kona files a page's highlights under. */
export function pageId(url: URL): string {
  return `${url.origin}${url.pathname}${meaningfulSearch(url)}`;
}
