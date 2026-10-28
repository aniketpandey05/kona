import { useState } from 'preact/hooks';
import { linkToMark } from '../../../src/core/link';
import { siteLabel } from '../../../src/core/sites';
import { Avatar, Locked, spaceStatus, timeAgo } from '../components';
import { memberById } from '../demo';
import { canWrite, isTeam } from '../entitlement';
import { buildMemo, memoMarkdown } from '../memo';
import {
  addFinding,
  addOpenQuestion,
  closeOpenQuestion,
  marksIn,
  recordDecision,
  reopenSpace,
  sourcesInSpace,
  spaceOf,
} from '../store';
import type { Entitlement, Stance, TeamMark } from '../types';

const STANCE_LABEL: Record<Stance, string> = {
  supports: 'Supports',
  contradicts: 'Cuts against',
  open: 'Unresolved',
};

/** One piece of evidence under a claim: who found it, where, and the way back to it. */
function Evidence({ mark }: { mark: TeamMark }) {
  const author = memberById(mark.authorId);
  return (
    <li class="evidence">
      <Avatar member={author} small />
      <div>
        <span class="mark-meta">
          {author.name} · {siteLabel(mark)} · {mark.conversationTitle}
        </span>
        <blockquote class={`mark-quote mark-${mark.color}`}>{mark.snapshot}</blockquote>
        <a class="evidence-link" href={linkToMark(mark)} target="_blank" rel="noreferrer noopener">
          Open the exact sentence
        </a>
      </div>
    </li>
  );
}

