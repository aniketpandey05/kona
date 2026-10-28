import { useState } from 'preact/hooks';
import { Avatar, Locked } from '../components';
import { YOU } from '../demo';
import { canWrite, isTeam, setSeats } from '../entitlement';
import { activateSeat, activeSeats, invite, log, removeMember, allMembers } from '../store';
import type { Entitlement } from '../types';

export function Members({
  entitlement,
  onUpgrade,
}: {
  entitlement: Entitlement;
  onUpgrade: () => void;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  if (!isTeam(entitlement)) {
    return (
      <Locked
        title="Members and seats"
        body="The free version has no account, so there is nobody to add. Team is where a workspace, seats and roles start."
        onUpgrade={onUpgrade}
      />
    );
  }

  const writable = canWrite(entitlement);
  const seats = activeSeats();
  const billed = entitlement.seats;
  const drifted = seats !== billed;

  return (
    <section>
      <div class="view-top">
        <div>
          <h1>Members</h1>
          <p class="subtle">
            {seats} seats in use · billed for {billed} · ${billed * 14}/month
          </p>
        </div>
      </div>

      {drifted && (
        <div class="warn">
          <strong>Seat count has moved.</strong> {seats} people hold a seat but Stripe is
          billing for {billed}.{' '}
          {writable ? (
            <button
              type="button"
              class="action"
              onClick={() => {
                setSeats(seats);
                log('billing.quantity_updated', `Subscription quantity set to ${seats}`);
              }}
            >
              Update the subscription quantity
            </button>
          ) : (
            'Sort the payment out first.'
          )}
          <p class="subtle">
            In the real product this is one API call and Stripe prorates the difference. An
            invited person who has not accepted holds no seat, so invitations are free.
          </p>
        </div>
      )}

      <form
        class="invite"
        onSubmit={(event) => {
          event.preventDefault();
          const result = invite(email);
          if (result.ok) {
            setEmail('');
            setError('');
          } else {
            setError(result.reason);
          }
        }}
      >
        <input
          type="text"
          placeholder="name@company.com"
          value={email}
          disabled={!writable}
          onInput={(event) => {
            setEmail((event.currentTarget as HTMLInputElement).value);
            setError('');
          }}
        />
        <button type="submit" class="primary" disabled={!writable || !email.trim()}>
          Invite
        </button>
      </form>
      {error && <p class="error">{error}</p>}

      <ul class="members">
        {allMembers().map((member) => (
          <li key={member.id}>
            <Avatar member={member} />
            <div class="member-who">
              <strong>
                {member.name}
                {member.id === YOU && ' (you)'}
              </strong>
              <span class="mark-meta">{member.email}</span>
            </div>
            <span class={member.role === 'member' ? 'chip' : 'chip chip-space'}>
              {member.role}
            </span>
            {member.seatActive ? (
              <span class="chip">seat</span>
            ) : (
              <span class="chip chip-private">invited</span>
            )}
            {!member.seatActive && writable && (
              <button type="button" class="action" onClick={() => activateSeat(member.id)}>
                Accept
              </button>
            )}
            {member.id !== YOU && writable && (
              <button
                type="button"
                class="action action-danger"
                onClick={() => removeMember(member.id)}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      <p class="subtle footnote">
        Removing someone frees their seat and keeps everything they shared, because a
        space belongs to the workspace rather than to a person. On Enterprise this list
        is driven by SCIM instead, which is the only way offboarding can be shown to work.
      </p>
    </section>
  );
}
