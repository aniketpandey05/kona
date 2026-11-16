import { COMING, RELEASES } from '../../src/core/releases';

/**
 * What's new, in the library (4, 24).
 *
 * The extension's welcome page becomes About after it has been finished once,
 * and that page can only be opened where the extension is. The library is the
 * place (3f) and is where somebody who has installed nothing still ends up,
 * so the same notes are here, from the same file.
 *
 * **They ship with the build and are never fetched** (6). Asking a server
 * what is new would mean every Free install telling us it exists and when it
 * was opened, for the sake of a list of features. The notes arrive with the
 * update they describe, which also makes them right for the version actually
 * running rather than for the newest one that exists.
 */
export function About({ version }: { version: string | null }) {
  return (
    <>
      <div class="lib-head">
        <h1>What&rsquo;s new</h1>
        <p>
          {version
            ? `The extension on this device is ${version}.`
            : 'The notes ship with the build, so nothing is fetched to show them.'}
        </p>
      </div>

      <section class="set-section">
        <h2>What Kona is</h2>
        <p class="set-quiet">
          You highlight a passage anywhere you read, and you can find it again
          and land on the exact words. Everything else follows from that.
        </p>
      </section>

      {RELEASES.map((release) => (
        <section class="set-section" key={release.version}>
          <h2>{release.version}</h2>
          <ul class="ab-list">
            {release.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ))}

      <section class="set-section">
        <h2>Coming</h2>
        {/* No dates. A roadmap with dates on it is a promise made by somebody
            who does not know yet; these are in the order they are likely to
            arrive and that is the whole of what they commit to. */}
        <ul class="ab-list">
          {COMING.map((each) => (
            <li key={each}>{each}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