export function Space({
  id,
  entitlement,
  onBack,
  onUpgrade,
}: {
  id: string;
  entitlement: Entitlement;
  onBack: () => void;
  onUpgrade: () => void;
}) {
  const [showMemo, setShowMemo] = useState(false);
  // What a claim rests on is the thing you open to check, not the thing you
  // read down the page. Shut by default, one finding at a time.
  const [openEvidence, setOpenEvidence] = useState<string[]>([]);
  const [showSpare, setShowSpare] = useState(false);
  const [addingFinding, setAddingFinding] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [deciding, setDeciding] = useState(false);

  const [claim, setClaim] = useState('');
  const [stance, setStance] = useState<Stance>('supports');
  const [chosen, setChosen] = useState<string[]>([]);
  const [question, setQuestion] = useState('');
  const [decision, setDecision] = useState('');
  const [copied, setCopied] = useState(false);

  // The Spaces list is gated, so it is easy to assume a single space is too.
  // It is not reached only from that list: a link from a colleague, a bookmark,
  // or going back after a downgrade all land here directly.
  if (!isTeam(entitlement)) {
    return (
      <Locked
        title="Shared spaces"
        body="A space is one question a team is working on together — the evidence gathered under it, what is still unknown, and what was decided. It needs a shared workspace to live in."
        onUpgrade={onUpgrade}
      />
    );
  }

  const space = spaceOf(id);
  if (!space) {
    return (
      <section>
        <p class="empty">That space is gone.</p>
        <button type="button" class="action" onClick={onBack}>
          Back to spaces
        </button>
      </section>
    );
  }

  const writable = canWrite(entitlement);
  const status = spaceStatus(space);
  const held = marksIn(space.id);
  const cited = new Set(space.findings.flatMap((finding) => finding.markIds));
  const spare = held.filter((mark) => !cited.has(mark.id));
  const memo = buildMemo(space, (ids) => sourcesInSpace(space.id, ids));

  const toggleEvidence = (findingId: string): void =>
    setOpenEvidence(
      openEvidence.includes(findingId)
        ? openEvidence.filter((entry) => entry !== findingId)
        : [...openEvidence, findingId],
    );

  const copyMemo = (): void => {
    void navigator.clipboard?.writeText(memoMarkdown(memo)).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      },
      () => {
        // Clipboard permission can be refused; the memo is on screen regardless.
      },
    );
  };

  const togglePick = (markId: string): void =>
    setChosen(
      chosen.includes(markId) ? chosen.filter((entry) => entry !== markId) : [...chosen, markId],
    );

  return (
    <section>
      <button type="button" class="action back" onClick={onBack}>
        ← Spaces
      </button>

      <div class="view-top space-head">
        <div>
          <h1>{space.name}</h1>
          {space.question ? (
            <p class="space-question-big">{space.question}</p>
          ) : (
            <p class="subtle">{space.purpose}</p>
          )}
          <p class="subtle">
            {space.memberIds.length} people · {held.length} highlights · {space.findings.length}{' '}
            findings
            {space.openQuestions.length > 0 && ` · ${space.openQuestions.length} still open`}
          </p>
        </div>
        <span class={`status status-${status.tone}`}>{status.label}</span>
      </div>

      {space.decision && (
        <div class="panel decision">
          <h2>Decision</h2>
          <p>{space.decision.body}</p>
          <p class="subtle">
            {memberById(space.decision.decidedBy).name} · {timeAgo(space.decision.decidedAt)}
          </p>
          {writable && (
            <button type="button" class="action" onClick={() => reopenSpace(space.id)}>
              Reopen
            </button>
          )}
        </div>
      )}

      {space.question && (
        <>
          <div class="panel">
            <div class="view-top">
              <h2>What we found</h2>
              {space.findings.length > 0 && (
                <button type="button" class="action" onClick={() => setShowMemo(!showMemo)}>
                  {showMemo ? 'Hide the write-up' : 'Write it up'}
                </button>
              )}
            </div>

            {space.findings.length === 0 ? (
              <p class="subtle">
                Nothing drawn out of the evidence yet. A finding is what the team now
                believes, and the highlights it rests on.
              </p>
            ) : (
              <ul class="findings">
                {space.findings.map((finding) => {
                  const author = memberById(finding.authorId);
                  const { present: sources, withdrawn } = sourcesInSpace(
                    space.id,
                    finding.markIds,
                  );
                  const open = openEvidence.includes(finding.id);
                  return (
                    <li key={finding.id} class={`finding finding-${finding.stance}`}>
                      <div class="finding-top">
                        <span class={`stance stance-${finding.stance}`}>
                          {STANCE_LABEL[finding.stance]}
                        </span>
                        <span class="mark-meta">
                          {author.name} · {timeAgo(finding.createdAt)}
                        </span>
                      </div>
                      <p class="claim">{finding.claim}</p>
                      <button
                        type="button"
                        class={open ? 'action action-on' : 'action'}
                        aria-expanded={open}
                        onClick={() => toggleEvidence(finding.id)}
                      >
                        {sources.length} {sources.length === 1 ? 'source' : 'sources'}
                      </button>
                      {withdrawn > 0 && (
                        <p class="withdrawn">
                          {/* Made private or deleted outright look the same from in
                              here, so say what is true of both rather than guess. */}
                          {withdrawn === 1
                            ? 'One source is no longer in this space.'
                            : `${withdrawn} sources are no longer in this space.`}
                        </p>
                      )}
                      {open && sources.length > 0 && (
                        <ul class="evidence-list evidence-open">
                          {sources.map((mark) => (
                            <Evidence key={mark.id} mark={mark} />
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {writable && spare.length > 0 && !addingFinding && (
              <button
                type="button"
                class="action panel-add"
                onClick={() => setAddingFinding(true)}
              >
                Draw out a finding
              </button>
            )}

            {writable && addingFinding && (
              <form
                class="add-finding"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!claim.trim() || chosen.length === 0) return;
                  addFinding(space.id, claim.trim(), stance, chosen);
                  setClaim('');
                  setChosen([]);
                  setStance('supports');
                  setAddingFinding(false);
                }}
              >
                <h3>Draw out a finding</h3>
                <input
                  type="text"
                  placeholder="What does the team now believe?"
                  value={claim}
                  onInput={(event) => setClaim((event.currentTarget as HTMLInputElement).value)}
                />
                <p class="subtle">Pick the evidence it rests on:</p>
                <ul class="picker">
                  {spare.map((mark) => (
                    <li key={mark.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={chosen.includes(mark.id)}
                          onChange={() => togglePick(mark.id)}
                        />
                        <span>
                          {siteLabel(mark)} · {mark.snapshot.slice(0, 90)}…
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div class="row">
                  <select
                    aria-label="How this finding relates to the question"
                    value={stance}
                    onChange={(event) =>
                      setStance((event.currentTarget as HTMLSelectElement).value as Stance)
                    }
                  >
                    <option value="supports">Supports the answer</option>
                    <option value="contradicts">Cuts against it</option>
                    <option value="open">Unresolved</option>
                  </select>
                  <button
                    type="submit"
                    class="primary"
                    disabled={!claim.trim() || chosen.length === 0}
                  >
                    Add
                    {chosen.length > 0
                      ? ` with ${chosen.length} source${chosen.length > 1 ? 's' : ''}`
                      : ''}
                  </button>
                  <button
                    type="button"
                    class="action"
                    onClick={() => {
                      setAddingFinding(false);
                      setClaim('');
                      setChosen([]);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {showMemo && (
            <div class="panel memo">
              <div class="view-top">
                <h2>The write-up</h2>
                <button type="button" class="action" onClick={copyMemo}>
                  {copied ? 'Copied as Markdown' : 'Copy as Markdown'}
                </button>
              </div>
              <p class="subtle">
                Assembled from the findings. Every claim carries the sources it rests on, and
                every source link lands on the exact sentence — so whoever reads this can
                check it without having Kona.
              </p>

              <h3 class="memo-title">{memo.title}</h3>
              {memo.decision && <p class="memo-decision">{memo.decision}</p>}
              <ul class="memo-lines">
                {memo.lines.map((line, i) => (
                  <li key={i}>
                    {line.contradicts && <em>Against: </em>}
                    {line.claim}{' '}
                    {line.cites.map((n) => (
                      <sup key={n}>
                        <a href={`#cite-${n}`}>[{n}]</a>
                      </sup>
                    ))}
                    {line.withdrawn > 0 && (
                      <em class="withdrawn-inline">
                        {' '}
                        ({line.withdrawn} withdrawn)
                      </em>
                    )}
                  </li>
                ))}
              </ul>
              {memo.open.length > 0 && (
                <>
                  <h3>Still open</h3>
                  <ul class="memo-lines">
                    {memo.open.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                </>
              )}
              <h3>Sources</h3>
              <ol class="memo-sources">
                {memo.citations.map((citation) => (
                  <li key={citation.n} id={`cite-${citation.n}`}>
                    {siteLabel(citation.mark)} — {citation.mark.conversationTitle}.{' '}
                    <a href={citation.href} target="_blank" rel="noreferrer noopener">
                      the exact sentence
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div class="panel">
            <h2>Still open</h2>
            {space.openQuestions.length === 0 ? (
              <p class="subtle">Nothing outstanding.</p>
            ) : (
              <ul class="open-questions">
                {space.openQuestions.map((entry, index) => (
                  <li key={entry}>
                    <span>{entry}</span>
                    {writable && (
                      <button
                        type="button"
                        class="action"
                        onClick={() => closeOpenQuestion(space.id, index)}
                      >
                        Settled
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {writable && !addingQuestion && (
              <button
                type="button"
                class="action panel-add"
                onClick={() => setAddingQuestion(true)}
              >
                Add a question
              </button>
            )}

            {writable && addingQuestion && (
              <form
                class="invite"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!question.trim()) return;
                  addOpenQuestion(space.id, question.trim());
                  setQuestion('');
                  setAddingQuestion(false);
                }}
              >
                <input
                  type="text"
                  placeholder="What do we still not know?"
                  value={question}
                  onInput={(event) => setQuestion((event.currentTarget as HTMLInputElement).value)}
                />
                <button type="submit" class="action" disabled={!question.trim()}>
                  Add
                </button>
                <button type="button" class="action" onClick={() => setAddingQuestion(false)}>
                  Cancel
                </button>
              </form>
            )}

            {!space.decision && writable && (
              <div class="settle">
                {deciding ? (
                  <form
                    class="invite"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!decision.trim()) return;
                      recordDecision(space.id, decision.trim());
                      setDecision('');
                      setDeciding(false);
                    }}
                  >
                    <input
                      type="text"
                      placeholder="So what are we doing?"
                      value={decision}
                      onInput={(event) =>
                        setDecision((event.currentTarget as HTMLInputElement).value)
                      }
                    />
                    <button type="submit" class="primary" disabled={!decision.trim()}>
                      Record it
                    </button>
                    <button type="button" class="action" onClick={() => setDeciding(false)}>
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <button type="button" class="primary" onClick={() => setDeciding(true)}>
                      Settle it
                    </button>
                    <p class="subtle">
                      A space is finished when there is something to tell everyone else. The
                      evidence stays attached to it, which is what makes the decision
                      checkable later.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <div class="panel">
        <div class="view-top">
          <h2>{space.question ? 'Evidence not yet used' : 'What is kept here'}</h2>
          {spare.length > 0 && (
            <button
              type="button"
              class={showSpare ? 'action action-on' : 'action'}
              aria-expanded={showSpare}
              onClick={() => setShowSpare(!showSpare)}
            >
              {showSpare ? 'Hide' : `Show ${spare.length}`}
            </button>
          )}
        </div>

        {spare.length === 0 ? (
          <p class="subtle">
            {held.length === 0
              ? 'Nothing here yet. Share a highlight into this space from the workspace.'
              : 'Every highlight in this space is behind a finding.'}
          </p>
        ) : (
          <>
            <p class="subtle">
              {spare.length} {spare.length === 1 ? 'highlight is' : 'highlights are'} in this
              space without a finding resting on {spare.length === 1 ? 'it' : 'them'} yet.
            </p>
            {showSpare && (
              <ul class="evidence-list evidence-open">
                {spare.map((mark) => (
                  <Evidence key={mark.id} mark={mark} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}
