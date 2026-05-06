import { getAuthContext } from "@/lib/auth/require-role";
import { getShopSettings } from "@/lib/db/queries/settings";
import SettingsForm from "@/components/settings/settings-form";
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { shopId } = await getAuthContext();
  const settings = await getShopSettings(shopId);
  return (
    <div className="max-w-3xl mx-auto space-y-6 page-enter">
      <div><h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Réglages</h1><p className="text-zinc-500 mt-1 text-sm">Informations légales pour les factures</p></div>
      <SettingsForm initialData={settings} />
    </div>
  );
}
