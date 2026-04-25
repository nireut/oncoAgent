"use client";

import { useState } from "react";
import { Network } from "lucide-react";
import { GuidelinesFlow } from "@/components/guidelines/guidelines-flow";
import { RulePanel } from "@/components/guidelines/rule-panel";
import type { GuidelinesNode, GuidelinesGraph, Patient } from "@/lib/types";

export function GuidelinesPageClient({
  patient,
  graph,
}: {
  patient: Patient;
  graph: GuidelinesGraph;
}) {
  const [selected, setSelected] = useState<GuidelinesNode | null>(
    graph.nodes.find((n) => n.factKey === "staging.clinical") ?? null
  );

  const matchingFacts = selected?.factKey
    ? patient.facts.filter((f) => f.key === selected.factKey)
    : [];

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5">
      <header>
        <div className="flex items-center gap-2">
          <Network className="h-3.5 w-3.5 text-violet-600" />
          <span className="mono text-[11px] uppercase tracking-[0.16em] text-violet-600">
            Guidelines
          </span>
        </div>
        <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
          {graph.title}
        </h2>
        <div className="mt-2 mono text-[11px] text-muted-foreground">
          source · {graph.source}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <GuidelinesFlow
          graph={graph}
          selectedId={selected?.id}
          onSelect={setSelected}
        />
        <RulePanel node={selected} matchingFacts={matchingFacts} />
      </div>
    </div>
  );
}
