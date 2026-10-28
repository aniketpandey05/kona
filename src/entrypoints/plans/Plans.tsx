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
        <h2>Working with other people today</h2>
        <p>
          A space is a file you can hand over: open one, press <strong>Share</strong>, and
          send it. Whoever opens it gets your question, your passages, what you concluded and
          a link under each that lands on the exact sentence — and can add to it and send it
          back. It needs no account on either side, and it is in the free plan.
        </p>
        <p>
          What Team adds is removing the passing around: the same space, live, with everyone
          in it at once. That needs a server, and the server is not built. There is a working
          demo of the shape of it.
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
