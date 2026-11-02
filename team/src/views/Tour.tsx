/**
 * What Team actually does, said once, before anybody has to go looking.
 *
 * The demo could always show all of this, but only to somebody who knew to
 * click Spaces, open the Postgres one and press Write it up. Anyone who did
 * not saw a list of highlights and left. This is the page the landing site
 * links at: every capability with what it is, how it works, and a way
 * straight to the screen that shows it.
 *
 * The last section is the one worth keeping honest. Three of the things Team
 * is sold on genuinely need a server and are not in here, and saying so on
 * the same page is cheaper than being caught at it.
 */

interface Feature {
  title: string;
  what: string;
  how: string;
  /** Where in the demo you can watch it happen. */
  see?: { label: string; hash: string };
}

const WORKING: Feature[] = [
  {
    title: 'One place the whole team can search',
    what: 'Everything anyone has shared, in a single library.',
    how: "Your highlights stay on your own machine until you put one in a space, so this is two libraries rather than one with permissions bolted on. Search covers both at once, by word and by meaning together, which is the thing a team cannot do today: your colleagues' highlights sit in their own browsers where nobody can look.",
    see: { label: 'Open the workspace', hash: '#/' },
  },
  {
    title: 'A space is one question and its evidence',
    what: 'Not a folder. A question, the passages that bear on it, and what came out.',
    how: 'Gather highlights under the question, draw findings out of them, mark what is still unknown, and record the decision when there is one. A space can stay unfinished, which is what makes it worth opening again on Monday.',
    see: { label: 'See the spaces', hash: '#/spaces' },
  },
  {
    title: 'A write-up that cites itself',
    what: 'Press Write it up and the memo assembles out of the space.',
    how: 'Every claim carries the passages it rests on, and every passage carries a link that lands on the exact sentence it came from. Somebody who has never installed Kona can check any line of it in one click. Take a highlight back out and the claims resting on it are marked as short a source rather than quietly standing on less.',
    see: { label: 'Open a settled space', hash: '#/spaces/s-pg17' },
  },
  {
    title: 'Discussion on the passage, not around it',
    what: 'Replies hang off the highlight itself.',
    how: 'A thread lives on the passage it is about, travels with the space, and merges both ways when two copies of a space meet. No separate thread in a chat app that nobody can find next month.',
    see: { label: 'See a thread', hash: '#/spaces/s-pg17' },
  },
  {
    title: 'Who found what, and who concluded what',
    what: 'Every contribution is named, and the name can be checked.',
    how: 'Putting your name in makes a signing key on your device. Everything you write in a shared space is signed with it, and a space coming back is checked against the key already held for you, so nobody can write a reply in your name and anything whose words moved after signing is flagged rather than hidden.',
    see: { label: 'See the credits', hash: '#/spaces/s-pg17' },
  },
  {
    title: 'Seats that follow who is actually in',
    what: 'Billed per person, on acceptance only.',
    how: 'An invitation sitting unopened holds no seat and costs nothing. Invite or remove anybody and the billed quantity comes apart from the real one until it is put back, which in the product is one call to Stripe and a prorated difference.',
    see: { label: 'Open Members', hash: '#/members' },
  },
  {
    title: 'What a security review asks for',
    what: 'An audit log, and a client that survives us being down.',
    how: 'Every change is written to a log you can export as JSON. The extension never talks to Stripe: it caches a short-lived signed entitlement and trusts it until it expires, so neither Stripe nor our own API falling over can lock a paying team out of their own highlights.',
    see: { label: 'Open Admin', hash: '#/admin' },
  },
];

const NOT_HERE: Feature[] = [
  {
    title: 'A space that updates as people type',
    what: 'Live, rather than when a sync client catches up.',
    how: 'Free Kona already keeps a space in step through a shared folder, which takes seconds rather than being instant. Making it live needs a server holding the space, and that is one of the things Team is for.',
  },
  {
    title: 'Who may read and who may write',
    what: 'Set per person, and taken back when you need to.',
    how: 'A shared folder has one permission: whoever can open it can read all of it, and you cannot un-send. Revoking one person without un-sharing everything needs somebody holding the permission, which means a server.',
  },
  {
    title: 'Names your organisation vouches for',
    what: 'Rather than ones you took on trust the first time.',
    how: 'A signing key proves somebody is the same person who wrote last time. It does not prove who they are in the world. That takes an identity provider, which is what SSO on the Enterprise tier is.',
  },
];

function Card({ feature }: { feature: Feature }) {
  return (
    <article class="tour-card">
      <h3>{feature.title}</h3>
      <p class="tour-what">{feature.what}</p>
      <p class="subtle">{feature.how}</p>
      {feature.see && (
        <a class="action" href={feature.see.hash}>
          {feature.see.label}
        </a>
      )}
    </article>
  );
}

export function Tour({ onStart }: { onStart: () => void }) {
  return (
    <section>
      <div class="view-top">
        <div>
          <h1>What Team does</h1>
          <p class="subtle view-how">
            Everything below is switched on in this demo, on an invented company with
            invented people. Nothing is charged and no account is made. Each one says how
            it works and goes straight to the screen that shows it.
          </p>
        </div>
      </div>

      <div class="tour-go">
        <button type="button" class="primary" onClick={onStart}>
          Show me Team
        </button>
        <span class="subtle">Or read first, and follow the links.</span>
      </div>

      <div class="tour-grid">
        {WORKING.map((feature) => (
          <Card key={feature.title} feature={feature} />
        ))}
      </div>

      <h2 class="tour-heading">Three things that are not in here</h2>
      <p class="subtle tour-why">
        These genuinely need a server, and the server is not built. They are the reason
        Team is a paid tier rather than a feature of the free one, and leaving them off
        this page would be the easiest thing to be caught on.
      </p>
      <div class="tour-grid">
        {NOT_HERE.map((feature) => (
          <Card key={feature.title} feature={feature} />
        ))}
      </div>
    </section>
  );
}
