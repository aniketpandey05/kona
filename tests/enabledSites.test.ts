import { describe, expect, it } from 'vitest';
import { isSiteEnabled, siteKey } from '../src/core/enabledSites';

describe('siteKey', () => {
  it('treats www as the same site', () => {
    expect(siteKey('www.chatgpt.com')).toBe(siteKey('chatgpt.com'));
  });

  it('ignores case', () => {
    expect(siteKey('ChatGPT.com')).toBe('chatgpt.com');
  });

  it('leaves other subdomains alone, since they really are other sites', () => {
    expect(siteKey('docs.example.com')).toBe('docs.example.com');
  });
});

describe('isSiteEnabled', () => {
  it('is on when nothing was switched off', () => {
    expect(isSiteEnabled([], 'chatgpt.com')).toBe(true);
  });

  it('is off once the site is in the list', () => {
    expect(isSiteEnabled(['chatgpt.com'], 'chatgpt.com')).toBe(false);
  });

  // Switching off chatgpt.com has to switch off www.chatgpt.com as well, or
  // the same site stays half on.
  it('matches across www', () => {
    expect(isSiteEnabled(['chatgpt.com'], 'www.chatgpt.com')).toBe(false);
    expect(isSiteEnabled(['www.chatgpt.com'], 'chatgpt.com')).toBe(false);
  });

  it('leaves other sites alone', () => {
    expect(isSiteEnabled(['chatgpt.com'], 'claude.ai')).toBe(true);
  });
});
