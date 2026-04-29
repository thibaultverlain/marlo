"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, Trash2, ArrowRight, X, CheckCircle, FileText } from "lucide-react";
import { updateSourcingStatusAction, linkProductToSourcingAction, deleteSourcingAction } from "@/lib/actions/sourcing";
import { generateInvoiceFromSourcingAction } from "@/lib/actions/invoices";
import { formatCurrency } from "@/lib/utils";

const inputClass = "w-full px-3 py-2.5 text-[13px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-zinc-200 placeholder:text-zinc-600";
type ProductOption = { id: string; title: string; sku: string; purchasePrice: number; targetPrice: number | null };
const NS: Record<string, { next: string; label: string }[]> = { ouvert: [{ next: "en_recherche", label: "Commencer la recherche" },{ next: "annule", label: "Annuler" }], en_recherche: [{ next: "annule", label: "Annuler" }], trouve: [{ next: "achete", label: "Acheté" },{ next: "annule", label: "Annuler" }], achete: [{ next: "livre", label: "Livré" }], livre: [{ next: "facture", label: "Générer la facture" }], facture: [], annule: [] };

export default function SourcingActions({ sourcingId, status, hasFoundProduct, commissionRate, availableProducts }: { sourcingId: string; status: string; hasFoundProduct: boolean; commissionRate: number; availableProducts: ProductOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showLink, setShowLink] = useState(false);
  const [selProd, setSelProd] = useState("");
  const [pp, setPP] = useState("");
  const [sp, setSP] = useState("");

  function handleProductSelect(id: string) { setSelProd(id); const p = availableProducts.find((x)=>x.id===id); if(p){setPP(String(p.purchasePrice)); if(p.targetPrice) setSP(String(p.targetPrice));} }
  const prevComm = commissionRate>0&&sp ? parseFloat(sp)*commissionRate : 0;

  function handleStatus(s: string) {
    if (s==="facture") { startTransition(async()=>{ const r = await generateInvoiceFromSourcingAction(sourcingId); if("invoiceId" in r && r.invoiceId) router.push(`/invoices/${r.invoiceId}`); }); return; }
    startTransition(async()=>{ await updateSourcingStatusAction(sourcingId, s); });
  }
  function handleLink() { if(!selProd||!pp||!sp) return; startTransition(async()=>{ const r = await linkProductToSourcingAction(sourcingId, selProd, parseFloat(pp), parseFloat(sp)); if(!("error" in r)||!r.error) setShowLink(false); }); }
  function handleDelete() { if(!confirm("Supprimer ?")) return; startTransition(async()=>{ await deleteSourcingAction(sourcingId); }); }

  const nextActions = NS[status]||[];
  return (
    <>
      {!hasFoundProduct && ["ouvert","en_recherche"].includes(status) && availableProducts.length>0 && (
        <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-5"><h3 className="text-sm font-semibold text-zinc-300 mb-2">Pièce trouvée ?</h3><p className="text-[11px] text-zinc-500 mb-4">Lie un article du stock pour calculer la commission.</p>
          <button onClick={()=>setShowLink(true)} disabled={isPending} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"><Package size={14} />Lier un article</button></div>
      )}
      {nextActions.length>0 && <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-5"><h3 className="text-sm font-semibold text-zinc-300 mb-3">Actions</h3><div className="flex flex-wrap gap-2">{nextActions.map((a)=><button key={a.next} onClick={()=>handleStatus(a.next)} disabled={isPending} className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 ${a.next==="annule"?"text-red-400 hover:bg-red-500/10":a.next==="facture"?"text-white bg-rose-500 hover:bg-rose-400":"text-zinc-300 bg-[var(--color-bg-raised)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]"}`}>{a.next==="annule"?<X size={14}/>:a.next==="facture"?<FileText size={14}/>:<ArrowRight size={14}/>}{a.label}</button>)}</div></div>}
      <div className="flex items-center justify-end pt-4 border-t border-[var(--color-border)]"><button onClick={handleDelete} disabled={isPending} className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"><Trash2 size={14} />Supprimer</button></div>

      {showLink && <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={()=>setShowLink(false)}><div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl max-w-lg w-full p-6 space-y-4" onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-white">Lier un article</h3><button onClick={()=>setShowLink(false)} className="text-zinc-500 hover:text-zinc-300"><X size={18}/></button></div>
        <div><label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Article</label><select value={selProd} onChange={(e)=>handleProductSelect(e.target.value)} className={inputClass}><option value="">Sélectionner...</option>{availableProducts.map((p)=><option key={p.id} value={p.id}>{p.sku} — {p.title}</option>)}</select></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Prix achat</label><input type="number" step="0.01" value={pp} onChange={(e)=>setPP(e.target.value)} className={inputClass}/></div><div><label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Prix client</label><input type="number" step="0.01" value={sp} onChange={(e)=>setSP(e.target.value)} className={inputClass}/></div></div>
        {prevComm>0&&<div className="p-3 bg-rose-500/[0.08] border border-indigo-500/20 rounded-lg text-sm text-rose-300">Commission : <span className="font-semibold">{formatCurrency(prevComm)}</span></div>}
        <div className="flex justify-end gap-2 pt-2"><button onClick={()=>setShowLink(false)} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300">Annuler</button><button onClick={handleLink} disabled={!selProd||!pp||!sp||isPending} className="px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-400 disabled:opacity-50">{isPending?"...":"Lier"}</button></div>
      </div></div>}
    </>
  );
}
