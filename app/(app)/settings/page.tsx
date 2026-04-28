import { getCurrentUserId } from "@/lib/auth/get-user";
import { getShopSettings } from "@/lib/db/queries/settings";
import SettingsForm from "@/components/settings/settings-form";
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  const settings = await getShopSettings(userId);
  return (
    <div className="max-w-3xl space-y-6">
      <div><h1 className="text-3xl text-white">Réglages</h1><p className="text-zinc-500 mt-1 text-sm">Informations légales pour les factures</p></div>
      <SettingsForm initialData={settings} />
    </div>
  );
}
