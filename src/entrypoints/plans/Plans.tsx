import { browser } from '#imports';
import { useEffect } from 'preact/hooks';
import { CURRENT_PLAN, PLANS, PRICING_URL, TEAM_DEMO_URL } from '../../core/plans';
import { applyTheme, loadTheme, watchTheme } from '../../core/theme';
import type { Theme } from '../../core/theme';

/**
 * The plans, inside the extension.
 *
 * There is nothing to buy here and the page does not pretend otherwise: Free
 * is marked as the one you are on, and everything else says it is not built.
 * The reason to show it anyway is that people are entitled to know where a
 * free tool is going before they put their reading into it — particularly this
 * one, where the answer is that what you have keeps working on its own.
 */
export function Plans() {
  useEffect(() => {
    const use = (next: Theme) => applyTheme(next);
    void loadTheme().then(use);
    return watchTheme(use);
  }, []);

  return (
    <main class="pl">
      <header class="pl-top">
        <h1>Plans</h1>
        <a class="pl-tool" href={browser.runtime.getURL('/library.html')}>
          Library
        </a>
      </header>

      <p class="pl-lede">
        Kona is free for a single user, and that is not a trial. Everything on this computer
        — your highlights, your library, your spaces, the write-ups they produce — keeps
        working whether or not anything below ever ships.
      </p>

      <div class="pl-tiers">
        {PLANS.map((plan) => {
          const current = plan.id === CURRENT_PLAN;
          return (
            <article key={plan.id} class={current ? 'pl-tier pl-tier-on' : 'pl-tier'}>
              <div class="pl-tier-head">
                <h2>{plan.name}</h2>
                {current ? (
                  <span class="pl-badge">You are here</span>
                ) : (
                  <span class="pl-badge pl-badge-soon">Not built yet</span>
                )}
              </div>
              <p class="pl-price">
                <strong>{plan.price}</strong> <span>{plan.per}</span>
              </p>
              <p class="pl-pitch">{plan.pitch}</p>
              <ul class="pl-list">
                {plan.included.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      <section class="pl-note">
        <h2>What “by meaning” means here</h2>
        <p>
          Searching your library does two things at once. It ranks the passages that use
          the words you typed, and it looks for the ones that say the same thing in
          different words — so a search for <strong>downtime</strong> also finds the
          passage that only ever says <strong>cutover</strong>. When a word nobody typed
          earns a result its place, the search tells you which word it was.
        </p>
        <p>
          It works that out from your own highlights, by measuring which words keep
          arriving together in what you have kept, and it runs here with nothing to
          download. That gives it a real limit, worth knowing rather than discovering:
          it can only relate words you have actually seen together, and under eight
          highlights it has learned nothing and says nothing. Meaning that does not stop
          at your own library needs a model, and a model needs a server; that is what Pro
          would add.
        </p>
      </section>

      <section class="pl-note">
        <h2>Working with other people today</h2>
        <p>
          A space is a file you can hand over: open one, press <strong>Share</strong>, and
          send it. Whoever opens it gets your question, your passages, what you concluded and
          a link under each that lands on the exact sentence. They can reply to a passage
          where the passage is, conclude something of their own, and send it back — and it
          merges into the space you already have rather than arriving beside it, with both
          sides of the argument under the highlight and a name against every part. It needs
          no account on either side, and it is in the free plan.
        </p>
        <p>
          Two things it is not. Nobody is in the space at the same time as you, so the reply
          arrives when the file does. And a name here is one somebody typed, not one anything
          checked. Removing both is what Team is for; that needs a server, and the server is
          not built. There is a working demo of the shape of it.
        </p>
        <div class="pl-row">
          <a class="pl-primary" href={TEAM_DEMO_URL} target="_blank" rel="noreferrer noopener">
            See the Team demo
          </a>
          <a class="pl-tool" href={PRICING_URL} target="_blank" rel="noreferrer noopener">
            Pricing on the site
          </a>
        </div>
      </section>

      <p class="pl-fine">
        No part of Kona asks you for a card, and nothing on this computer is sent anywhere.
        Free is free for one person; the paid plans are what a team would pay for, if and
        when they exist.
      </p>
    </main>
  );
}
