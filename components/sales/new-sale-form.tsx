"use client";
import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Save, AlertCircle } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { CHANNELS, calculatePlatformFees, calculateMargin, PLATFORM_FEES } from "@/lib/data";
import { createSaleAction } from "@/lib/actions/sales";

const inputClass = "w-full px-3 py-2.5 text-[13px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-zinc-200 placeholder:text-zinc-600";
const labelClass = "block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5";

type ProductOption = { id: string; title: string; sku: string; purchasePrice: number; targetPrice: number | null };
type CustomerOption = { id: string; name: string };

export default function NewSaleForm({ products, customers, preselectedProductId }: { products: ProductOption[]; customers: CustomerOption[]; preselectedProductId?: string }) {
  const [form, setForm] = useState({ productId: preselectedProductId ?? "", channel: "vinted", customerId: "", salePrice: "", platformFees: "", platformFeesAuto: true, shippingCost: "", shippingPaidBy: "acheteur", paymentMethod: "plateforme", trackingNumber: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedProduct = products.find((p) => p.id === form.productId);
  const autoFees = useMemo(() => form.platformFeesAuto && form.salePrice ? calculatePlatformFees(form.channel, parseFloat(form.salePrice) || 0) : 0, [form.channel, form.salePrice, form.platformFeesAuto]);
  const currentFees = form.platformFeesAuto ? autoFees : parseFloat(form.platformFees) || 0;
  const marginCalc = useMemo(() => selectedProduct && form.salePrice ? calculateMargin(selectedProduct.purchasePrice, parseFloat(form.salePrice) || 0, currentFees, parseFloat(form.shippingCost) || 0, form.shippingPaidBy === "vendeur") : null, [selectedProduct, form.salePrice, currentFees, form.shippingCost, form.shippingPaidBy]);
  function updateField(field: string, value: string | boolean) { setForm((prev) => ({ ...prev, [field]: value })); }

  useMemo(() => { if (selectedProduct?.targetPrice && !form.salePrice) setForm((prev) => ({ ...prev, salePrice: String(selectedProduct.targetPrice) })); }, [selectedProduct]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null);
    const fd = new FormData();
    fd.append("productId", form.productId); fd.append("customerId", form.customerId); fd.append("channel", form.channel);
    fd.append("salePrice", form.salePrice); fd.append("platformFees", form.platformFees);
    fd.append("platformFeesAuto", String(form.platformFeesAuto)); fd.append("shippingCost", form.shippingCost || "0");
    fd.append("shippingPaidBy", form.shippingPaidBy); fd.append("paymentMethod", form.paymentMethod);
    fd.append("trackingNumber", form.trackingNumber); fd.append("notes", form.notes);
    startTransition(async () => { const result = await createSaleAction(fd); if (result?.error) setError(result.error); });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400"><AlertCircle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span></div>}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 space-y-5">
        <div><label className={labelClass}>Article vendu *</label><select required value={form.productId} onChange={(e) => updateField("productId", e.target.value)} className={inputClass}><option value="">Sélectionner...</option>{products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.title} ({formatCurrency(p.purchasePrice)})</option>)}</select></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Canal *</label><select value={form.channel} onChange={(e) => updateField("channel", e.target.value)} className={inputClass}>{CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          <div><label className={labelClass}>Client</label><select value={form.customerId} onChange={(e) => updateField("customerId", e.target.value)} className={inputClass}><option value="">Aucun</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        </div>
        <div className="border-t border-[var(--color-border)] pt-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Montants</h3>
          <div><label className={labelClass}>Prix de vente *</label><div className="relative"><input type="number" step="0.01" required value={form.salePrice} onChange={(e) => updateField("salePrice", e.target.value)} placeholder="0.00" className={`${inputClass} pr-8`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-600">€</span></div></div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div><div className="flex items-center justify-between mb-1.5"><label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Frais plateforme</label><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={form.platformFeesAuto} onChange={(e) => updateField("platformFeesAuto", e.target.checked)} className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500" /><span className="text-[10px] text-zinc-500">Auto</span></label></div><div className="relative"><input type="number" step="0.01" value={form.platformFeesAuto ? autoFees.toFixed(2) : form.platformFees} onChange={(e) => updateField("platformFees", e.target.value)} disabled={form.platformFeesAuto} className={`${inputClass} pr-8 disabled:opacity-50`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-600">€</span></div></div>
            <div><label className={labelClass}>Frais de port</label><div className="relative"><input type="number" step="0.01" value={form.shippingCost} onChange={(e) => updateField("shippingCost", e.target.value)} placeholder="0.00" className={`${inputClass} pr-8`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-600">€</span></div></div>
          </div>
          <div className="mt-3"><label className={`${labelClass} mb-2`}>Port payé par</label><div className="flex gap-2">{[{v:"acheteur",l:"Acheteur"},{v:"vendeur",l:"Moi"},{v:"offert",l:"Offert"}].map((o) => <button key={o.v} type="button" onClick={() => updateField("shippingPaidBy", o.v)} className={`px-3 py-1.5 text-[13px] rounded-lg border transition-colors ${form.shippingPaidBy === o.v ? "bg-indigo-600 text-white border-indigo-600" : "bg-transparent text-zinc-400 border-[var(--color-border)] hover:border-zinc-600"}`}>{o.l}</button>)}</div></div>
          {marginCalc && (
            <div className={`mt-4 p-4 rounded-lg border ${marginCalc.margin >= 0 ? "bg-emerald-500/[0.08] border-emerald-500/20" : "bg-red-500/[0.08] border-red-500/20"}`}>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-[11px] text-zinc-500 mb-1">Revenu net</p><p className="text-lg font-semibold text-white tabular-nums">{formatCurrency(marginCalc.netRevenue)}</p></div>
                <div><p className="text-[11px] text-zinc-500 mb-1">Marge</p><p className={`text-lg font-semibold tabular-nums ${marginCalc.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(marginCalc.margin)}</p></div>
                <div><p className="text-[11px] text-zinc-500 mb-1">%</p><p className={`text-lg font-semibold tabular-nums ${marginCalc.marginPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatPercent(marginCalc.marginPct)}</p></div>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-[var(--color-border)] pt-5 grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Paiement</label><select value={form.paymentMethod} onChange={(e) => updateField("paymentMethod", e.target.value)} className={inputClass}><option value="plateforme">Via plateforme</option><option value="virement">Virement</option><option value="especes">Espèces</option><option value="cb">CB</option><option value="paypal">PayPal</option><option value="autre">Autre</option></select></div>
          <div><label className={labelClass}>N° de suivi</label><input type="text" value={form.trackingNumber} onChange={(e) => updateField("trackingNumber", e.target.value)} placeholder="Tracking" className={inputClass} /></div>
        </div>
        <div><label className={labelClass}>Notes</label><textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={2} placeholder="Notes..." className={`${inputClass} resize-none`} /></div>
      </div>
      <div className="flex items-center justify-end gap-3 pb-8">
        <Link href="/sales" className="px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors">Annuler</Link>
        <button type="submit" disabled={isPending} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"><Save size={16} />{isPending ? "Enregistrement..." : "Enregistrer"}</button>
      </div>
    </form>
  );
}
