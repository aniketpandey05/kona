import { describe, expect, it } from 'vitest';
import { hostOfPattern, sameSite, scriptForHost, scriptsForOrigins, siteLabel } from '../src/core/sites';

const web = (url: string) => ({ site: 'web' as const, url });

describe('siteLabel', () => {
  it('names the chat sites', () => {
    expect(siteLabel({ site: 'chatgpt', url: 'https://chatgpt.com/c/1' })).toBe('ChatGPT');
  });

  it('falls back to the domain, without www', () => {
    expect(siteLabel(web('https://www.example.com/post'))).toBe('example.com');
  });

  it('survives a url it cannot parse', () => {
    expect(siteLabel(web('not a url'))).toBe('Unknown site');
  });
});

describe('sameSite', () => {
  it('keeps two ordinary sites apart, though both are stored as web', () => {
    const jarvis = web('https://jarvis.example.com/');
    const news = web('https://news.example.org/');
    expect(sameSite(jarvis, news)).toBe(false);
  });

  it('matches two pages of the same ordinary site', () => {
    const one = web('https://jarvis.example.com/a');
    const two = web('https://jarvis.example.com/b');
    expect(sameSite(one, two)).toBe(true);
  });

  it('ignores www on one side only', () => {
    expect(sameSite(web('https://www.example.com/a'), web('https://example.com/b'))).toBe(true);
  });

  it('holds a chat site together across the domains it answers on', () => {
    const a = { site: 'chatgpt' as const, url: 'https://chatgpt.com/c/1' };
    const b = { site: 'chatgpt' as const, url: 'https://chat.openai.com/c/2' };
    expect(sameSite(a, b)).toBe(true);
  });

  it('does not confuse a chat site with an ordinary page on its domain', () => {
    const chat = { site: 'chatgpt' as const, url: 'https://chatgpt.com/c/1' };
    expect(sameSite(chat, web('https://chatgpt.com/pricing'))).toBe(false);
  });
});

describe('which script runs on which site', () => {
  it('takes the host out of a match pattern', () => {
    expect(hostOfPattern('https://*.claude.ai/*')).toBe('claude.ai');
    expect(hostOfPattern('https://gemini.google.com/*')).toBe('gemini.google.com');
    expect(hostOfPattern('*://*.example.co.uk/*')).toBe('example.co.uk');
  });

  it('gives each chat site the adapter that knows it', () => {
    // The quiet failure this exists to stop: ChatGPT falling back to the
    // plain-page adapter still highlights, and stops understanding a
    // conversation, and nothing says so.
    expect(scriptForHost('chatgpt.com')).toBe('chatgpt');
    expect(scriptForHost('chat.openai.com')).toBe('chatgpt');
    expect(scriptForHost('claude.ai')).toBe('claude');
    expect(scriptForHost('gemini.google.com')).toBe('gemini');
  });

  it('covers the subdomains those sites actually use', () => {
    expect(scriptForHost('www.chatgpt.com')).toBe('chatgpt');
    expect(scriptForHost('app.claude.ai')).toBe('claude');
  });

  it('gives everything else the plain-page one, which is most of the web', () => {
    expect(scriptForHost('example.org')).toBe('web-pages');
    expect(scriptForHost('news.ycombinator.com')).toBe('web-pages');
  });

  it('is not fooled by a host that merely ends in the right letters', () => {
    // notclaude.ai is not claude.ai, and a suffix test without the dot would
    // hand somebody else's site to Kona's Claude adapter.
    expect(scriptForHost('notclaude.ai')).toBe('web-pages');
    expect(scriptForHost('chatgpt.com.evil.test')).toBe('web-pages');
  });

  it('registers one script per kind, with the origins that need it', () => {
    const scripts = scriptsForOrigins([
      'https://chatgpt.com/*',
      'https://example.org/*',
      'https://claude.ai/*',
      'https://news.example/*',
    ]);
    expect(scripts.map((each) => each.id)).toEqual(['chatgpt', 'claude', 'web-pages']);
    expect(scripts.find((each) => each.id === 'web-pages')?.matches).toEqual([
      'https://example.org/*',
      'https://news.example/*',
    ]);
  });

  it('registers nothing at all when nothing is allowed', () => {
    // Which is a fresh install: 3e means Kona arrives able to read nothing.
    expect(scriptsForOrigins([])).toEqual([]);
  });
});
