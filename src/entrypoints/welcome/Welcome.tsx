import { browser } from '#imports';
import { useEffect } from 'preact/hooks';
import type { RuntimeMessage } from '../../core/messages';
import { applyTheme, loadTheme } from '../../core/theme';
import { KonaMark } from '../../ui/KonaMark';

const SITES = [
  { name: 'ChatGPT', url: 'https://chatgpt.com' },
  { name: 'Claude', url: 'https://claude.ai' },
  { name: 'Gemini', url: 'https://gemini.google.com' },
];

const KEYS = [
  { keys: ['Alt', '⇧', 'H'], what: 'Highlight what you have selected' },
  { keys: ['Alt', '⇧', 'N'], what: 'Highlight it and start a note' },
  { keys: ['Alt', '⇧', '↓'], what: 'Jump to the next highlight' },
  { keys: ['Alt', '⇧', 'F'], what: 'Search everything you have saved' },
];

export function Welcome() {
  useEffect(() => {
    void loadTheme().then(applyTheme);
  }, []);

  const openLibrary = () => {
    void browser.runtime.sendMessage({ type: 'open-library' } satisfies RuntimeMessage);
  };

  return (
    <main class="wel">
      <header class="wel-hero">
        <KonaMark size={52} />
        <h1>Kona is ready</h1>
        <p class="wel-lede">
          Highlight anything you read, leave yourself a note, and find your way back to the exact
          spot. Nothing you save ever leaves this computer.
        </p>
      </header>

      <ol class="wel-steps">
        <li>
          <h2>Select some text</h2>
          <p>
            Open a chat on {SITES.map((site, i) => (
              <>
                {i > 0 && (i === SITES.length - 1 ? ' or ' : ', ')}
                <a href={site.url} target="_blank" rel="noreferrer">
                  {site.name}
                </a>
              </>
            ))}{' '}
            and select a sentence. A small row of colours appears — pick one. You can also
            right-click a selection and choose <strong>Highlight with Kona</strong>.
          </p>
        </li>
        <li>
          <h2>Add a note, if it helps</h2>
          <p>
            The ✎ button on a highlight opens a note and a place for tags. Tags pull related
            highlights together later, across every chat and site.
          </p>
        </li>
        <li>
          <h2>Find it again</h2>
          <p>
            A panel on the right lists this page's highlights in the order you made them — drag the
            grip to reorder, click one to jump to it. Everything you have ever saved lives in your
            library, searchable and filterable.
          </p>
          <button class="wel-button" onClick={openLibrary}>
            Open my library
          </button>
        </li>
        <li>
          <h2>Work something out in a space</h2>
          <p>
            A space is one question and the highlights that answer it. Gather a few and you
            already have a write-up — each passage quoted, with a link under it that lands on
            the exact sentence, so anyone can check it without having Kona. Write down what
            you concluded and that goes on top, citing the highlights it rests on.
          </p>
          <p>
            A space is also a file. Press <strong>Share</strong> and send it to whoever has
            to act on it: they get your question, your evidence and your conclusions, can add
            to it, and can send it back.
          </p>
          <a class="wel-button" href={browser.runtime.getURL('/spaces.html')}>
            Open spaces
          </a>
        </li>
        <li>
          <h2>Turn on any other site</h2>
          <p>
            Blogs, docs, Stack Overflow, anything. Click the Kona button in the toolbar while you
            are on the site and switch it on; Chrome will ask you to allow it. The same switch turns
            a site back off, the chat sites included.
          </p>
        </li>
      </ol>

      <section class="wel-keys">
        <h2>Keyboard</h2>
        <ul>
          {KEYS.map(({ keys, what }) => (
            <li key={what}>
              <span class="wel-combo">
                {keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </span>
              <span>{what}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer class="wel-foot">
        <p>
          Kona stores everything in your browser and makes no network requests of any kind. It can
          only see the sites you switch on.
        </p>
      </footer>
    </main>
  );
}
