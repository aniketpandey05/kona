import { useEffect, useState } from 'preact/hooks';
import type { Mark } from '../../src/core/types';
import type { LibrarySource } from './source';

/**
 * The bytes of every kept picture on screen (18).
 *
 * Asked for one highlight at a time rather than read with the library,
 * because a library of two hundred highlights holding a hundred pictures
 * would be megabytes crossing the bridge on every read, for rows nobody has
 * scrolled to. Each one is asked for once and then held.
 *
 * Nothing is ever fetched from where the picture came from. Kona kept a copy
 * when it was marked precisely so that opening your library does not tell
 * that host what you kept (6, 18), and an `<img src>` pointing at the
 * original would undo the whole reason for storing it.
 */
export function usePictures(marks: Mark[], source: LibrarySource | null): Map<string, string> {
  const [kept, setKept] = useState<Map<string, string>>(new Map());

  const wanted = marks
    .filter((mark) => mark.image?.kept)
    .map((mark) => mark.id)
    .join(' ');

  useEffect(() => {
    if (!source) return;
    let stopped = false;
    const ids = wanted ? wanted.split(' ') : [];
    void (async () => {
      for (const id of ids) {
        if (stopped) return;
        // Already held: a re-read of the library must not ask again for a
        // picture that has not changed.
        if (kept.has(id)) continue;
        const data = await source.image(id).catch(() => null);
        if (stopped || !data) continue;
        setKept((current) => new Map(current).set(id, data));
      }
    })();
    return () => {
      stopped = true;
    };
  }, [wanted, source]);

  return kept;
}
