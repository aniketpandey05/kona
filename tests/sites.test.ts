import { describe, expect, it } from 'vitest';
import { sameSite, siteLabel } from '../src/core/sites';

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
