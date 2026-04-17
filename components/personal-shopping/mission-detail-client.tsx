"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowRight, CheckCircle, X, Package, FileText } from "lucide-react";
import {
  addPsItemAction,
  deletePsItemAction,
  updateMissionStatusAction,
  deleteMissionAction,
} from "@/lib/actions/personal-shopping";
import { generateInvoiceFromMissionAction } from "@/lib/actions/invoices";
import { formatCurrency } from "@/lib/utils";

type CustomerOption = { id: string; name: string; vip: boolean };
type ItemRow = {
  id: string;
  customerId: string;
  description: string;
  brand: string | null;
  purchasePrice: number;
  commissionAmount: number | null;
  invoiced: boolean | null;
};
type CustomerGroup = {
  customerId: string;
  customerName: string;
  items: ItemRow[];
  total: number;
  commission: number;
};

const NEXT_STATUS: Record<string, { next: string; label: string }[]> = {
  planifie: [
    { next: "en_cours", label: "Démarrer la mission" },
    { next: "annule", label: "Annuler" },
  ],
  en_cours: [
    { next: "termine", label: "Terminer la mission" },
    { next: "annule", label: "Annuler" },
  ],
  termine: [
    { next: "facture", label: "Générer les factures" },
  ],
  facture: [],
  annule: [],
};

export default function MissionDetailClient({
  missionId,
  missionStatus,
  customerGroups,
  customers,
}: {
  missionId: string;
  missionStatus: string;
  customerGroups: CustomerGroup[];
  customers: CustomerOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm] = useState({
    customerId: "",
    description: "",
    brand: "",
    purchasePrice: "",
    commissionRate: "15",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  const commissionPreview = useMemo(() => {
    const price = parseFloat(form.purchasePrice) || 0;
    const rate = parseFloat(form.commissionRate) || 0;
    if (price <= 0 || rate <= 0) return 0;
    return (price * rate) / 100;
  }, [form.purchasePrice, form.commissionRate]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm({ customerId: "", description: "", brand: "", purchasePrice: "", commissionRate: "15", notes: "" });
    setError(null);
  }

  async function handleAddItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.append("missionId", missionId);
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));

    startTransition(async () => {
      const result = await addPsItemAction(fd);
      if (result?.error) {
        setError(result.error);
      } else {
        resetForm();
        setShowAddDialog(false);
      }
    });
  }

  function handleDeleteItem(itemId: string) {
    if (!confirm("Supprimer cet article ?")) return;
    startTransition(async () => {
      await deletePsItemAction(itemId, missionId);
    });
  }

  function handleStatusChange(newStatus: string) {
    if (newStatus === "facture") {
      startTransition(async () => {
        const result = await generateInvoiceFromMissionAction(missionId);
        if ("invoiceId" in result && result.invoiceId) {
          router.push(`/invoices/${result.invoiceId}`);
        }
      });
      return;
    }
    startTransition(async () => {
      await updateMissionStatusAction(missionId, newStatus);
    });
  }

  function handleDeleteMission() {
    if (!confirm("Supprimer cette mission et tous ses articles ? Irréversible.")) return;
    startTransition(async () => {
      await deleteMissionAction(missionId);
    });
  }

  const nextActions = NEXT_STATUS[missionStatus] || [];
  const canAddItems = ["planifie", "en_cours"].includes(missionStatus);

  return (
    <>
      {/* Add item CTA */}
      {canAddItems && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-stone-200/60 p-4">
          <div>
            <h3 className="text-sm font-semibold text-stone-700">Articles achetés</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Ajoute chaque article que tu achètes pendant la mission.
            </p>
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            disabled={isPending || customers.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            <Plus size={14} />
            Ajouter un article
          </button>
        </div>
      )}

      {/* Items grouped by customer */}
      {customerGroups.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200/60 p-12 text-center">
          <Package size={40} className="mx-auto text-stone-300 mb-3" />
          <p className="text-stone-500">Aucun article pour le moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {customerGroups.map((group) => (
            <div key={group.customerId} className="bg-white rounded-xl border border-stone-200/60 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-stone-50/50 border-b border-stone-100">
                <p className="text-sm font-semibold text-stone-800">{group.customerName}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-stone-600">
                    Total : <span className="font-semibold">{formatCurrency(group.total)}</span>
                  </span>
                  {group.commission > 0 && (
                    <span className="text-amber-700">
                      Commission : <span className="font-semibold">{formatCurrency(group.commission)}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="divide-y divide-stone-100">
                {group.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800">{item.description}</p>
                      {item.brand && <p className="text-xs text-stone-400 mt-0.5">{item.brand}</p>}
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-sm font-semibold text-stone-800">{formatCurrency(item.purchasePrice)}</p>
                        {item.commissionAmount && (
                          <p className="text-xs text-amber-700">+{formatCurrency(item.commissionAmount)}</p>
                        )}
                      </div>
                      {canAddItems && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={isPending}
                          className="text-stone-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status workflow */}
      {nextActions.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <h3 className="text-sm font-semibold text-stone-700 mb-3">Actions</h3>
          <div className="flex flex-wrap gap-2">
            {nextActions.map((a) => (
              <button
                key={a.next}
                onClick={() => handleStatusChange(a.next)}
                disabled={isPending}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 ${
                  a.next === "annule"
                    ? "text-red-600 hover:bg-red-50"
                    : a.next === "termine" || a.next === "facture"
                    ? "text-white bg-green-700 hover:bg-green-800"
                    : "text-stone-700 bg-white border border-stone-200 hover:bg-stone-50"
                }`}
              >
                {a.next === "annule" ? <X size={14} /> : a.next === "termine" || a.next === "facture" ? <CheckCircle size={14} /> : <ArrowRight size={14} />}
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Delete mission */}
      <div className="flex items-center justify-end pt-2">
        <button
          onClick={handleDeleteMission}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <Trash2 size={14} />
          Supprimer la mission
        </button>
      </div>

      {/* Add item dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddDialog(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-stone-900">Ajouter un article</h3>
              <button onClick={() => setShowAddDialog(false)} className="text-stone-400 hover:text-stone-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Pour quel client *</label>
                <select
                  required
                  value={form.customerId}
                  onChange={(e) => updateField("customerId", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="">Choisir le client</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.vip ? "⭐ " : ""}{c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Description *</label>
                <input
                  type="text"
                  required
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Ex: Robe midi Dior bleue taille 38"
                  className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Marque</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => updateField("brand", e.target.value)}
                    placeholder="Dior"
                    className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Prix payé *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={form.purchasePrice}
                      onChange={(e) => updateField("purchasePrice", e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-3 pr-8 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">€</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Commission</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    value={form.commissionRate}
                    onChange={(e) => updateField("commissionRate", e.target.value)}
                    placeholder="15"
                    className="w-full pl-3 pr-8 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">%</span>
                </div>
                {commissionPreview > 0 && (
                  <p className="text-xs text-amber-700 mt-1.5">
                    Commission : <span className="font-semibold">{formatCurrency(commissionPreview)}</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { resetForm(); setShowAddDialog(false); }}
                  className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
                >
                  {isPending ? "Ajout..." : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
