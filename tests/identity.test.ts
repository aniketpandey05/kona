import { describe, expect, it } from 'vitest';
import { canonical, fingerprint, makeKeypair, sign, verify } from '../src/core/identity';

describe('a key of your own', () => {
  it('comes with a public half short enough to put in a file', async () => {
    const pair = await makeKeypair();
    expect(pair).not.toBeNull();
    expect(typeof pair!.publicKey).toBe('string');
    expect(pair!.publicKey.length).toBeLessThan(200);
    expect(pair!.privateKey.kty).toBe('EC');
  });

  it('is a different key every time', async () => {
    const one = await makeKeypair();
    const two = await makeKeypair();
    expect(one!.publicKey).not.toBe(two!.publicKey);
  });
});

describe('signing something', () => {
  it('can be checked with the public half', async () => {
    const pair = (await makeKeypair())!;
    const signature = (await sign(pair.privateKey, 'the words I wrote'))!;
    expect(await verify(pair.publicKey, 'the words I wrote', signature)).toBe(true);
  });

  it('stops being true the moment the words move', async () => {
    const pair = (await makeKeypair())!;
    const signature = (await sign(pair.privateKey, 'the words I wrote'))!;
    expect(await verify(pair.publicKey, 'the words I never wrote', signature)).toBe(false);
  });

  it('cannot be passed off as somebody else’s', async () => {
    const mine = (await makeKeypair())!;
    const theirs = (await makeKeypair())!;
    const signature = (await sign(mine.privateKey, 'the words I wrote'))!;
    expect(await verify(theirs.publicKey, 'the words I wrote', signature)).toBe(false);
  });

  it('answers no, rather than throwing, to nonsense', async () => {
    const pair = (await makeKeypair())!;
    expect(await verify(pair.publicKey, 'anything', 'not-a-signature')).toBe(false);
    expect(await verify('not-a-key', 'anything', 'AAAA')).toBe(false);
  });
});

describe('a fingerprint', () => {
  it('is the same every time for the same key, and readable', async () => {
    const pair = (await makeKeypair())!;
    const once = await fingerprint(pair.publicKey);
    expect(once).toBe(await fingerprint(pair.publicKey));
    expect(once).toMatch(/^[0-9a-f]{4}( [0-9a-f]{4}){3}$/);
  });

  it('is different for a different key', async () => {
    const one = (await makeKeypair())!;
    const two = (await makeKeypair())!;
    expect(await fingerprint(one.publicKey)).not.toBe(await fingerprint(two.publicKey));
  });
});

describe('writing a contribution down to be signed', () => {
  it('cannot be made to say the same thing two ways', () => {
    // Without a separator these would both be "abc", and a signature over one
    // would be a valid signature over the other.
    expect(canonical(['a', 'bc'])).not.toBe(canonical(['ab', 'c']));
  });

  it('treats a missing part as a part that is missing', () => {
    expect(canonical(['a', undefined, 'b'])).not.toBe(canonical(['a', 'b']));
  });
});
