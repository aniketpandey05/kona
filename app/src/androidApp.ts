/**
 * Opening a highlight in the chat app that is installed, rather than the web.
 *
 * Each of these sites publishes a Digital Asset Links file granting its Android
 * app delegate_permission/common.handle_all_urls, so every url on the domain
 * belongs to the app as well as the browser. Chrome only hands a page's link
 * over to an app for an explicit intent: url, and only on a tap.
 */
const ANDROID_APPS: Record<string, string> = {
  "chatgpt.com": "com.openai.chatgpt",
  "chat.openai.com": "com.openai.chatgpt",
  "claude.ai": "com.anthropic.claude",
  "gemini.google.com": "com.google.android.apps.bard",
};

/** The Android package that also answers for this link, if there is one. */
export function androidAppFor(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return ANDROID_APPS[host] ?? null;
  } catch {
    return null;
  }
}

/**
 * A link that opens the site's own app, falling back to `fallback` — the
 * ordinary link, text fragment and all — when that app is not installed.
 *
 * The intent spec lives in the fragment, which is where a text fragment would
 * have gone, so the app is only ever handed the conversation and never the
 * passage. No native app scrolls to a text fragment anyway; that is the trade
 * for landing somewhere you are already signed in.
 */
export function openInAppUrl(url: string, fallback: string): string | null {
  const pkg = androidAppFor(url);
  if (!pkg) return null;

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return null;
  }
  const scheme = target.protocol.replace(":", "");
  const fields = [
    `scheme=${scheme}`,
    `package=${pkg}`,
    // Semicolons separate the fields, so the fallback has to arrive encoded.
    `S.browser_fallback_url=${encodeURIComponent(fallback)}`,
  ];
  return `intent://${target.host}${target.pathname}${target.search}#Intent;${fields.join(";")};end`;
}
