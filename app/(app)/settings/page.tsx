import { getShopSettings } from "@/lib/db/queries/settings";
import SettingsForm from "@/components/settings/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getShopSettings();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl text-stone-900">Réglages</h1>
        <p className="text-stone-400 mt-1">
          Informations légales utilisées sur les factures
        </p>
      </div>

      <SettingsForm initialData={settings} />
    </div>
  );
}
