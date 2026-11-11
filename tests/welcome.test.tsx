import { storage } from '#imports';
import { render } from 'preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Welcome } from '../src/entrypoints/welcome/Welcome';
import { COMING, RELEASES } from '../src/core/releases';

let host: HTMLElement | undefined;

/** Long enough for preact's effects, which it schedules on an animation frame. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 60));

async function draw() {
  host = document.createElement('div');
  document.body.append(host);
  render(<Welcome />, host);
  await settled();
  return host;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  if (host) render(null, host);
  host?.remove();
  host = undefined;
});

describe('the one place that changes role', () => {
  it('greets you the first time', async () => {
    const el = await draw();
    expect(el.querySelector('.wel-top h1')?.textContent).toBe('Kona');
    expect(el.querySelector('.wel-ladder')).not.toBeNull();
    expect(el.querySelector('.wel-finish')).not.toBeNull();
  });

  it('says so plainly where highlights cannot be drawn at all', async () => {
    // There is no Highlight API here, which is also the state of Safari below
    // 17.2 and Firefox below 140. Kona would install and then quietly draw
    // nothing, so the one page that opens by itself has to say why rather than
    // offer a demonstration that cannot work.
    const el = await draw();
    expect(el.querySelector('.wel-try')).toBeNull();
    expect(el.textContent).toMatch(/cannot draw highlights/i);
    expect(el.textContent).toMatch(/17\.2/);
  });

  it('is About once it has been finished', async () => {
    await storage.setItem('local:welcome-finished', true);
    const el = await draw();
    expect(el.querySelector('.wel-top h1')?.textContent).toBe('About Kona');
    // The welcome framing is spent after it is used.
    expect(el.querySelector('.wel-try')).toBeNull();
    expect(el.querySelector('.wel-ladder')).toBeNull();
    expect(el.querySelector('.wel-finish')).toBeNull();
  });

  it('flips on reaching the end, not on being opened', async () => {
    // The phone analogy: setup abandoned halfway resumes, and only setup that
    // finished stops coming back. Drawing it must not set the flag.
    await draw();
    expect(await storage.getItem('local:welcome-finished')).toBeNull();
  });

  it('keeps the reference half either way', async () => {
    const first = await draw();
    expect(first.querySelectorAll('.wel-release')).toHaveLength(RELEASES.length);
    render(null, first);
    first.remove();

    await storage.setItem('local:welcome-finished', true);
    const second = await draw();
    expect(second.querySelectorAll('.wel-release')).toHaveLength(RELEASES.length);
    expect(second.textContent).toContain(COMING[0]);
  });

  it('names the AI chats, because nowhere else can', async () => {
    // 3e leaves Kona unable to tell you have opened ChatGPT, so there is no
    // later moment for the panel to introduce itself on a chat.
    const el = await draw();
    expect(el.textContent).toMatch(/ChatGPT/);
    expect(el.textContent).toMatch(/Claude/);
    expect(el.textContent).toMatch(/Gemini/);
  });

  it('shows the ladder and sells nothing', async () => {
    // The tiers are here to be seen, not sold: somebody who has had Kona for
    // ninety seconds has no basis for the decision.
    const el = await draw();
    expect([...el.querySelectorAll('.wel-ladder dt')].map((d) => d.textContent)).toEqual([
      'Free',
      'Pro',
      'Team',
    ]);
    expect(el.textContent).not.toMatch(/buy|upgrade|\$\d/i);
  });
});

describe('the releases', () => {
  it('ship with the build rather than being fetched', () => {
    // Decision 6: a Free install sends nothing anywhere, so fetching a
    // changelog would reveal that somebody has Kona and when they opened it.
    expect(RELEASES.length).toBeGreaterThan(0);
    for (const release of RELEASES) {
      expect(release.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(release.notes.length).toBeGreaterThan(0);
    }
  });

  it('leads with the version running, not the newest that exists', () => {
    const versions = RELEASES.map((each) => each.version);
    const sorted = [...versions].sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true }),
    );
    expect(versions).toEqual(sorted);
  });

  it('promises what is coming without putting a date on it', () => {
    for (const each of COMING) expect(each).not.toMatch(/\b20\d\d\b|\bQ[1-4]\b/);
  });
});
