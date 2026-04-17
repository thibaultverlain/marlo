"use client";

import { useState, useTransition } from "react";
import { Save, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { saveShopSettingsAction } from "@/lib/actions/settings";
import type { ShopSettings } from "@/lib/db/schema";

export default function SettingsForm({ initialData }: { initialData: ShopSettings | undefined }) {
  const [form, setForm] = useState({
    legalName: initialData?.legalName ?? "",
    commercialName: initialData?.commercialName ?? "",
    legalStatus: initialData?.legalStatus ?? "Micro-entrepreneur (EI)",
    siret: initialData?.siret ?? "",
    rcs: initialData?.rcs ?? "",
    apeCode: initialData?.apeCode ?? "",
    address: initialData?.address ?? "",
    postalCode: initialData?.postalCode ?? "",
    city: initialData?.city ?? "",
    country: initialData?.country ?? "France",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    website: initialData?.website ?? "",
    iban: initialData?.iban ?? "",
    bic: initialData?.bic ?? "",
    bankName: initialData?.bankName ?? "",
    vatSubject: initialData?.vatSubject ?? false,
    vatNumber: initialData?.vatNumber ?? "",
    vatRate: initialData?.vatRate ? String(Number(initialData.vatRate)) : "0.20",
    invoicePrefix: initialData?.invoicePrefix ?? "F",
    paymentTerms: initialData?.paymentTerms ?? "Paiement comptant",
    legalMention: initialData?.legalMention ?? "",
  });

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (typeof value === "boolean") {
        if (value) formData.append(key, "on");
      } else {
        formData.append(key, value);
      }
    });

    startTransition(async () => {
      const result = await saveShopSettingsAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!initialData && (
        <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Configuration initiale requise</p>
            <p className="text-xs">
              Ces informations sont obligatoires sur toutes les factures émises. Elles sont
              vérifiables par l'administration fiscale. Remplis au moins : raison sociale, adresse,
              SIRET et régime TVA.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <CheckCircle2 size={16} />
          <span>Enregistré avec succès.</span>
        </div>
      )}

      {/* Identité légale */}
      <div className="bg-white rounded-xl border border-stone-200/60 p-6 space-y-5">
        <h2 className="text-lg text-stone-900">Identité légale</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
              Raison sociale *
            </label>
            <input
              type="text"
              required
              value={form.legalName}
              onChange={(e) => updateField("legalName", e.target.value)}
              placeholder="Ex: Dupont Thibault"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
              Nom commercial
            </label>
            <input
              type="text"
              value={form.commercialName}
              onChange={(e) => updateField("commercialName", e.target.value)}
              placeholder="Ex: Marlo Luxury"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
              Statut juridique
            </label>
            <select
              value={form.legalStatus}
              onChange={(e) => updateField("legalStatus", e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="Micro-entrepreneur (EI)">Micro-entrepreneur (EI)</option>
              <option value="Entrepreneur individuel (EI)">Entrepreneur individuel (EI)</option>
              <option value="EURL">EURL</option>
              <option value="SASU">SASU</option>
              <option value="SAS">SAS</option>
              <option value="SARL">SARL</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
              SIRET
            </label>
            <input
              type="text"
              value={form.siret}
              onChange={(e) => updateField("siret", e.target.value.replace(/\D/g, "").slice(0, 14))}
              placeholder="14 chiffres"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
              Code APE
            </label>
            <input
              type="text"
              value={form.apeCode}
              onChange={(e) => updateField("apeCode", e.target.value)}
              placeholder="Ex: 4771Z"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
            RCS (si applicable)
          </label>
          <input
            type="text"
            value={form.rcs}
            onChange={(e) => updateField("rcs", e.target.value)}
            placeholder="Ex: RCS Paris 123 456 789"
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>
      </div>

      {/* Adresse */}
      <div className="bg-white rounded-xl border border-stone-200/60 p-6 space-y-5">
        <h2 className="text-lg text-stone-900">Adresse</h2>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
            Adresse *
          </label>
          <input
            type="text"
            required
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            placeholder="12 rue de Rivoli"
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
              Code postal *
            </label>
            <input
              type="text"
              required
              value={form.postalCode}
              onChange={(e) => updateField("postalCode", e.target.value)}
              placeholder="75001"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
              Ville *
            </label>
            <input
              type="text"
              required
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="Paris"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
              Pays
            </label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => updateField("country", e.target.value)}
              placeholder="France"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-xl border border-stone-200/60 p-6 space-y-5">
        <h2 className="text-lg text-stone-900">Contact</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="contact@marlo.fr"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
              Téléphone
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="06 12 34 56 78"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
            Site web
          </label>
          <input
            type="url"
            value={form.website}
            onChange={(e) => updateField("website", e.target.value)}
            placeholder="https://marlo.fr"
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>
      </div>

      {/* TVA */}
      <div className="bg-white rounded-xl border border-stone-200/60 p-6 space-y-5">
        <h2 className="text-lg text-stone-900">Régime TVA</h2>

        <div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.vatSubject}
              onChange={(e) => updateField("vatSubject", e.target.checked)}
              className="mt-1 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
            />
            <div>
              <p className="text-sm font-medium text-stone-800">Je suis assujetti à la TVA</p>
              <p className="text-xs text-stone-500 mt-0.5">
                Si décoché, la mention "TVA non applicable, art. 293 B du CGI" apparaîtra automatiquement
                sur tes factures (franchise en base de TVA pour les micro-entrepreneurs sous 85 000 € de CA).
              </p>
            </div>
          </label>
        </div>

        {form.vatSubject && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                N° TVA intracommunautaire
              </label>
              <input
                type="text"
                value={form.vatNumber}
                onChange={(e) => updateField("vatNumber", e.target.value)}
                placeholder="FR12345678901"
                className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
                Taux TVA applicable
              </label>
              <select
                value={form.vatRate}
                onChange={(e) => updateField("vatRate", e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="0.20">20% (taux normal)</option>
                <option value="0.10">10% (taux intermédiaire)</option>
                <option value="0.055">5,5% (taux réduit)</option>
                <option value="0.021">2,1% (taux super-réduit)</option>
                <option value="0">0% (exonéré)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Banque */}
      <div className="bg-white rounded-xl border border-stone-200/60 p-6 space-y-5">
        <h2 className="text-lg text-stone-900">Coordonnées bancaires</h2>
        <p className="text-xs text-stone-500 -mt-3">
          Apparaît sur les factures pour permettre les virements clients
        </p>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
            IBAN
          </label>
          <input
            type="text"
            value={form.iban}
            onChange={(e) => updateField("iban", e.target.value.toUpperCase())}
            placeholder="FR76 3000 1000 0123 4567 8901 234"
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
              BIC
            </label>
            <input
              type="text"
              value={form.bic}
              onChange={(e) => updateField("bic", e.target.value.toUpperCase())}
              placeholder="BDFEFRPP"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
              Banque
            </label>
            <input
              type="text"
              value={form.bankName}
              onChange={(e) => updateField("bankName", e.target.value)}
              placeholder="Ex: Crédit Agricole"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Facturation */}
      <div className="bg-white rounded-xl border border-stone-200/60 p-6 space-y-5">
        <h2 className="text-lg text-stone-900">Facturation</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
              Préfixe numéro facture
            </label>
            <input
              type="text"
              value={form.invoicePrefix}
              onChange={(e) => updateField("invoicePrefix", e.target.value.toUpperCase().slice(0, 5))}
              placeholder="F"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            <p className="text-[11px] text-stone-400 mt-1">Format final : {form.invoicePrefix || "F"}-2026-0001</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
              Conditions de paiement
            </label>
            <input
              type="text"
              value={form.paymentTerms}
              onChange={(e) => updateField("paymentTerms", e.target.value)}
              placeholder="Paiement comptant"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">
            Mention légale supplémentaire
          </label>
          <textarea
            value={form.legalMention}
            onChange={(e) => updateField("legalMention", e.target.value)}
            rows={2}
            placeholder="Ex: Dispensé d'immatriculation au RCS et au RM"
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
