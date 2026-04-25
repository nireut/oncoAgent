import { notFound } from "next/navigation";
import { getPatient } from "@/lib/data";
import { TreatmentTimeline } from "@/components/plan/treatment-timeline";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
      <header>
        <span className="mono text-[11px] uppercase tracking-[0.16em] text-violet-600">
          Treatment plan
        </span>
        <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
          {patient.name.split(" ")[0]}&apos;s therapy roadmap
        </h2>
      </header>

      <TreatmentTimeline phases={patient.plan} />
    </div>
  );
}
