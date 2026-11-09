import { beforeEach, describe, expect, it } from 'vitest';
import {
  fileIntoActiveSpace,
  keepOutOfActiveSpace,
  loadActiveSpace,
  loadActiveSpaceId,
  setActiveSpaceId,
} from '../src/core/activeSpace';
import { createSpace } from '../src/core/spaces';
import { loadSpaces, saveSpace } from '../src/core/store';

beforeEach(() => {
  localStorage.clear();
});

async function aSpace(name: string) {
  const space = createSpace(name);
  await saveSpace(space);
  return space;
}

describe('which space is active', () => {
  it('is none to begin with, which is normal', () => {
    // DEFINITIONS: one space is active at a time, and none being active is
    // normal -- highlights then go to the library only.
    return expect(loadActiveSpaceId()).resolves.toBeNull();
  });

  it('remembers the one that was set', async () => {
    const space = await aSpace('Amoebas');
    await setActiveSpaceId(space.id);
    expect(await loadActiveSpaceId()).toBe(space.id);
    expect((await loadActiveSpace())?.name).toBe('Amoebas');
  });

  it('holds only one at a time', async () => {
    const amoebas = await aSpace('Amoebas');
    const housing = await aSpace('Housing');
    await setActiveSpaceId(amoebas.id);
    await setActiveSpaceId(housing.id);
    expect((await loadActiveSpace())?.name).toBe('Housing');
  });

  it('forgets a space that has been deleted, rather than filing into nothing', async () => {
    // The panel must not go on saying highlights are going somewhere they are
    // not (2e), and the save path must not file into a space that is gone.
    const space = await aSpace('Amoebas');
    await setActiveSpaceId(space.id);
    localStorage.removeItem('spaces');
    expect(await loadActiveSpace()).toBeNull();
    expect(await loadActiveSpaceId()).toBeNull();
  });
});

describe('filing a new highlight', () => {
  it('goes into the active space as well as the library', async () => {
    const space = await aSpace('Amoebas');
    await setActiveSpaceId(space.id);
    const filed = await fileIntoActiveSpace('m1');
    expect(filed?.markIds).toEqual(['m1']);
    expect((await loadSpaces())[0]?.markIds).toEqual(['m1']);
  });

  it('says which space it went to, so the panel can say so too', async () => {
    const space = await aSpace('Amoebas');
    await setActiveSpaceId(space.id);
    expect((await fileIntoActiveSpace('m1'))?.name).toBe('Amoebas');
  });

  it('does nothing at all when no space is active', async () => {
    await aSpace('Amoebas');
    expect(await fileIntoActiveSpace('m1')).toBeNull();
    expect((await loadSpaces())[0]?.markIds).toEqual([]);
  });

  it('files the same highlight once, however often it is asked', async () => {
    const space = await aSpace('Amoebas');
    await setActiveSpaceId(space.id);
    await fileIntoActiveSpace('m1');
    await fileIntoActiveSpace('m1');
    expect((await loadSpaces())[0]?.markIds).toEqual(['m1']);
  });
});

describe('keeping one out after all', () => {
  it('takes it back out of the space', async () => {
    // 2g: one tap, taken immediately, while you are still looking at the
    // sentence and still know whether it belongs.
    const space = await aSpace('Amoebas');
    await setActiveSpaceId(space.id);
    await fileIntoActiveSpace('m1');
    await fileIntoActiveSpace('m2');
    await keepOutOfActiveSpace('m1');
    expect((await loadSpaces())[0]?.markIds).toEqual(['m2']);
  });

  it('leaves the space alone when the highlight was never in it', async () => {
    const space = await aSpace('Amoebas');
    await setActiveSpaceId(space.id);
    await fileIntoActiveSpace('m1');
    await keepOutOfActiveSpace('never-here');
    expect((await loadSpaces())[0]?.markIds).toEqual(['m1']);
  });

  it('does nothing when no space is active', async () => {
    await aSpace('Amoebas');
    expect(await keepOutOfActiveSpace('m1')).toBeNull();
  });
});
