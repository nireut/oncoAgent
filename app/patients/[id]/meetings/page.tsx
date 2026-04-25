import { notFound } from "next/navigation";
import { Video, Plus } from "lucide-react";
import { getPatient, meetingsForPatient } from "@/lib/data";
import { MeetingsList } from "@/components/meetings/meetings-list";
import { Button } from "@/components/ui/button";

export default async function MeetingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  const meetings = (await meetingsForPatient(id)).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Video className="h-3.5 w-3.5 text-violet-600" />
            <span className="mono text-[11px] uppercase tracking-[0.16em] text-violet-600">
              Meetings
            </span>
          </div>
          <h2 className="mt-1 text-[22px] font-semibold tracking-tight">
            Tumor board sessions
          </h2>
        </div>
        <Button className="h-9 gap-1.5 rounded-lg bg-violet-500 px-3.5 text-[13px] font-medium text-white hover:bg-violet-600">
          <Plus className="h-3.5 w-3.5" />
          <span>New meeting</span>
        </Button>
      </header>

      <MeetingsList meetings={meetings} patientId={id} />
    </div>
  );
}
