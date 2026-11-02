import { TIERS, checkoutHref, stripeConfigured } from '../billing';
import { YOU, memberById } from '../demo';
import { isTeam } from '../entitlement';
import { activeSeats } from '../store';
import type { Entitlement } from '../types';

export function Pricing({
  entitlement,
  onCheckout,
}: {
  entitlement: Entitlement;
  onCheckout: () => void;
}) {
  const onTeam = isTeam(entitlement);
  const seats = activeSeats();
  const stripeUrl = checkoutHref(memberById(YOU).email);

  return (
    <section>
      <div class="view-top">
        <div>
          <h1>Plans</h1>
          <p class="subtle">
            The line is how far a copy of Kona reaches. Free is one device and never
            expires; Pro is all of your devices; Team is other people in your spaces.
          </p>
        </div>
      </div>

      <div class="tiers">
        {TIERS.map((tier) => {
          const current = (tier.id === 'team' && onTeam) || (tier.id === 'free' && !onTeam);
          return (
            <div key={tier.id} class={current ? 'tier tier-current' : 'tier'}>
              <header>
                <h2>{tier.name}</h2>
                <p class="tier-price">
                  <strong>{tier.price}</strong> <span class="subtle">{tier.cadence}</span>
                </p>
                <p class="tier-pitch">{tier.pitch}</p>
              </header>
              <ul>
                {tier.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <footer>
                {current ? (
                  <span class="chip chip-on">Current plan</span>
                ) : tier.action === 'upgrade' ? (
                  stripeUrl ? (
                    <a class="primary" href={stripeUrl}>
                      Upgrade, {seats} seats, ${seats * 14}/mo
                    </a>
                  ) : (
                    <button type="button" class="primary" onClick={onCheckout}>
                      Upgrade, {seats} seats, ${seats * 14}/mo
                    </button>
                  )
                ) : tier.action === 'contact' ? (
                  <a class="action" href="mailto:sales@kona.example?subject=Kona%20Enterprise">
                    Talk to us
                  </a>
                ) : (
                  <span class="subtle">Not in this demo</span>
                )}
              </footer>
            </div>
          );
        })}
      </div>

      <p class="subtle footnote">
        {stripeConfigured()
          ? 'Upgrade hands off to Stripe Checkout. Card details never touch us, which is what keeps this in PCI SAQ-A scope.'
          : 'Upgrade walks through a stand-in for Stripe Checkout, the same steps, with nothing charged and no card taken. Wired to a real key, that button hands off to Stripe instead, where card details never touch us, which is what keeps this in PCI SAQ-A scope.'}
      </p>
    </section>
  );
}
