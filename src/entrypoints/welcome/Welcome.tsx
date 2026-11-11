import { browser, storage } from '#imports';
import { useEffect, useRef, useState } from 'preact/hooks';
import { HighlightPainter } from '../../core/painter';
import { COMING, RELEASES } from '../../core/releases';
import type { RuntimeMessage } from '../../core/messages';
import { PEN_COLORS } from '../../design/tokens';
import { KonaMark } from '../../ui/KonaMark';
import type { HighlightColor } from '../../core/types';

/**
 * One place that changes role (decision 4).
 *
 * **Welcome**, once, when Kona is installed: what it does, and the ladder in a
 * sentence. **About**, forever after: the releases, what is coming, and the
 * questions. Not two pages and not the same page twice — the welcome framing
 * is spent after it is used, and the reference framing takes over.
 *
 * **It flips on reaching the end, not on being opened.** The phone analogy is
 * the right one: setup abandoned halfway resumes, and only setup that finished
 * stops coming back.
 *
 * **No buy button.** The tiers are here to be seen, not sold. Somebody who has
 * had Kona for ninety seconds has no basis for the decision, and Free needs no
 * account, so stating the ladder early is reassurance rather than a pitch.
 *
 * **AI chats are named here and nowhere else.** With no site granted at
 * install and no `tabs` permission (3e), Kona cannot tell that you have opened
 * ChatGPT — so there is no later moment for the panel to introduce itself on a
 * chat. This page says it, or nobody finds it.
 */
const FINISHED = 'local:welcome-finished';

export function Welcome() {
  const [finished, setFinished] = useState<boolean | null>(null);

  useEffect(() => {
    void storage.getItem<boolean>(FINISHED).then((done) => setFinished(done === true));
  }, []);

  const finish = () => {
    void storage.setItem(FINISHED, true);
    setFinished(true);
  };

  // Nothing is drawn until it is known which of the two this is: flashing the
  // greeting at somebody who finished it months ago would be the one thing
  // decision 4 is trying to avoid.
  if (finished === null) return null;

  return (
    <main class="wel">
      <header class="wel-top">
        <KonaMark size={52} />
        <h1>{finished ? 'About Kona' : 'Kona'}</h1>
        <p class="wel-lede">
          {finished
            ? 'What changed, what is coming, and how it works.'
            : 'You highlight a passage anywhere you read, and you can find it again and land on the exact words.'}
        </p>
      </header>

      {!finished && <FirstTime onFinish={finish} />}

      <Releases />

      <section class="wel-section">
        <h2>Coming</h2>
        <ul class="wel-list">
          {COMING.map((each) => (
            <li key={each}>{each}</li>
          ))}
        </ul>
      </section>

      <Questions />
    </main>
  );
}

/** The part that is spent once it has been used. */
function FirstTime({ onFinish }: { onFinish: () => void }) {
  return (
    <>
      <RoundTrip />

      <section class="wel-section">
        <h2>Where it works</h2>
        <p>
          Anywhere you read, once you allow the site — an article, a
          documentation page, a paper. <strong>Including AI chats.</strong> A
          conversation with ChatGPT, Claude or Gemini is reading, the good part
          is worth keeping, and nothing else treats it as a page.
        </p>
        <p class="wel-quiet">
          Kona arrives able to read nothing at all, including those three. Open
          a page you want to keep something from, click Kona in the toolbar, and
          allow that one site. Nothing before that.
        </p>
      </section>

      <section class="wel-section">
        <h2>The ladder</h2>
        {/* 11 in one sentence: one device, every device, other people. No buy
            button — these are here to be seen, not sold. */}
        <dl class="wel-ladder">
          <dt>Free</dt>
          <dd>Alone, on one device.</dd>
          <dt>Pro</dt>
          <dd>Alone, on every device, kept in step.</dd>
          <dt>Team</dt>
          <dd>With other people.</dd>
        </dl>
        <p class="wel-quiet">
          An account is for keeping devices in step and nothing else. Free never
          needs one, and without one nothing leaves this machine.
        </p>
      </section>

      <div class="wel-finish">
        <button type="button" class="wel-button" onClick={onFinish}>
          That’s it — take me to Kona
        </button>
        <p class="wel-quiet">
          This page becomes <strong>About</strong> once you have been through
          it. Close it early and it will come back.
        </p>
      </div>
    </>
  );
}

/**
 * The round trip, done rather than described.
 *
 * Kona's value is delayed: marking text feels like nothing, and the payoff is
 * coming back and landing on the words. Every tool can colour text, so a page
 * that stops at *you highlighted something* has demonstrated a yellow
 * background.
 *
 * This runs the real `HighlightPainter` — the same code that paints every
 * highlight on every page — so what is being shown is the thing itself. It
 * needs nothing granted: a page served by the extension is the extension's own
 * page (3e), so the whole loop is teachable before a single permission is
 * asked for.
 */
