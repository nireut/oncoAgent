# oncoAgent

oncoAgent is the context base AI agents use to treat cancer patients. The tumor board uploads data here. The agents live here.

> Agents work inside; you stay in the loop.

---

## Table of contents

1. [What this is](#what-this-is)
2. [The loop, at a glance](#the-loop-at-a-glance)
3. [Walkthrough: a real PR through the system](#walkthrough-a-real-pr-through-the-system)
4. [The vault: how data is organized](#the-vault-how-data-is-organized)
5. [The web app: every surface, in one minute each](#the-web-app-every-surface-in-one-minute-each)
6. [The agent: what it does, what it sees](#the-agent-what-it-does-what-it-sees)
7. [Side challenges](#side-challenges)
8. [Stack](#stack)
9. [Run it locally](#run-it-locally)
10. [Where things live (file map)](#where-things-live-file-map)

---

## What this is

Agents treating cancer patients need a clean, current, structured oncology case to reason over. Email threads, PDFs, free-text notes, EHR fragments — none of that is enough on its own. **oncoAgent is that case.** One vault per patient. Every fact tied to a source. Every change reviewed.

Specialists on the tumor board (pathology, radiology, medical oncology, surgical oncology, radiation oncology, pharmacy, genomics, nursing) push their findings into the vault. The agent diffs every incoming change against the existing context, resolves the boring cases on its own, flags the ones it can't, asks the physician when it is genuinely stuck, and reasons over the assembled context to recommend treatment options at tumor board.

**The web app is not a tool for physicians.** It is the home for the agents. The physician-facing UI is a thin layer so the team can upload data, answer the agent's questions, and see that everything is working.

---

## The loop, at a glance

```
   Specialists                 Vault                    Agent
   (uploads)                (context base)         (reasons, flags)
        │                         ▲                       │
        │ opens PR                │ writes facts          │ reads + reasons
        ▼                         │                       ▼
  ┌──────────────┐         ┌─────────────┐         ┌──────────────┐
  │  pathology   │         │  per-patient │         │  diff incoming
  │  radiology   │────PR──▶│  facts +     │◀────────│  vs context  │
  │  med-onc     │         │  provenance  │         │  detect conflict
  │  surgery     │         │  + history   │         │  draft verdict
  │  genomics    │         └──────┬──────┘         └──────┬──────┘
  │  pharmacy    │                │                       │
  │  nursing     │                │                       ▼
  └──────────────┘                │              ┌────────────────┐
                                  │              │ Conflict?       │
                                  │              └────┬───────┬───┘
                                  │                yes│       │no
                                  │                   ▼       ▼
                                  │             ┌────────┐ ┌────────┐
                                  │             │ ping   │ │ auto-  │
                                  │             │ MD     │ │ merge  │
                                  │             └───┬────┘ └───┬────┘
                                  │                 │          │
                                  │                 ▼          │
                                  │           sign off /       │
                                  │           decline          │
                                  │                 │          │
                                  └─────────────────┴──────────┘
                                                    │
                                                    ▼
                                       agent re-reasons:
                                       plan · follow-up ·
                                       board case · meetings
```

**In words:**

1. **A specialist uploads data.** Pathology report, MRI, lab, infusion note, nurse call, anything. It opens a PR against the patient's vault.
2. **The agent diffs it** against the existing context. Each proposed change is fact-level (`staging.clinical: cT3 cN1 cM0 → cT4a cN1 cM0`), with the source attached.
3. **The agent posts a verdict.** *"Auto-merged — within normal protocol thresholds"* for routine deltas. *"Conflict on `staging.clinical`. Auto-merge blocked"* when the new value contradicts the current one in a way the agent won't resolve unilaterally.
4. **The physician signs off** (or declines). The only thing that blocks the merge is an unresolved conflict. Routine deltas the agent already auto-merged don't need a human at all.
5. **The vault updates.** The agent re-reasons over the new context: the treatment plan, the follow-up schedule, the active board case, the next meeting agenda — all kept in sync. Every downstream change writes another PR.

Forward-scheduled items (an MRI booked for next month, a follow-up CBC) sit on the inbox as "watching." When the data lands, they auto-promote to PRs — the agent never has to ask anyone to remember.

---

## Walkthrough: a real PR through the system

This is one of the seeded cases in the repo. Patient: **Thomas Berger**, locally advanced rectal cancer, mid-induction FOLFOX. PR id: `pr-tb-1`.

#### 1. Upload

Dr. K. Lee (Radiology) finishes the post-induction restaging MRI and uploads it.

```
Source     : Pelvic MRI · 2026-04-22
Author     : Dr. K. Lee, Radiology
Excerpt    : "Compared to 2026-03-08: tumor enhancement reduced ~30%
              but anterior extension now contacts visceral peritoneum
              (suggestive of cT4a). One persistent 7 mm mesorectal node."
```

This becomes a PR in the patient's inbox: *"Restaging MRI 2026-04-22 — staging change cT3 → cT4a"*.

#### 2. The agent diffs it

The agent reads the MRI excerpt, extracts three fact-level deltas, and attaches each to the same source so provenance is preserved:

```
─ staging.clinical
    before  cT3 cN1 cM0 — Stage IIIB
    after   cT4a cN1 cM0 — Stage IIIB (upstaged T)
    impact  Treatment intensification likely indicated.

─ imaging.restage
    after   Pelvic MRI · 2026-04-22 (post-induction)

─ plan.escalation
    after   Discuss adding short-course RT boost or earlier surgery
    impact  Tumor board decision required.
```

#### 3. The agent posts a verdict

The agent runs conflict detection. Two of the three deltas are additive (a new imaging entry, a new plan candidate) — those are fine. The third overwrites a load-bearing fact (`staging.clinical`), and the new value materially changes prognosis and the surgical plan.

The agent will not unilaterally resolve that. It opens a conflict:

```
SEVERITY  high
RATIONALE Visceral peritoneum involvement (cT4a) materially changes
          prognosis and surgical plan. Cannot be auto-merged — requires
          multidisciplinary review.

VERDICT   Conflict on staging.clinical. Auto-merge blocked. Recommended
          action: tumor board review on 2026-04-26.
```

#### 4. The PR shows up where the right people will see it

- In the patient's **Review** tab (top of the inbox, in the **Conflicts** stripe).
- In the **Agent panel** on the right rail under **Needs you** — labeled with the PR and the question.
- In the **Agent chat** (collapsible bottom-right): the agent seeds the conversation with its question so you can interrogate the reasoning before signing off.
- It also creates a draft **board case** for the next tumor board (`2026-04-26`) with the conflict pre-attached, so when Dr. Lee, Dr. Patel, Dr. Chen, and the others gather, the agenda is already set.

#### 5. Sign-off (or decline)

The physician opens the PR detail page (`/patients/thomas-b/prs/pr-tb-1`). They see the side-by-side diff, the conflict callout, the agent's verdict. The **Sign off** button is **disabled** while the conflict is unresolved.

To merge, someone has to either:

- **Resolve the conflict** (e.g. accept cT4a after board discussion, or reject the new MRI re-read), then sign off.
- **Decline** the PR with a reason, in which case the vault is unchanged and the agent records why.

When sign-off succeeds, the merge handler (`app/api/review/sign-off/route.ts`) does five things in one transaction:

1. Refuses to proceed if any unresolved conflicts remain.
2. Applies each delta to `facts` (insert if new, update if it already exists).
3. Writes a `fact_history` row per delta — every change is replayable.
4. Inserts a `record_commits` row tying the PR to the merged facts.
5. Marks the review item as `merged` with a timestamp.

#### 6. The agent re-reasons

With the staging upgraded, the treatment plan is now stale. The agent immediately:

- Re-runs the guideline match: `cT4a cN1 cM0` follows a different branch on the locally-advanced rectal pathway than `cT3 cN1 cM0`.
- Drafts a follow-up PR proposing a new plan phase ("short-course RT boost; reassess for earlier surgery").
- Updates the **Tumor board** case with ranked treatment options, each tied back to the facts that justify them, with cited evidence and toxicity/burden notes.
- Adjusts the **follow-up schedule** — the next imaging window moves earlier.
- Drops a note in the **next meeting agenda** so the case is queued.

None of that needed a second physician interaction. The first sign-off cascaded into a fresh, current treatment context.

---

## The vault: how data is organized

Every patient has one vault. The vault is a flat list of **facts**, each with:

| Field | Meaning |
| --- | --- |
| `key` | Stable identifier, dotted (`staging.clinical`, `lab.cbc`, `genomics.her2`). The agent reasons over keys, not labels. |
| `label` | Human-readable name. |
| `value` | The current value (string). |
| `confidence` | 0–1, used for graph node sizing and as a hint when conflict-checking. |
| `group` | One of `demographics`, `diagnosis`, `staging`, `medication`, `imaging`, `lab`, `history`, `genomics`. Drives the specialist folder grouping. |
| `specialty` | Which discipline owns this fact (`pathology`, `radiology`, `med-onc`, `surg-onc`, `rad-onc`, `pharmacy`, `nursing`, `molecular`). |
| `source` | A `SourceRef` — `kind` (`report` / `lab` / `imaging` / `pathology` / `note` / `email` / `meeting` / `pr` / `genomics`), `id`, `label`, `at`, optional `author` and `excerpt`. Every fact carries its provenance. |
| `updatedAt` | When this fact last changed. |

Two derived structures sit on top:

- **`fact_history`** — every change ever, with the PR that caused it. Read this and you have the full trajectory of the case.
- **`record_commits`** — a PR-level commit log. Each commit lists the deltas that landed together.

The home page renders the vault as a **knowledge graph**: the patient at the centre, group nodes around them, fact nodes off each group, source nodes at the edges. That graph is the agent's mental model, surfaced.

---

## The web app: every surface, in one minute each

Each route shown to the physician maps to one piece of agent behavior. Read this once and you'll know where to look for what.

### `/` — Vault grid
Every patient on one screen. Each card shows: cancer type, status, fact count, open PR count, conflict count. *"Each vault holds a patient's structured context base — records, treatment plan, imaging, and the history of every change. Agents work inside; you stay in the loop."*
File: `app/page.tsx`.

### `/patients/[id]` — The vault itself
The patient's full structured context. Left rail: specialist folders (Pathology · Radiology · Medical oncology · …) with fact counts. Main area: the knowledge graph + the all-records dashboard. Click into a specialist folder to see only their facts and attachments.
Files: `app/patients/[id]/page.tsx`, `components/vault/*`.

### `/patients/[id]/inbox` — The Review tab
The physician's worklist. Sections, in order:
- **Conflicts** (red) — PRs the agent refuses to auto-merge.
- **Needs review** (amber) — PRs the agent thinks should land but wants a second pair of eyes (e.g. patient-reported symptoms).
- **Agent issues** (amber) — open questions from the agent that aren't tied to a single PR.
- **Watching · scheduled uploads** — forward-booked items waiting to land. They become PRs automatically.
- **Signed off** — recent merges, for audit.

File: `app/patients/[id]/inbox/page.tsx`.

### `/patients/[id]/prs/[prId]` — PR detail
A pull-request style view of one proposed change. Top: source excerpt + author. Middle: side-by-side diff (`before` strikethrough red, `after` green) with the impact note for each delta. Inline conflict callouts where present. Bottom: the agent's verdict + Sign off / Decline buttons. Sign off is disabled while conflicts are unresolved.
Files: `app/patients/[id]/prs/[prId]/page.tsx`, `components/prs/*`.

### `/patients/[id]/board` — Tumor board
The agent's prepared case for the multidisciplinary discussion. Each treatment option is a card with: intent (curative / palliative / trial / watch), rationale bullets tied to specific facts, expected outcomes with citations, plan timeline, toxicity notes, burden notes, and a ranking distribution by specialist. There is also a **patient preview** mode that re-renders each option in plain language for the patient sign-off step.
Files: `app/patients/[id]/board/page.tsx`, `components/board/*`.

### `/patients/[id]/plan` — Treatment plan
The phase-by-phase roadmap proposed by the agent and ratified at board: induction → surgery → adjuvant → surveillance, with regimen, cycles, and dates. Every change to the plan writes another PR, so the timeline is always sourced.
Files: `app/patients/[id]/plan/*`, `components/plan/*`.

### `/patients/[id]/meetings` — Tumor board sessions
List of past and upcoming tumor boards. The agent attends each session, transcribes it, attributes statements to participants, and proposes plan adjustments as PRs you can review and merge after the meeting. Click into a meeting for the full transcript with agent notes.
Files: `app/patients/[id]/meetings/*`, `components/meetings/*`.

### `/patients/[id]/followup` — Follow-up schedule
Imaging, labs, visits, and tumor board discussions auto-scheduled by the agent based on the active plan and guidelines. Status flips to **overdue** automatically and triggers a nudge to the care team. When the data for a scheduled item arrives, the item promotes itself to a PR.
File: `app/patients/[id]/followup/*`, `components/followup/*`.

### `/patients/[id]/guidelines` — Pathway view
The clinical decision tree the patient is being matched against (e.g. NCCN BINV-J for HER2+ early breast). The agent highlights the patient's actual path through the tree based on their current facts. Click any node to see which fact key satisfied that rule.
Files: `app/patients/[id]/guidelines/*`, `components/guidelines/*`.

### Right rail — **Agent panel**
Always visible (≥ xl screens). Three sections:
- **Now** — what the agent is doing right this moment ("Watching Maria's vault", "Re-running plan after MRI 2026-04-22").
- **Needs you** — open questions, with the PR or fact they're tied to and a one-click jump.
- **Recent** — activity log: every action the agent took, with timestamp.

File: `components/shell/agent-panel.tsx`.

### Bottom-right — **Agent chat**
A collapsible streaming chat with the agent for the current patient. The chat is seeded with the agent's pending question (if any) so you can interrogate the reasoning before signing off. Multi-round tool execution: the agent can pull facts, PRs, the plan, the meeting transcript, the follow-up schedule, the guidelines pathway, the board case, and treatment options on demand.
Files: `components/agent-chat/*`, `app/api/chat/route.ts`.

---

## The agent: what it does, what it sees

The agent is built on a structured loop, not a free-form chat agent.

**System prompt** (`lib/chat/context.ts`) tells it three things:

1. **Conflict detection.** Every incoming delta is checked against the current vault. The agent decides: auto-merge / needs-review / conflict.
2. **Pattern detection.** Across facts, meetings, follow-ups, and labs, it surfaces patterns the team should know about (e.g. early neuropathy onset during cycle 4, LVEF trend during trastuzumab).
3. **Case assembly.** When tumor board is approaching or a load-bearing fact changes, it assembles the case: ranked treatment options, with citations and rationale tied to specific facts.

**Tools** (`lib/chat/tools.ts`) — ten patient-context tools the agent can call during multi-round execution:

| Tool | Returns |
| --- | --- |
| `get_patient_facts` | The current vault, optionally filtered by group |
| `get_pull_requests` | List of PRs (status, conflicts, opened-at) |
| `get_pr_details` | One PR — diff, conflicts, source, agent verdict |
| `get_treatment_plan` | The phase timeline + active phase |
| `get_meetings` | Tumor board sessions (past + upcoming) |
| `get_meeting_transcript` | One meeting's transcript + agent notes |
| `get_followup_schedule` | Scheduled / completed / overdue follow-up items |
| `get_guidelines` | The matched pathway, with the patient's path highlighted |
| `get_board_case` | The active board case (question, attendees, status) |
| `get_treatment_options` | Ranked options with rationale, outcomes, toxicities |

The chat endpoint (`app/api/chat/route.ts`) runs up to five rounds of tool execution before streaming the final text response.

**Sign-off** is the only step that touches the vault. It runs in `app/api/review/sign-off/route.ts`: refuses while conflicts exist, then applies deltas, writes `fact_history`, records a `record_commits` row, and marks the review item merged.

---

## Side challenges

### Fastino — Best use of [Pioneer](https://pioneer.ai/)

Pioneer is the brain of our data-ingestion pipeline. Every clinical record that lands in the vault passes through it before it ever reaches Supabase or the Neo4j knowledge graph.

**What we did:**

1. **Synthetic medical data generation.** The entire `mama_ca/` demo dataset — Linda Hoffmann's HR+/HER2-low metastatic breast cancer case across 11 file formats (PDFs, EMLs, JSON, CSV, JSONL, Markdown) — was generated with Pioneer. Realistic enough to drive the cascade demo end-to-end, no real PHI required.
2. **Fine-tuned GLiNER2 for clinical entity extraction.** Instead of calling a frontier LLM for every PDF / email / consult note, we trained a domain-specific GLiNER2 model on labeled oncology text. It pulls out structured entities — diagnoses, biomarkers, staging tokens, drug regimens, dates — at a fraction of the cost and latency of a general-purpose API call, deterministically.
3. **The extraction → Supabase → Neo4j pipeline.** GLiNER2 emits typed entities → we map them into normalized Supabase rows (`patients`, `facts`, `attachments`, `review_items`) → `lib/neo4j/sync.ts` then projects the relational graph into Aura. Every cascade fact (cM0 → cM1, plan supersession, the eight downstream operational events) flows through this path.

**Where it lives in the repo:**

- `lib/chat/providers/pioneer.ts` — Pioneer chat provider (drop-in for the Azure provider via `CHAT_PROVIDER=pioneer`).
- `lib/chat/tools.ts` — agent tool that calls the fine-tuned GLiNER2 NER endpoint.
- `PIONEER-SPEC.md` — the integration spec.
- `lib/neo4j/sync.ts` + `lib/neo4j/traverse.ts` — Supabase → Neo4j projection and graph traversal helpers.

**Why this is the strongest entry:**

- A *fine-tuned* model that *replaces*, not augments, frontier-LLM calls — exactly what the brief asks for.
- All three Pioneer surfaces in production use: synthetic data generation (the dataset), evaluation against frontier models (GLiNER2 vs. an Azure baseline), adaptive inference (the chat provider routes to Pioneer's Qwen3-235B for reasoning).
- A genuinely creative GLiNER2 use case: clinical entity extraction is hard precisely because the long tail (rare biomarkers, drug-class mentions, contradiction language) is where general LLMs hallucinate; a fine-tuned extractor anchored on labeled oncology text is the right tool.

### [Aikido](https://www.aikido.dev/) — Security scanning

The repo is connected to Aikido for continuous code-scanning. We're not running Aikido as a checkbox; we acted on every finding in the report:

- **Lodash CVE-2026-2950** (prototype pollution in `_.unset` / `_.omit`, transitive dep at 4.17.23). **Fixed.** Pinned via `pnpm.overrides` to `^4.18.0`; the lockfile now resolves `lodash@4.18.1`.
- **Path-traversal in `scripts/build-graph.ts:64,72`** (the `listFiles` / `readJson` helpers consumed paths). **Fixed.** Both helpers now route through `assertWithinDataRoot()` — any resolved path that escapes `~/Desktop/onco_data/mama_ca/` is rejected.
- **Path-traversal in `.tavily/research.py:223`** (write-anywhere via `--patients-json`). **Fixed.** New `_safe_write_target()` resolves the path, refuses anything outside CWD, and refuses to follow symlinks before writing.
- **"Exposed secrets" in `scripts/build-graph.ts:1046,1049`** (high severity in the report). **Diagnosed as false positive and documented** — the `key:` field is a clinical-fact identifier (`diagnosis.her2`, `genomics.pik3ca` — HER2 receptor and PIK3CA gene), not an API key. Comment added at the facts-block declaration so future scans understand the context.

The fixes shipped in commit `df5b1f6` ("Security: lodash CVE-2026-2950 + harden path I/O"). Screenshots of the original Aikido report are in the submission package.

### [Entire](https://entire.io/) — Agent activity tracking

Entire is wired up across the build to track everything the engineering agents do as they assemble the demo: every checkpoint, every prompt, every tool call. The full agent trail lives in the project's Entire workspace and is part of the submission. This is how we keep the build auditable end-to-end — the same accountability story the oncoAgent itself promises for clinicians (every fact links back to its source) applied to the development process behind it.

---

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn** + **@base-ui/react** for the UI
- **Supabase** (Postgres + auth) via `@supabase/ssr` and `@supabase/supabase-js`
- **@xyflow/react** + **@dagrejs/dagre** — guideline pathway graph
- **@neo4j-nvl/react** — vault knowledge graph
- **motion** for transitions, **lucide-react** for icons, **cmdk** for the command palette
- **date-fns**, **class-variance-authority**, **clsx + tailwind-merge** for the usual frontend plumbing

---

## Run it locally

Node 20+ recommended. Install dependencies, then start the dev server:

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint
```

Supabase keys (URL + anon key) and the chat-provider config are read from environment variables. See `lib/supabase/server.ts`, `lib/supabase/client.ts`, and `app/api/chat/route.ts` for the variables each module expects.

---

## Where things live (file map)

If you're contributing, this is the fastest tour of the repo.

```
app/
  page.tsx                          home — vault grid
  patients/[id]/
    page.tsx                        the vault (knowledge graph + records)
    layout.tsx                      patient shell (header, tabs, agent panel)
    inbox/page.tsx                  Review tab — PRs, conflicts, agent issues
    prs/[prId]/page.tsx             PR detail (diff + conflicts + sign-off)
    board/page.tsx                  tumor board case + ranked options
    plan/page.tsx                   treatment timeline
    meetings/                       sessions list + meeting detail
    followup/page.tsx               follow-up schedule
    guidelines/                     pathway visualization
  api/
    chat/route.ts                   streaming agent chat (multi-round tools)
    review/sign-off/route.ts        merge handler — writes facts + history
    review/decline/route.ts         decline handler

components/
  shell/                            patient shell — header, sidebar, tabs, agent panel, command palette
  vault/                            vault view, specialist folders, knowledge graph
  prs/                              PR list, diff, conflict callout, actions
  board/                            board case, option cards, patient preview
  plan/                             treatment timeline
  meetings/                         meetings list, summary, transcript
  followup/                         follow-up timeline
  guidelines/                       pathway flow + rule panel
  overview/                         fact cards + provenance popover
  agent-chat/                       collapsible streaming chat
  home/                             vault grid, workspace sidebar
  ui/                               shadcn primitives + small custom components

lib/
  types.ts                          Patient, Fact, PullRequest, Conflict, BoardCase, …
  data.ts                           data access layer (Supabase + mock fallback)
  chat/
    context.ts                      system prompt builder
    tools.ts                        the 10 patient-context tools
  mock-data/                        seeded patients, PRs, meetings, guidelines
  supabase/                         server + client factories

supabase/
  migrations/                       schema for facts, fact_history, record_commits, review_items, review_deltas, review_conflicts
```
