/**
 * Proving that the person who wrote this is the person who wrote the last one.
 *
 * Kona has no accounts, so until now a name in a shared space was simply
 * asserted: the file said "Sam Okafor" and there was nothing behind it. An
 * account would fix that by having a server vouch for the name, which is the
 * usual answer and the reason this looked like it needed one.
 *
 * It does not. A key made on Sam's own computer, that never leaves it, and a
 * signature over everything he writes, gets most of the way there. When a
 * space comes back, each of his contributions can be checked against the key
 * you already hold for him, and a reply that does not check out says so.
 *
 * What this does and does not prove, stated plainly, because the difference
 * matters and is easy to oversell:
 *
 * - It proves **continuity**. The person signing this file is the same person
 *   who signed the last one. Nobody can put words in their mouth, edit what
 *   they said in passing, or send you a space claiming to be them.
 * - It does **not** prove who they are in the world. The first time a name
 *   arrives you take it on trust, exactly as you do when a new machine's key
 *   first appears in `known_hosts`. An account proves the other thing; that
 *   this is the Sam your employer says it is, and that still needs a server.
 *
 * ECDSA on P-256 because it is in every browser that can run Kona, and
 * because the keys and signatures are small enough to sit inside a JSON file
 * that people email to each other.
 */

const CURVE = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIGNING = { name: 'ECDSA', hash: 'SHA-256' } as const;

export interface Keypair {
  /** The half that travels: a base64 SPKI, short enough to sit in the file. */
  publicKey: string;
  /** The half that never does. Kept as a JWK because storage holds JSON. */
  privateKey: JsonWebKey;
}

function subtle(): SubtleCrypto | null {
  // Every page Kona runs in is a secure context, so this is really only a
  // guard for a test environment that has not got one.
  return globalThis.crypto?.subtle ?? null;
}

function toBase64(bytes: ArrayBuffer): string {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

// Backed by a plain ArrayBuffer on purpose: WebCrypto will not take a view
// that might be over shared memory, which is what a bare Uint8Array could be.
function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const utf8 = new TextEncoder();

/** A new key for this computer. Made once, and kept for as long as you are you. */
export async function makeKeypair(): Promise<Keypair | null> {
  const crypto = subtle();
  if (!crypto) return null;
  const pair = await crypto.generateKey(CURVE, true, ['sign', 'verify']);
  return {
    publicKey: toBase64(await crypto.exportKey('spki', pair.publicKey)),
    privateKey: await crypto.exportKey('jwk', pair.privateKey),
  };
}

/** Signs one canonical string. Returns base64, or null if there is no key to sign with. */
export async function sign(privateKey: JsonWebKey, text: string): Promise<string | null> {
  const crypto = subtle();
  if (!crypto) return null;
  try {
    const key = await crypto.importKey('jwk', privateKey, CURVE, false, ['sign']);
    return toBase64(await crypto.sign(SIGNING, key, utf8.encode(text)));
  } catch {
    // A key that will not import is a key we cannot sign with, and a space
    // that goes out unsigned is better than one that does not go out.
    return null;
  }
}

/**
 * Whether this signature really is this text, signed by the holder of this
 * key. Anything malformed is false rather than an error: the input is a file
 * somebody sent, and the only safe answer to a broken one is "no".
 */
export async function verify(
  publicKey: string,
  text: string,
  signature: string,
): Promise<boolean> {
  const crypto = subtle();
  if (!crypto) return false;
  try {
    const key = await crypto.importKey('spki', fromBase64(publicKey), CURVE, false, ['verify']);
    return await crypto.verify(SIGNING, key, fromBase64(signature), utf8.encode(text));
  } catch {
    return false;
  }
}

/**
 * A short, readable form of a key, for the one case software cannot settle:
 * two people checking over the phone that they are talking about each other.
 * Four groups of four hex characters, which is enough to read out and not so
 * much that nobody will.
 */
export async function fingerprint(publicKey: string): Promise<string | null> {
  const crypto = subtle();
  if (!crypto) return null;
  try {
    const digest = await crypto.digest('SHA-256', fromBase64(publicKey));
    const hex = [...new Uint8Array(digest)]
      .slice(0, 8)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    return (hex.match(/.{4}/g) ?? []).join(' ');
  } catch {
    return null;
  }
}

/**
 * Joins the parts of something being signed into one string.
 *
 * Signing a structure means agreeing on how to write it down, and the only
 * requirement is that both sides write it identically. A separator that
 * cannot occur in any of the parts is what stops two different contributions
 * sharing a signature, without it, a reply of "a" on mark "bc" and one of
 * "ab" on mark "c" would sign the same bytes.
 */
export function canonical(parts: ReadonlyArray<string | number | undefined>): string {
  return parts.map((part) => (part === undefined ? '' : String(part))).join('\u0000');
}
