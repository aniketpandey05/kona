import { storage } from '#imports';

// Sites the user switched off. The chat sites ship switched on, so only the
// exceptions are stored; everywhere else is off until a site is allowed.
const KEY = 'local:disabled-sites';

/**
 * www.example.com and example.com are the same site to a reader, so they have
 * to be the same site to the switch — otherwise turning one off leaves the
 * other on, and the popup grows a duplicate row.
 */
export const siteKey = (hostname: string): string => hostname.replace(/^www\./, '').toLowerCase();

export function isSiteEnabled(disabled: readonly string[], hostname: string): boolean {
  const key = siteKey(hostname);
  return !disabled.some((each) => siteKey(each) === key);
}

export async function loadDisabledSites(): Promise<string[]> {
  return (await storage.getItem<string[]>(KEY)) ?? [];
}

export async function setSiteEnabled(hostname: string, enabled: boolean): Promise<void> {
  const disabled = await loadDisabledSites();
  const key = siteKey(hostname);
  const without = disabled.filter((host) => siteKey(host) !== key);
  const next = enabled ? without : [...without, key];
  await storage.setItem(KEY, next);
}

export function watchDisabledSites(onChange: (hostnames: string[]) => void): () => void {
  return storage.watch<string[]>(KEY, (hostnames) => onChange(hostnames ?? []));
}
