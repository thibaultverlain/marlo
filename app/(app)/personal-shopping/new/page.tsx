import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import NewMissionForm from "@/components/personal-shopping/new-mission-form";

export default function NewMissionPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/personal-shopping" className="w-9 h-9 flex items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:text-stone-600 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl text-stone-900">Nouvelle mission</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            Une vente privée, une session boutique, un passage en showroom...
          </p>
        </div>
      </div>
      <NewMissionForm />
    </div>
  );
}
