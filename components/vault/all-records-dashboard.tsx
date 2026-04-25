"use client";

import { useMemo } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Network } from "lucide-react";
import type {
  Attachment,
  AttachmentKind,
  Fact,
  Patient,
} from "@/lib/types";
import { FactsGraph } from "./facts-graph";

type ActivityItem =
  | { id: string; type: "fact"; date: string; label: string; value: string }
  | {
      id: string;
      type: "attachment";
      date: string;
      label: string;
      kind: AttachmentKind;
      source?: string;
    };

export function AllRecordsDashboard({
  patient,
  facts,
  attachments,
}: {
  patient: Patient;
  facts: Fact[];
  attachments: Attachment[];
}) {
  const activity = useMemo(() => mergeActivity(facts, attachments), [
    facts,
    attachments,
  ]);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-6 py-6">
      <span className="mono text-[10.5px] uppercase tracking-[0.16em] text-violet-600">
        Vault
      </span>
      <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-foreground">
        {patient.cancerLabel}
      </h2>
      <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
        {patient.diagnosis}
        <span className="mx-2 text-muted-foreground/50">·</span>
        <span className="mono text-[12px] text-foreground/80">
          {patient.staging}
        </span>
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-[480px]">
        <Stat label="Records" value={facts.length} />
        <Stat label="Files" value={attachments.length} />
        <Stat
          label="Last update"
          value={
            activity[0]
              ? formatDistanceToNowStrict(new Date(activity[0].date), {
                  addSuffix: false,
                })
              : "—"
          }
        />
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-1.5">
          <Network className="h-3 w-3 text-violet-500" />
          <span className="mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Context graph
          </span>
        </div>
        <div className="mt-3">
          <FactsGraph patient={patient} facts={facts} />
        </div>
      </div>

    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <div className="mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-[16px] font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </div>
    </div>
  );
}

function mergeActivity(
  facts: Fact[],
  attachments: Attachment[]
): ActivityItem[] {
  const items: ActivityItem[] = [
    ...attachments.map<ActivityItem>((a) => ({
      id: `a-${a.id}`,
      type: "attachment",
      date: a.date,
      label: a.name,
      kind: a.kind,
      source: a.source,
    })),
    ...facts.map<ActivityItem>((f) => ({
      id: `f-${f.id}`,
      type: "fact",
      date: f.updatedAt,
      label: f.label,
      value: f.value,
    })),
  ];
  return items.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
