"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Save, AlertCircle, Star, X } from "lucide-react";
import { createCustomerAction } from "@/lib/actions/customers";
import { LUXURY_BRANDS } from "@/lib/data";

export default function NewCustomerForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    instagram: "",
    address: "",
    city: "",
    preferredSizes: "",
    budgetRange: "",
    vip: false,
    notes: "",
  });
  const [preferredBrands, setPreferredBrands] = useState<string[]>([]);
  const [brandInput, setBrandInput] = useState("");
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredBrands = useMemo(() => {
    if (!brandInput) return [];
    const q = brandInput.toLowerCase();
    return [...new Set(LUXURY_BRANDS)]
      .filter((b) => b.toLowerCase().includes(q) && !preferredBrands.includes(b))
      .slice(0, 6);
  }, [brandInput, preferredBrands]);

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addBrand(brand: string) {
    if (!preferredBrands.includes(brand)) {
      setPreferredBrands([...preferredBrands, brand]);
    }
    setBrandInput("");
    setShowBrandDropdown(false);
  }

  function removeBrand(brand: string) {
    setPreferredBrands(preferredBrands.filter((b) => b !== brand));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("firstName", form.firstName);
    formData.append("lastName", form.lastName);
    formData.append("email", form.email);
    formData.append("phone", form.phone);
    formData.append("instagram", form.instagram);
    formData.append("address", form.address);
    formData.append("city", form.city);
    formData.append("preferredSizes", form.preferredSizes);
    formData.append("budgetRange", form.budgetRange);
    if (form.vip) formData.append("vip", "on");
    formData.append("notes", form.notes);
    preferredBrands.forEach((b) => formData.append("preferredBrands", b));

    startTransition(async () => {
      const result = await createCustomerAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200/60 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Prénom *</label>
            <input
              type="text"
              required
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Nom *</label>
            <input
              type="text"
              required
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="client@email.com"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Téléphone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="06 12 34 56 78"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Instagram</label>
            <input
              type="text"
              value={form.instagram}
              onChange={(e) => updateField("instagram", e.target.value)}
              placeholder="@username"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Ville</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="Paris"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Adresse</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            placeholder="Adresse complète"
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="border-t border-stone-100 pt-5">
          <h3 className="text-sm font-semibold text-stone-700 mb-4">Préférences</h3>

          {/* Preferred brands */}
          <div className="relative">
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Marques favorites</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {preferredBrands.map((brand) => (
                <span key={brand} className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 rounded text-xs text-stone-700">
                  {brand}
                  <button type="button" onClick={() => removeBrand(brand)} className="hover:text-red-500">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={brandInput}
              onChange={(e) => {
                setBrandInput(e.target.value);
                setShowBrandDropdown(true);
              }}
              onFocus={() => brandInput && setShowBrandDropdown(true)}
              onBlur={() => setTimeout(() => setShowBrandDropdown(false), 200)}
              placeholder="Ajouter une marque..."
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            {showBrandDropdown && filteredBrands.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredBrands.map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onMouseDown={() => addBrand(brand)}
                    className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                  >
                    {brand}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Tailles habituelles</label>
              <input
                type="text"
                value={form.preferredSizes}
                onChange={(e) => updateField("preferredSizes", e.target.value)}
                placeholder="Ex: 36/38, 42, 25cm..."
                className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Budget habituel</label>
              <input
                type="text"
                value={form.budgetRange}
                onChange={(e) => updateField("budgetRange", e.target.value)}
                placeholder="Ex: 1000-3000€"
                className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* VIP toggle */}
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.vip}
                onChange={(e) => updateField("vip", e.target.checked)}
                className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-sm text-stone-700 flex items-center gap-1">
                Client VIP
                {form.vip && <Star size={12} className="text-amber-500 fill-amber-500" />}
              </span>
            </label>
          </div>
        </div>

        <div className="border-t border-stone-100 pt-5">
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            rows={4}
            placeholder="Ex: Préfère être contactée par WhatsApp le dimanche. Achète surtout des sacs, rarement des vêtements. Fidèle cliente depuis 2 ans..."
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
          />
          <p className="text-[11px] text-stone-400 mt-1">
            Tout ce qui peut t'aider à mieux servir ce client. Plus c'est détaillé, mieux c'est.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pb-8">
        <Link href="/customers" className="px-4 py-2.5 text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors">
          Annuler
        </Link>
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