function RoundTrip() {
  const passage = useRef<HTMLParagraphElement>(null);
  const painter = useRef<HighlightPainter | null>(null);
  const kept = useRef<Range | null>(null);
  const [step, setStep] = useState<'mark' | 'away' | 'found'>('mark');
  const [pen, setPen] = useState<HighlightColor>('yellow');

  useEffect(() => {
    if (!HighlightPainter.isSupported()) return;
    painter.current = new HighlightPainter(document);
    return () => painter.current?.dispose();
  }, []);

  const mark = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!passage.current?.contains(range.commonAncestorContainer)) return;
    kept.current = range.cloneRange();
    painter.current?.paint([{ color: pen, range: kept.current, noted: false }]);
    selection.removeAllRanges();
    setStep('away');
  };

  const findIt = () => {
    const range = kept.current;
    if (!range) return;
    range.startContainer.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    painter.current?.flashRange(range, 1200);
    setStep('found');
  };

  if (!HighlightPainter.isSupported()) {
    return (
      <section class="wel-section">
        <h2>One thing first</h2>
        <p>
          This browser cannot draw highlights the way Kona does. Kona needs the
          CSS Custom Highlight API — Chrome and Edge 105, Firefox 140, Safari
          17.2 — and below that it would install and then quietly draw nothing.
        </p>
      </section>
    );
  }

  return (
    <section class="wel-section wel-try">
      <h2>Try it, here</h2>
      <p class="wel-quiet">
        Marking text feels like nothing. The point is coming back to it, so do
        the whole loop rather than the first half of it.
      </p>

      <div class="wel-pens" role="group" aria-label="Pick a pen">
        {(Object.keys(PEN_COLORS) as HighlightColor[]).map((each) => (
          <button
            key={each}
            type="button"
            class={each === pen ? 'wel-pen wel-pen--on' : 'wel-pen'}
            style={{ background: PEN_COLORS[each] }}
            aria-label={each}
            aria-pressed={each === pen}
            onClick={() => setPen(each)}
          />
        ))}
      </div>

      <p ref={passage} class="wel-passage" onMouseUp={mark}>
        An amoeba moves by extending a pseudopod, a temporary projection of the
        cell body, and then flowing the rest of itself into the space the
        projection has made. The outer layer stiffens into a gel while the
        interior stays fluid, and pressure from the stiffened region drives the
        fluid forward. Nothing about the shape is permanent.
      </p>

      <ol class="wel-steps">
        <li class={step === 'mark' ? 'wel-step wel-step--now' : 'wel-step wel-step--done'}>
          Select any words above. They are marked as you let go.
        </li>
        <li class={step === 'away' ? 'wel-step wel-step--now' : step === 'found' ? 'wel-step wel-step--done' : 'wel-step'}>
          Now go somewhere else, the way you would close a tab.
          {step === 'away' && (
            <button
              type="button"
              class="wel-inline-button"
              onClick={() => scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
            >
              Scroll away
            </button>
          )}
        </li>
        <li class={step === 'found' ? 'wel-step wel-step--now' : 'wel-step'}>
          Come back and land on the exact words.
          {step !== 'mark' && (
            <button type="button" class="wel-inline-button" onClick={findIt}>
              Find it again
            </button>
          )}
        </li>
      </ol>

      {step === 'found' && (
        <p class="wel-landed">
          That is the whole of Kona. It does the same thing on a page that has
          been rewritten since you marked it — and says so plainly when the
          passage is truly gone, because your copy of it is kept either way.
        </p>
      )}
    </section>
  );
}

function Releases() {
  return (
    <section class="wel-section">
      <h2>What changed</h2>
      <p class="wel-quiet">
        These ship with the build rather than being fetched, so a Free install
        still sends nothing anywhere.
      </p>
      {RELEASES.map((release) => (
        <div class="wel-release" key={release.version}>
          <h3>{release.version}</h3>
          <ul class="wel-list">
            {release.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Questions() {
  const openLibrary = () =>
    void browser.runtime.sendMessage({ type: 'open-library' } satisfies RuntimeMessage);

  return (
    <section class="wel-section">
      <h2>Questions</h2>

      <h3>Why does Kona ask for each site separately?</h3>
      <p>
        Because the alternative is asking for all of them at once, before you
        have kept anything. Kona installs able to read nothing, and asks while
        you are standing on a page you want to keep something from.
      </p>

      <h3>Where do my highlights live?</h3>
      <p>
        On this device. Without an account nothing leaves it at all — no
        server, no sync, nothing fetched because of a page you kept something
        from.{' '}
        <button type="button" class="wel-link" onClick={openLibrary}>
          Open your library
        </button>
        .
      </p>

      <h3>What happens when a page changes?</h3>
      <p>
        Kona looks for the passage exactly, then ignoring whitespace, then
        approximately. When it still cannot find it, the highlight has lost its
        landing and not its words: the passage is still yours, still searchable,
        still in its spaces, because Kona copied it when you kept it.
      </p>

      <h3>Can I highlight a PDF?</h3>
      <p>
        Not in the browser’s own viewer — both engines treat it as privileged,
        so nothing of Kona runs inside it. You can still capture a passage from
        one by right-clicking.
      </p>

      <h3>Teams</h3>
      <p class="wel-quiet">
        Shared spaces — discussion, who gathered what, deciding together — are
        not built yet. When they are, they will be described here.
      </p>
    </section>
  );
}
