import { describe, expect, it } from 'vitest';
import {
  BRIDGE,
  bridgeMatches,
  fromThisPage,
  isChanged,
  isEnvelope,
  isReply,
  KONA_DEV_ORIGINS,
  KONA_ORIGINS,
} from '../src/core/bridge';

/** A window-shaped stand-in, so "our window" and "some other window" are both nameable. */
const windowAt = (origin: string) => ({ location: { origin } }) as unknown as Window;

const ours = windowAt('https://kona.example');
const theirs = windowAt('https://kona.example');

describe('what the bridge refuses', () => {
  it('answers the page it is running in', () => {
    expect(fromThisPage({ source: ours, origin: 'https://kona.example' }, ours)).toBe(true);
  });

  it('refuses a same-origin parent that framed Kona and posted in', () => {
    // Measured in a real browser: the event arrives carrying Kona's own origin,
    // identical to location.origin, with the parent as its source. An origin
    // check alone cannot see this one. Only the source tells them apart.
    expect(fromThisPage({ source: theirs, origin: 'https://kona.example' }, ours)).toBe(false);
  });

  it('refuses a cross-origin sender, which is the other half of the job', () => {
    expect(fromThisPage({ source: ours, origin: 'https://evil.example' }, ours)).toBe(false);
  });

  it('refuses a message with no source at all', () => {
    expect(fromThisPage({ source: null, origin: 'https://kona.example' }, ours)).toBe(false);
  });
});

describe('what counts as a request', () => {
  const good = { source: BRIDGE, id: 'a1', request: { kind: 'marks' } };

  it('takes one of ours', () => {
    expect(isEnvelope(good)).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'kona-bridge'],
    ['a number', 7],
    ['nothing of ours', { hello: true }],
    ['another extension speaking', { source: 'other-bridge', id: 'a1', request: { kind: 'marks' } }],
    ['no id', { source: BRIDGE, request: { kind: 'marks' } }],
    ['an empty id', { source: BRIDGE, id: '', request: { kind: 'marks' } }],
    ['no request', { source: BRIDGE, id: 'a1' }],
    ['a request that is not one', { source: BRIDGE, id: 'a1', request: 'marks' }],
    ['a request with no kind', { source: BRIDGE, id: 'a1', request: {} }],
  ])('refuses %s', (_name, data) => {
    expect(isEnvelope(data)).toBe(false);
  });
});

describe('what counts as a reply', () => {
  it('takes one of ours', () => {
    expect(isReply({ source: BRIDGE, id: 'a1', reply: { kind: 'ok' } })).toBe(true);
  });

  it('refuses a reply from somebody else', () => {
    expect(isReply({ source: 'other', id: 'a1', reply: { kind: 'ok' } })).toBe(false);
  });

  it('refuses a request echoed back as though it were a reply', () => {
    expect(isReply({ source: BRIDGE, id: 'a1', request: { kind: 'marks' } })).toBe(false);
  });
});

describe('the change notice', () => {
  it('is recognised', () => {
    expect(isChanged({ source: BRIDGE, changed: true })).toBe(true);
  });

  it('is not a reply, and a reply is not it', () => {
    expect(isChanged({ source: BRIDGE, id: 'a1', reply: { kind: 'ok' } })).toBe(false);
    expect(isReply({ source: BRIDGE, changed: true })).toBe(false);
  });

  it('is not satisfied by something merely truthy', () => {
    expect(isChanged({ source: BRIDGE, changed: 'yes' })).toBe(false);
  });
});

describe('where the bridge is allowed to run', () => {
  it('is Kona own origin, and only that, in a shipped build', () => {
    // 3i: exactly one origin, and "just one more" is how a manifest grows back
    // to four. If this ever has to change, the decision changes first.
    expect(bridgeMatches(false)).toEqual(['https://kona.example/*']);
  });

  it('adds the dev server only when asked', () => {
    const dev = bridgeMatches(true);
    expect(dev).toContain(`${KONA_DEV_ORIGINS[0]}/*`);
    expect(dev).toContain(`${KONA_ORIGINS[0]}/*`);
  });

  it('never matches every site', () => {
    for (const pattern of bridgeMatches(true)) {
      expect(pattern).not.toMatch(/^\*|\/\/\*\//);
    }
  });
});
