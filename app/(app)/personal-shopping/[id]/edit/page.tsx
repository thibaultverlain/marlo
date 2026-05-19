import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getMissionById } from "@/lib/db/queries/personal-shopping";
import EditMissionForm from "@/components/personal-shopping/edit-mission-form";

export const dynamic = "force-dynamic";

export default async function EditMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mission = await getMissionById(id);
  if (!mission) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6 page-enter">
      <div className="flex items-center gap-4">
        <Link href={`/personal-shopping/${mission.id}`} className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Modifier la mission</h1>
          <p className="text-sm text-zinc-500 mt-0.5 truncate max-w-[400px]">{mission.name}</p>
        </div>
      </div>
      <EditMissionForm mission={mission as any} />
    </div>
  );
}
