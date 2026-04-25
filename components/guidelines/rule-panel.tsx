import { Diamond, Pill, Target, ArrowRight } from "lucide-react";
import type { Fact, GuidelinesNode } from "@/lib/types";
import { ProvenancePopover } from "@/components/overview/provenance-popover";
import { FactMono } from "@/components/ui/fact-mono";
import { StatusPill } from "@/components/ui/status-pill";

const KIND_LABEL = { decision: "Decision", treatment: "Treatment", outcome: "Outcome" };
const KIND_ICON = {
  decision: <Diamond className="h-3.5 w-3.5" />,
  treatment: <Pill className="h-3.5 w-3.5" />,
  outcome: <Target className="h-3.5 w-3.5" />,
};

export function RulePanel({
  node,
  matchingFacts,
}: {
  node: GuidelinesNode | null;
  matchingFacts: Fact[];
}) {
  if (!node) {
    return (
      <div className="surface flex h-full min-h-[260px] flex-col items-start justify-start px-5 py-4">
        <span className="mono text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          Inspector
        </span>
      </div>
    );
  }

  return (
    <div className="surface flex flex-col gap-4 px-5 py-4">
      <header className="flex items-start gap-2.5">
        <div
          className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-md ${
            node.patientPath ? "bg-violet-100 text-violet-700" : "bg-muted text-muted-foreground"
          }`}
        >
          {KIND_ICON[node.kind]}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="mono text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              {KIND_LABEL[node.kind]}
            </span>
            {node.patientPath && <StatusPill tone="info">On path</StatusPill>}
          </div>
          <h3 className="mt-1 whitespace-pre-line text-[15px] font-semibold leading-tight tracking-tight">
            {node.label}
          </h3>
        </div>
      </header>

      {node.factKey && (
        <div>
          <p className="mono text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Bound record
          </p>
          <FactMono className="mt-1 inline-flex rounded-md bg-muted px-1.5 py-0.5 text-foreground/90">
            {node.factKey}
          </FactMono>
        </div>
      )}

      <div>
        <p className="mono text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          Patient records that satisfied this rule
        </p>
        {matchingFacts.length === 0 ? (
          <p className="mt-1.5 text-[12.5px] italic text-muted-foreground">
            No bound records. The agent will populate this when the relevant data arrives.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {matchingFacts.map((f) => (
              <li
                key={f.id}
                className="flex items-start gap-2 rounded-lg border border-border bg-card px-2.5 py-2"
              >
                <ArrowRight className="mt-0.5 h-3 w-3 flex-shrink-0 text-violet-500" />
                <div className="min-w-0 flex-1">
                  <FactMono className="text-[11.5px] text-muted-foreground">
                    {f.key}
                  </FactMono>
                  <p className="text-[13px] leading-snug text-foreground">{f.value}</p>
                </div>
                <ProvenancePopover fact={f} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
