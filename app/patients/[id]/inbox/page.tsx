import { notFound } from "next/navigation";
import {
  GitPullRequest,
  AlertOctagon,
  GitMerge,
  Eye,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import { getPatient, prsForPatient, followupForPatient } from "@/lib/data";
import { PRList } from "@/components/prs/pr-list";
import { FollowupTimeline } from "@/components/followup/followup-timeline";

const TODAY = new Date("2026-04-25T00:00:00Z");

export default async function InboxPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  const prs = (await prsForPatient(id)).sort(
    (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
  );
  const conflictPRs = prs.filter((p) => p.status === "conflict");
  const reviewPRs = prs.filter(
    (p) => p.status === "open" || p.status === "needs-review"
  );
  const mergedPRs = prs.filter((p) => p.status === "merged");

  const counts = {
    review: reviewPRs.length,
    conflict: conflictPRs.length,
    merged: mergedPRs.length,
    issues: patient.agent.needsYou.length,
  };

  const followups = await followupForPatient(id);
  const upcoming = followups
    .filter((i) => i.status === "scheduled" && new Date(i.date) >= TODAY)
    .slice(0, 4);

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 overflow-y-auto px-6 py-6">
      <header>
        <span className="mono text-[11px] uppercase tracking-[0.16em] text-violet-600">
          Review
        </span>
        <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
          Incoming changes & open questions
        </h2>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          icon={<AlertOctagon className="h-3.5 w-3.5 text-rose-500" />}
          label="Conflicts"
          value={counts.conflict}
          highlight={counts.conflict > 0}
        />
        <Stat
          icon={<Eye className="h-3.5 w-3.5 text-amber-500" />}
          label="Needs review"
          value={counts.review}
        />
        <Stat
          icon={<AlertCircle className="h-3.5 w-3.5 text-amber-600" />}
          label="Agent issues"
          value={counts.issues}
        />
        <Stat
          icon={<GitMerge className="h-3.5 w-3.5 text-emerald-500" />}
          label="Signed off"
          value={counts.merged}
        />
      </div>

      {patient.agent.needsYou.length > 0 && (
        <section className="surface flex flex-col gap-3 px-5 py-4">
          <header className="flex items-center justify-between">
            <span className="mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <AlertCircle className="mr-1.5 inline h-3 w-3 text-amber-500" />
              Agent issues — needs you
            </span>
            <span className="mono text-[10.5px] text-muted-foreground/80">
              {patient.agent.needsYou.length}
            </span>
          </header>
          <ol className="flex flex-col gap-2.5">
            {patient.agent.needsYou.map((q) => (
              <li
                key={q.id}
                className="rounded-xl border border-amber-200/70 bg-amber-50/60 px-3.5 py-3"
              >
                <p className="text-[13.5px] font-medium leading-snug text-foreground">
                  {q.question}
                </p>
                {q.detail && (
                  <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                    {q.detail}
                  </p>
                )}
                {q.options && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {q.options.map((o, i) => (
                      <button
                        key={i}
                        type="button"
                        className={
                          i === 0
                            ? "h-7 rounded-md bg-violet-500 px-2.5 text-[11.5px] font-medium text-white hover:bg-violet-600"
                            : "h-7 rounded-md border border-border bg-card px-2.5 text-[11.5px] font-medium text-foreground/80 hover:bg-muted/60"
                        }
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <header className="flex items-center justify-between">
          <span className="mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <GitPullRequest className="mr-1.5 inline h-3 w-3 text-violet-500" />
            Pull requests
          </span>
          <span className="mono text-[10.5px] text-muted-foreground/80">
            {prs.length}
          </span>
        </header>
        <PRList prs={prs} patientId={id} />
      </section>

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <header className="flex items-center justify-between">
            <span className="mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <CalendarDays className="mr-1.5 inline h-3 w-3 text-violet-500" />
              Watching · scheduled uploads
            </span>
            <span className="mono text-[10.5px] text-muted-foreground/80">
              {upcoming.length}
            </span>
          </header>
          <FollowupTimeline items={upcoming} />
        </section>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-card px-4 py-3 ${
        highlight
          ? "border-rose-200 shadow-[0_0_0_1px_rgba(239,68,68,0.08)_inset]"
          : "border-border"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 mono text-[22px] font-semibold tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}
