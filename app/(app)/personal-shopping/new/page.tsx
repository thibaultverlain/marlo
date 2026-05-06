import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import NewMissionForm from "@/components/personal-shopping/new-mission-form";
export default function NewMissionPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter">
      <div className="flex items-center gap-4">
        <Link href="/personal-shopping" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors"><ArrowLeft size={18} /></Link>
        <div><h1 className="text-2xl font-bold text-white tracking-tight">Nouvelle mission</h1><p className="text-sm text-zinc-500 mt-0.5">Vente privée, session boutique...</p></div>
      </div>
      <NewMissionForm />
    </div>
  );
}
