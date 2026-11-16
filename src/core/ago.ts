/**
 * How long ago, in words.
 *
 * In the library's register rather than the dense one: *3 days ago*, not *3d*.
 * Both rooms that read it back to you, the library's rows and the panel's
 * notice when a page has changed under a highlight, are reading prose at you,
 * and the shorthand belongs where space is tight.
 *
 * Past a month it gives the date instead. "47 days ago" is not something
 * anybody converts into a point in time, and the date is.
 */
export function ago(at: number): string {
  const minutes = Math.round((Date.now() - at) / 60_000);
  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(at).toLocaleDateString();
}
