import Link from "next/link";
import { FolderOpen, ChevronRight } from "lucide-react";
import { getAuthContext } from "@/lib/auth/require-role";
import { getShopSettings } from "@/lib/db/queries/settings";
import SettingsForm from "@/components/settings/settings-form";

export const revalidate = 30;

export default async function SettingsPage() {
  const { shopId } = await getAuthContext();
  const settings = await getShopSettings(shopId);
  return (
    <div className="max-w-3xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Reglages</h1>
        <p className="text-zinc-500 mt-1 text-sm">Informations legales et documents de la boutique</p>
      </div>

      <SettingsForm initialData={settings} />

      <Link href="/settings/documents" className="block card-static p-5 hover:border-[var(--color-border-hover)] transition-all group">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
            <FolderOpen size={18} className="text-violet-400" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-white">Documents administratifs</p>
            <p className="text-[12px] text-zinc-500 mt-0.5">Kbis, statuts, assurances, contrats</p>
          </div>
          <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        </div>
      </Link>
    </div>
  );
}
