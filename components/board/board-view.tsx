"use client";

import { useMemo, useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import type { BoardCase, Patient } from "@/lib/types";
import { OptionCard, rankOptions } from "./option-card";
import { PatientPreview } from "./patient-preview";

type Mode = "team" | "patient" | "decided";

export function BoardView({
  patient,
}: {
  patient: Patient;
}) {
  const options = patient.options ?? [];
  const initialChosen = patient.chosenOptionId ?? null;

  const [chosenId, setChosenId] = useState<string | null>(initialChosen);
  const [preferredId, setPreferredId] = useState<string | null>(initialChosen);
  const [mode, setMode] = useState<Mode>(
    initialChosen ? "decided" : "team"
  );

  const ranked = useMemo(() => rankOptions(options), [options]);

  if (options.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center px-8">
        <div className="surface max-w-lg px-6 py-8 text-center">
          <Sparkles className="mx-auto h-5 w-5 text-violet-500" />
          <h3 className="mt-3 text-[15px] font-semibold tracking-tight">
            No active board case.
          </h3>
        </div>
      </div>
    );
  }

  if (mode === "patient") {
    return (
      <PatientPreview
        patient={patient}
        options={ranked}
        recommendedId={preferredId ?? ranked[0]?.id ?? null}
        onPick={(id) => {
          setChosenId(id);
          setMode("decided");
        }}
        onBack={() => setMode("team")}
      />
    );
  }

  return (
    <div className="flex min-h-0 w-full flex-col overflow-y-auto">
      <BoardHeader
        boardCase={patient.boardCase}
        decided={mode === "decided" && chosenId !== null}
      />

      <section className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-6 py-6">
        {ranked.map((opt, i) => (
          <OptionCard
            key={opt.id}
            option={opt}
            index={i}
            isChosen={chosenId === opt.id}
            onPreferred={(id) => setPreferredId(id)}
            onSendToPatient={(id) => {
              setPreferredId(id);
              setMode("patient");
            }}
            onChoose={
              mode === "decided" || (preferredId === opt.id && mode === "team")
                ? (id) => {
                    setChosenId(id);
                    setMode("decided");
                  }
                : undefined
            }
          />
        ))}
      </section>
    </div>
  );
}

function BoardHeader({
  boardCase,
  decided,
}: {
  boardCase?: BoardCase;
  decided: boolean;
}) {
  return (
    <header className="border-b border-border bg-background/60 px-6 py-5 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1100px] items-start justify-between gap-4">
        <div>
          <span className="mono text-[11px] uppercase tracking-[0.16em] text-violet-600">
            Tumor board
          </span>
          <h2 className="mt-1 text-[20px] font-semibold tracking-tight">
            {boardCase?.question ?? "Treatment options"}
          </h2>
        </div>
        {decided && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 mono text-[10.5px] font-semibold uppercase tracking-wider text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Decided
          </span>
        )}
      </div>
    </header>
  );
}
