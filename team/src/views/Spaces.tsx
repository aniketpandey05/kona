import { Avatar, Locked, spaceStatus } from '../components';
import { memberById } from '../demo';
import { isTeam } from '../entitlement';
import { allMarks, allSpaces } from '../store';
import type { Entitlement } from '../types';

export function Spaces({
  entitlement,
  onUpgrade,
  onOpen,
}: {
  entitlement: Entitlement;
  onUpgrade: () => void;
  onOpen: (id: string) => void;
}) {
  if (!isTeam(entitlement)) {
    return (
      <Locked
        title="Shared spaces"
        body="A space is where a team works on one question together — the evidence under it, what is still unknown, and the decision that came out. On your own there is nobody to share one with."
        onUpgrade={onUpgrade}
      />
    );
  }

  const marks = allMarks();
  const spaces = allSpaces();

  return (
    <section>
      <div class="view-top">
        <div>
          <h1>Spaces</h1>
          <p class="subtle">
            A space holds the evidence for one question. Some are only shelves, and that is
            a fine thing for a space to be.
          </p>
        </div>
      </div>

      <div class="spaces">
        {spaces.map((space) => {
          const status = spaceStatus(space);
          const held = marks.filter((mark) => mark.spaceId === space.id).length;
          return (
            <button
              key={space.id}
              type="button"
              class="space-card"
              onClick={() => onOpen(space.id)}
            >
              <header>
                <h2>{space.name}</h2>
                <span class={`status status-${status.tone}`}>{status.label}</span>
              </header>

              {space.question ? (
                <p class="space-question">{space.question}</p>
              ) : (
                <p class="space-question subtle">{space.purpose}</p>
              )}

              <dl class="space-counts">
                <div>
                  <dt>Highlights</dt>
                  <dd>{held}</dd>
                </div>
                {space.question && (
                  <>
                    <div>
                      <dt>Findings</dt>
                      <dd>{space.findings.length}</dd>
                    </div>
                    <div>
                      <dt>Still open</dt>
                      <dd class={space.openQuestions.length > 0 ? 'bad' : undefined}>
                        {space.openQuestions.length}
                      </dd>
                    </div>
                  </>
                )}
              </dl>

              <footer>
                {space.memberIds.map((id) => (
                  <Avatar key={id} member={memberById(id)} small />
                ))}
              </footer>
            </button>
          );
        })}
      </div>

      <p class="subtle footnote">
        The point of a space is that it can be unfinished. A folder is write-only — you put
        something in and never go back. A question with two things still unknown is a reason
        to return, and the thing a team actually shares.
      </p>
    </section>
  );
}
