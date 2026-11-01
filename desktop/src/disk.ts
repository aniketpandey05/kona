/**
 * The folder, as a real folder on a real disk.
 *
 * This is the whole reason the desktop app exists. In a browser a folder is a
 * handle behind a permission that expires, and only Chromium desktop will even
 * offer one — which is why Firefox, Safari and the phone are stuck doing the
 * round trip by hand. Here it is a path. There is no picker to be missing, no
 * permission to lapse, and nothing to re-grant after a restart, so the same
 * sync engine that runs in the extension runs on every operating system
 * without an asterisk.
 *
 * Nothing in here touches Electron, so it is all testable as plain Node.
 */

import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { SYNC_FILE, type Folder } from '../../src/core/sync';

/**
 * Writing without ever being half-written.
 *
 * The point of this folder is that a sync client is watching it, and a sync
 * client that reads the file mid-write uploads a truncated one — which the
 * other side then refuses, and the refusal looks like corruption rather than
 * timing. Writing beside it and renaming into place means the file is only
 * ever the old one or the new one. Rename replaces an existing file on
 * Windows as well as POSIX, so this needs no unlink first.
 */
async function writeAtomically(file: string, text: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  // Named after the file so two writers cannot collide, and dotted so a
  // folder listing does not show it in the half-second it exists.
  const temporary = join(dirname(file), `.${randomBytes(6).toString('hex')}.tmp`);
  try {
    await writeFile(temporary, text, 'utf8');
    await rename(temporary, file);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

/** The sync file in a folder, whether or not it is there yet. */
export function folderAt(directory: string): Folder {
  const file = join(directory, SYNC_FILE);
  return {
    async read() {
      try {
        return await readFile(file, 'utf8');
      } catch {
        // Not there is the ordinary first state of a folder nobody has put a
        // space in yet, and a folder that has gone away — an unplugged drive,
        // a sync client still catching up — is not a reason to lose anything
        // here. Either way there is nothing to take.
        return null;
      }
    },
    write: (text) => writeAtomically(file, text),
  };
}

/** Small JSON kept beside the app rather than in the folder being synced. */
export async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T;
  } catch {
    // A missing file and an unreadable one come to the same thing: no
    // settings, so start as if this were the first run.
    return null;
  }
}

export function writeJson(file: string, value: unknown): Promise<void> {
  return writeAtomically(file, JSON.stringify(value, null, 2));
}
