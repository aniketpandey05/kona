import { useState } from 'preact/hooks';
import { TEST_CARD, WORKSPACE_REF } from '../billing';
import { YOU, memberById } from '../demo';
import { grantTeam } from '../entitlement';
import { activeSeats, log } from '../store';

const PER_SEAT = 14;

/**
 * The stand-in for Stripe Checkout, used when no payment link is configured so
 * the demo runs with no account and no keys. It follows the same steps a real
 * checkout does — line item, seat quantity, card, then a webhook that grants
 * the entitlement — and says plainly that nothing is charged.
 */
export function Checkout({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [seats, setSeats] = useState(Math.max(1, activeSeats()));
  const [state, setState] = useState<'form' | 'processing' | 'done'>('form');

  const total = seats * PER_SEAT;

  const pay = (): void => {
    setState('processing');
    // The pause stands in for the round trip and the webhook that follows it.
    setTimeout(() => {
      grantTeam(seats);
      log('checkout.completed', `checkout.session.completed — Team, ${seats} seats`);
      log('billing.entitlement_issued', `Entitlement issued for ${seats} seats, expires in 24h`);
      setState('done');
    }, 900);
  };

  if (state === 'done') {
    return (
      <section class="checkout">
        <div class="panel checkout-done">
          <h1>Payment received</h1>
          <p>
            Stripe sent <code>checkout.session.completed</code>, the billing service wrote the
            entitlement, and the client has a fresh token. The workspace is shared from now
            on.
          </p>
          <button type="button" class="primary" onClick={onDone}>
            Open the workspace
          </button>
        </div>
      </section>
    );
  }

  return (
    <section class="checkout">
      <div class="demo-note">
        Stand-in for Stripe Checkout — no card is charged and nothing is sent anywhere. Set{' '}
        <code>VITE_STRIPE_PAYMENT_LINK</code> to a test-mode payment link to use the real
        thing.
      </div>

      <div class="panel checkout-card">
        <header class="checkout-top">
          <strong>Kona Team</strong>
          <span class="mark-meta">{memberById(YOU).email}</span>
        </header>

        <div class="line">
          <div>
            <strong>Kona Team</strong>
            <span class="mark-meta">${PER_SEAT}.00 per seat / month</span>
          </div>
          <div class="qty">
            <button
              type="button"
              class="action"
              onClick={() => setSeats(Math.max(1, seats - 1))}
              disabled={state !== 'form'}
            >
              −
            </button>
            <span>{seats}</span>
            <button
              type="button"
              class="action"
              onClick={() => setSeats(seats + 1)}
              disabled={state !== 'form'}
            >
              +
            </button>
          </div>
        </div>

        <div class="line line-total">
          <strong>Due today</strong>
          <strong>${total}.00</strong>
        </div>

        <label>
          Card number
          <input type="text" value={TEST_CARD.number} readOnly />
        </label>
        <div class="row">
          <label>
            Expiry
            <input type="text" value={TEST_CARD.expiry} readOnly />
          </label>
          <label>
            CVC
            <input type="text" value={TEST_CARD.cvc} readOnly />
          </label>
        </div>
        <p class="subtle">
          Stripe&rsquo;s published test card, prefilled. It only works in test mode.
        </p>

        <button type="button" class="primary wide" onClick={pay} disabled={state !== 'form'}>
          {state === 'processing' ? 'Processing…' : `Pay $${total}.00`}
        </button>
        <button type="button" class="action wide" onClick={onCancel} disabled={state !== 'form'}>
          Cancel
        </button>

        <p class="subtle">
          <code>client_reference_id={WORKSPACE_REF}</code> travels with the payment, so the
          webhook knows which workspace to grant.
        </p>
      </div>
    </section>
  );
}
