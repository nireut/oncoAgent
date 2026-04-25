import Link from "next/link";
import { GitPullRequest, GitMerge, AlertOctagon, Eye, XCircle, ChevronRight } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { FactMono } from "@/components/ui/fact-mono";
import { PR_STATUS_LABEL, PR_STATUS_TONE } from "./pr-status";
import { formatDistanceToNowStrict } from "date-fns";
import type { PullRequest } from "@/lib/types";

const ICON: Record<PullRequest["status"], React.ReactNode> = {
  open: <GitPullRequest className="h-4 w-4 text-violet-500" />,
  merged: <GitMerge className="h-4 w-4 text-emerald-500" />,
  conflict: <AlertOctagon className="h-4 w-4 text-rose-500" />,
  "needs-review": <Eye className="h-4 w-4 text-amber-500" />,
  declined: <XCircle className="h-4 w-4 text-muted-foreground" />,
};

export function PRList({
  prs,
  patientId,
}: {
  prs: PullRequest[];
  patientId: string;
}) {
  if (prs.length === 0) {
    return (
      <div className="surface px-6 py-10 text-center text-[13px] text-muted-foreground">
        No incoming changes.
      </div>
    );
  }

  return (
    <div className="surface overflow-hidden">
      <ul className="divide-y divide-border">
        {prs.map((pr, i) => {
          const tone = PR_STATUS_TONE[pr.status];
          return (
            <li key={pr.id}>
              <Link
                href={`/patients/${patientId}/prs/${pr.id}`}
                className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/40"
              >
                <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-muted/60">
                  {ICON[pr.status]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <FactMono className="text-muted-foreground/80">
                      #{prs.length - i}
                    </FactMono>
                    <span className="text-[14px] font-semibold text-foreground">
                      {pr.title}
                    </span>
                    <StatusPill tone={tone}>{PR_STATUS_LABEL[pr.status]}</StatusPill>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
                    {pr.summary}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
                    <span>
                      from <span className="text-foreground/80">{pr.author.name}</span>
                    </span>
                    <span>·</span>
                    <span>{pr.author.role}</span>
                    <span>·</span>
                    <span>
                      {formatDistanceToNowStrict(new Date(pr.openedAt), { addSuffix: true })}
                    </span>
                    {pr.proposed.length > 0 && (
                      <>
                        <span>·</span>
                        <span>
                          {pr.proposed.length} change
                          {pr.proposed.length === 1 ? "" : "s"}
                        </span>
                      </>
                    )}
                    {pr.conflicts.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="font-medium text-rose-700">
                          {pr.conflicts.length} conflict
                          {pr.conflicts.length === 1 ? "" : "s"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight className="mt-2 h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
