# Founder profile — answers to paste

Companion to [`YC-ANSWERS.md`](YC-ANSWERS.md), which covers the company application. This
file is the **Founder Profile** page only. Same convention: anything marked **[YOU]** is a
fact I do not have and should not invent.

Verified on 2 November 2026: all four PyTorch-Ignite pull requests below are **merged**
into `pytorch/ignite`, authored by `aniketpandey05`, merged by maintainer `vfdev-5`.

---

## Fix these first — they block submission or contradict the application

| # | Field | What is wrong |
|---|---|---|
| 1 | **Date of birth** | Empty, and the form is already showing `Date of birth is required`. Nothing submits until this is set. |
| 2 | **Are you currently in school?** | Unanswered. Your education entry runs Jan 2023 – Jan 2028, so the truthful answer is Yes. |
| 3 | **Will you commit to working exclusively for the next year?** | Unanswered, and it explicitly reads *"you won't be in school."* See the note below — this one needs a decision, not wording. |
| 4 | **Work history employer: "PyTorch"** | It is **PyTorch-Ignite** (`pytorch/ignite`), not core PyTorch. `Engine`, `HitRate` and `Metric.__getattr__` are Ignite APIs, and core PyTorch passed PR #3697 back in 2017. A reader who clicks will notice. Changing the employer to `PyTorch-Ignite` costs you nothing and removes the only thing on this page that could read as inflation. |
| 5 | **Internship description** | The Jaypee HPC internship (Jun–Jul 2026) has an empty description. **[YOU: one or two lines — what you parallelised or benchmarked, on what hardware, and the speedup.]** |
| 6 | **Equity: 51%** | If you are applying solo, the expected answer is 100%. 51% reads as though there is a cofounder or an advisor split that the company application does not mention — and company Q1 says all the code is yours. Make the two pages agree. |

### On the exclusivity question

Your degree runs to Jan 2028 and the batch runs Jan–Mar 2027, so Yes and No are both real
answers with real consequences, and this one is yours to decide rather than mine. What
matters is that the answer here, "in school" above, and Q11 of the company application
(hours a week, and whether alongside study) all say the same thing. YC funds students who
defer or leave every batch; what reads badly is a Yes here sitting next to an enrolment
that runs through the batch, with nothing reconciling the two.

Minor, non-blocking: **Personal website** is empty — `https://aniketpandey05.github.io/kona/`
or your GitHub profile both work there. **X handle** is fine left blank if you do not use it.

---

## Accomplishments

### "The most impressive thing other than this startup that you have built or achieved"

> As an undergraduate with no affiliation and no introduction, I have four pull requests
> merged into PyTorch-Ignite, the training library in the PyTorch org — among them a new
> BatchSizeScheduler handler in the core library, and a fix for the HitRate metric, which
> had been silently returning a wrong value whenever top-k came back empty. Each was
> reviewed and merged by a core maintainer.

*Why this rather than Kona: the question excludes the startup, and "a stranger's code was
accepted into a library in the PyTorch org, four times" is a claim somebody else validated.
The empty-top-k fix is the best detail in it — a silently wrong number is the kind of bug
that reads as careful work rather than volume.*

Alternative, if you would rather lead with the specifics:

> I have four merged pull requests in PyTorch-Ignite (the training library in the PyTorch
> org): a BatchSizeScheduler handler I designed and landed in the core library (#3697), a
> fix for the HitRate metric silently returning a wrong value on empty top-k (#3719), tests
> for previously uncovered paths in Engine (#3660), and an error-reporting fix in
> Metric.__getattr__ (#3666) — all merged by a core maintainer, as an undergraduate with no
> affiliation.

### "Tell us about things you've built before… Include URLs if possible."

> **Kona** — what I am applying with. A browser extension that turns the passages you
> highlight on any page, including ChatGPT, Claude and Gemini conversations, into one
> searchable library. Every highlight keeps a link that lands on the exact sentence it came
> from, and because that link is an ordinary URL text fragment it works for someone who has
> never installed Kona. Highlights survive a page re-rendering or a reply being
> regenerated, because a passage is found again by its words and the words around it rather
> than by a DOM id. Six and a half weeks of work: 115 commits, ~12,600 lines of TypeScript,
> 336 tests across 24 files, and one shared core that ships to Chrome/Edge/Brave, Firefox,
> Safari on iPhone, iPad and Mac, an installable Android web app, and a Windows/macOS/Linux
> desktop app.
> - Code: https://github.com/aniketpandey05/kona
> - Site: https://aniketpandey05.github.io/kona/
> - Phone app, installable: https://aniketpandey05.github.io/kona/app/
> - The paid tier as a working demo: https://aniketpandey05.github.io/kona/team/#/tour
>
> **PyTorch-Ignite** (`pytorch/ignite`) — four merged pull requests:
> - BatchSizeScheduler, a new core handler for dynamic batch size scheduling: https://github.com/pytorch/ignite/pull/3697
> - Fix for the HitRate metric returning a wrong value on empty top-k: https://github.com/pytorch/ignite/pull/3719
> - Tests for previously uncovered paths in `Engine`: https://github.com/pytorch/ignite/pull/3660
> - `Metric.__getattr__` now reports the definition site on AttributeError: https://github.com/pytorch/ignite/pull/3666
>
> **High-performance computing, Jaypee Institute of Information Technology** (Jun–Jul 2026)
> — **[YOU: one line. What you built, on what hardware, and the number.]**

*Trim Kona's paragraph if the box feels long — the URLs and the five-platform line are the
part that does the work. Keep the Safari and Android detail: shipping to five platforms in
six weeks is the execution claim, and it is checkable.*

### "List any competitions/awards you have won, or papers you have published."

**[YOU.]** If there are none, leave it empty. An empty box costs nothing here; a box padded
with participation reads as padding, and four merged PRs in the PyTorch org is a stronger
signal than a hackathon shortlist anyway.

### "A time you most successfully hacked some (non-computer) system to your advantage"

**[YOU. I am not writing this one, and you should not let me — it is the most checkable
answer on the page, and a borrowed story will not survive the interview.]**

What they are looking for: evidence that you read how a system actually works, as distinct
from how it says it works, and then used that. It does not need to be impressive or large.
It needs to be true, legal, and legible in five sentences. Explicitly **not** a computer
hack — no exploits, no scripts, no automation.

Prompts, in rough order of how often they turn up a real answer:

- Something administrative at Jaypee — a rule, a quota, a registration deadline, an
  attendance or credit requirement — where you found the provision that applied to you and
  nobody else was using it.
- How you got the PyTorch-Ignite contributions taken seriously. If you worked out which
  issues a maintainer actually wanted closed, or that a test-coverage PR gets reviewed
  faster than a feature from an unknown contributor, and used that to earn a first merge —
  that is a real answer about reading a project's incentives. Borderline on "non-computer",
  but the system you read there was social, not technical.
- A queue, a booking system, a rail or airline fare rule, a refund or warranty policy, a
  fee structure, a scholarship or an exam-retake provision.
- Any time you got access to a person or a room you were not meant to have access to, by a
  legitimate route nobody else had noticed.

Shape that works: one sentence on the rule as everyone read it, one on what you noticed,
one on what you did, one on what you got. No moral at the end.

*Tell me the story in two lines and I will cut it to the box.*

---

## Already correct, for the record

Name, email, phone, gender, city (Delhi), title (engineering), technical founder (Yes),
LinkedIn, GitHub handle, both education entries, and the PyTorch-Ignite description itself
— which is specific, uses the real PR numbers, and is the strongest thing on the page.
Only the employer's name on that entry needs changing.
