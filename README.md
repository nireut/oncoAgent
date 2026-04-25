# oncoAgent

oncoAgent is the context base AI agents use to treat cancer patients. The tumor board uploads data here; the agents live here.

## What it is

Agents need a clean, current, structured oncology case to reason over — free-text records and email chains aren't enough. oncoAgent is that case.

Specialists on the tumor board (pathology, radiology, med-onc, surgery, genomics) push their findings into a per-patient vault. Agents diff every incoming change against the existing context, resolve what they can, flag the conflicts they can't, ping the right physician when a human call is needed, and reason over the assembled context to recommend treatment options at tumor board.

The web app is **not a tool for physicians**. It is the home for the agents. The physician-facing UI is a thin layer so the team can upload data, answer the agent's questions, and see that everything is working.

> Agents work inside; you stay in the loop.

## How it works

1. **Specialist uploads data** → opens a PR against the patient's vault.
2. **Agent diffs it** against the existing context, flags conflicts inline, posts a verdict (e.g. *"Approved — no conflicts detected"*).
3. **Agent reaches out** if it's stuck — the question lands in the right physician's panel and chat.
4. **Physician signs off** (or declines). Unresolved conflicts block the merge; nothing else does.
5. **Vault updates**, and the agent re-reasons over the new context. The treatment plan, follow-up schedule, and active board case all stay in sync — every change writes another PR.

Forward-scheduled items (e.g. an MRI booked for next month) sit on the inbox as "watching." When the data lands, they auto-promote to PRs.

## What's in the repo today

| Surface | Path | Purpose |
| --- | --- | --- |
| Vault grid | `/` (`app/page.tsx`) | All patients, with open-PR and conflict counts |
| Patient vault | `/patients/[id]` (`components/vault/*`) | Structured context base, organized by specialty, with fact provenance |
| Inbox | `/patients/[id]/inbox` | Open PRs, conflicts, agent questions, scheduled uploads |
| PR detail | `/patients/[id]/prs/[prId]` (`components/prs/*`) | Diff view, conflict callout, agent verdict, sign-off |
| Tumor board | `/patients/[id]/board` (`components/board/*`) | Agent-prepared treatment options, ranked, with patient-facing preview |
| Treatment plan | `/patients/[id]/plan` | Phase timeline kept in sync via PRs |
| Meetings | `/patients/[id]/meetings` | Agent transcribes the session and proposes plan adjustments as PRs |
| Follow-up | `/patients/[id]/followup` | Agent-scheduled imaging, labs, visits; auto-promote to PRs when data lands |
| Guidelines | `/patients/[id]/guidelines` | Pathway visualization with the patient's path highlighted |
| Agent panel | right rail (`components/shell/agent-panel.tsx`) | **Now** (current action) · **Needs you** (open questions) · **Recent** (activity log) |
| Agent chat | `components/agent-chat/*` | Streaming chat with the patient's agent, seeded with any pending question |

The agent's reasoning surface lives in `lib/chat/`: `context.ts` builds the system prompt from the patient's facts, plan, board case, meetings, and guidelines; `tools.ts` exposes ten patient-context tools the agent calls during multi-round tool execution.

The merge itself is handled by `app/api/review/sign-off/route.ts` — it refuses to merge while conflicts exist, applies each delta to `facts`, writes a `fact_history` row, and records a `record_commits` entry so the change is replayable.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn** + **@base-ui/react** for the UI
- **Supabase** (Postgres + auth) via `@supabase/ssr` and `@supabase/supabase-js`
- **@xyflow/react** + **@dagrejs/dagre** + **@neo4j-nvl/react** for guideline and graph views
- **motion** for transitions, **lucide-react** for icons, **cmdk** for the command palette

## Run it locally

Node 20+ recommended.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint
```

Supabase keys (and the chat provider config) are read from environment variables — see `lib/supabase/server.ts`, `lib/supabase/client.ts`, and the `app/api/chat` route for the variables each module expects.

## Status

**Working today:** vault, PR + diff + conflict surface, sign-off API, agent panel and chat, board / plan / meetings / follow-up / guidelines views.

**Mocked or in progress:** live agent ingest from external EHR sources, push notifications to physicians outside the in-app panel, multi-agent fan-out across specialty roles.

## Scope

Oncology-first by design — the tumor board is the unit of collaboration and the workflow is built around it. The diff-and-merge model generalizes to any specialty, but that's a later concern.
