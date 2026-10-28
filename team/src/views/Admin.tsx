import { useState } from 'preact/hooks';
import { Avatar, Locked, timeAgo } from '../components';
import { memberById } from '../demo';
import { canWrite, downgrade, isTeam, markPastDue, tokenFor } from '../entitlement';
import { auditEvents, log } from '../store';
import type { Entitlement } from '../types';

export function Admin({
  entitlement,
  onUpgrade,
}: {
  entitlement: Entitlement;
  onUpgrade: () => void;
}) {
  const [showToken, setShowToken] = useState(false);

  if (!isTeam(entitlement)) {
    return (
      <Locked
        title="Admin"
        body="There is nothing to administer until a workspace exists. Team adds the console; Enterprise adds SSO, SCIM, retention and the audit export."
        onUpgrade={onUpgrade}
      />
    );
  }

  const writable = canWrite(entitlement);
  const events = auditEvents();
  const token = tokenFor(entitlement);

  const exportAudit = (): void => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'kona-audit-log.json';
    anchor.click();
    URL.revokeObjectURL(url);
    log('audit.exported', `Exported ${events.length} audit events`);
  };

  return (
    <section>
      <div class="view-top">
        <div>
          <h1>Admin</h1>
          <p class="subtle">Workspace Meridian · ws_meridian</p>
        </div>
      </div>

      <div class="panel">
        <h2>Subscription</h2>
        <dl class="facts">
          <div>
            <dt>Plan</dt>
            <dd>Team</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd class={entitlement.status === 'active' ? 'ok' : 'bad'}>{entitlement.status}</dd>
          </div>
          <div>
            <dt>Seats billed</dt>
            <dd>{entitlement.seats}</dd>
          </div>
          <div>
            <dt>Renews</dt>
            <dd>{new Date(entitlement.periodEnd).toLocaleDateString()}</dd>
          </div>
        </dl>

        <h3>The entitlement the client is holding</h3>
        <p class="subtle">
          The extension never talks to Stripe. It caches a short-lived signed token and
          trusts it until it expires, so neither Stripe nor our API being down can lock a
          paying customer out of their own highlights. This token expires{' '}
          {new Date(entitlement.expiresAt).toLocaleString()}.
        </p>
        <button type="button" class="action" onClick={() => setShowToken(!showToken)}>
          {showToken ? 'Hide the token' : 'Show the token'}
        </button>
        {showToken && (
          <>
            <pre class="token">{token}</pre>
            <pre class="token">
              {JSON.stringify(
                {
                  sub: 'ws_meridian',
                  plan: entitlement.plan,
                  seats: entitlement.seats,
                  status: entitlement.status,
                  iat: Math.floor(entitlement.issuedAt / 1000),
                  exp: Math.floor(entitlement.expiresAt / 1000),
                },
                null,
                2,
              )}
            </pre>
            <p class="subtle">
              Demo only: the signature is a placeholder. In the product this is signed with
              an asymmetric key, so the client can verify it without being able to mint one.
            </p>
          </>
        )}
      </div>

      <div class="panel">
        <h2>
          Enterprise controls <span class="locked-badge">Enterprise</span>
        </h2>
        <p class="subtle">
          Shown here so the shape is clear. These are the things a security review asks for,
          and they are the Enterprise tier rather than Team.
        </p>
        <ul class="controls">
          <li>
            <div>
              <strong>Single sign-on (SAML / OIDC)</strong>
              <span class="mark-meta">Require the identity provider for every member</span>
            </div>
            <button type="button" class="action" disabled>
              Configure
            </button>
          </li>
          <li>
            <div>
              <strong>SCIM provisioning</strong>
              <span class="mark-meta">
                Seats follow the directory, so offboarding actually removes access
              </span>
            </div>
            <button type="button" class="action" disabled>
              Configure
            </button>
          </li>
          <li>
            <div>
              <strong>Retention and legal hold</strong>
              <span class="mark-meta">Delete shared highlights after a fixed window</span>
            </div>
            <button type="button" class="action" disabled>
              Configure
            </button>
          </li>
          <li>
            <div>
              <strong>Data residency</strong>
              <span class="mark-meta">Pin the workspace to the EU or the US</span>
            </div>
            <button type="button" class="action" disabled>
              Configure
            </button>
          </li>
        </ul>
      </div>

      <div class="panel">
        <div class="view-top">
          <h2>Audit log</h2>
          <button type="button" class="action" onClick={exportAudit}>
            Export JSON
          </button>
        </div>
        <p class="subtle">
          Append-only. Every share, comment, invitation and billing change, which is what an
          internal AI policy asks for and what nobody can currently produce.
        </p>
        <ul class="audit">
          {events.map((event) => {
            const actor = memberById(event.actorId);
            return (
              <li key={event.id}>
                <Avatar member={actor} small />
                <code>{event.action}</code>
                <span class="audit-detail">{event.detail}</span>
                <span class="mark-meta">{timeAgo(event.at)}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div class="panel panel-danger">
        <h2>Try the edges</h2>
        <p class="subtle">
          Worth showing, because how a product behaves when payment fails is a fair question
          to ask of anyone selling a subscription.
        </p>
        <div class="row">
          <button
            type="button"
            class="action"
            disabled={!writable}
            onClick={() => {
              markPastDue();
              log('billing.payment_failed', 'invoice.payment_failed — 14-day grace started');
            }}
          >
            Simulate a failed payment
          </button>
          <button
            type="button"
            class="action action-danger"
            onClick={() => {
              log('subscription.cancelled', 'Downgraded to Free; shared layer withdrawn');
              downgrade();
            }}
          >
            Cancel the subscription
          </button>
        </div>
        <p class="subtle">
          Either way, no highlight is ever deleted. The local copy belongs to the person who
          made it, which is the promise the free tier makes and the paid one must not break.
        </p>
      </div>
    </section>
  );
}
