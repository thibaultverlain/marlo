"use client";
import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowRight, CheckCircle, X, Package, FileText } from "lucide-react";
import { addPsItemAction, deletePsItemAction, updateMissionStatusAction, deleteMissionAction } from "@/lib/actions/personal-shopping";
import { generateInvoiceFromMissionAction } from "@/lib/actions/invoices";
import { formatCurrency } from "@/lib/utils";

const inputClass = "w-full px-3 py-2.5 text-[13px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-zinc-200 placeholder:text-zinc-600";
type CustomerOption = { id: string; name: string; vip: boolean };
type ItemRow = { id: string; customerId: string; description: string; brand: string|null; purchasePrice: number; commissionAmount: number|null; invoiced: boolean|null };
type CustomerGroup = { customerId: string; customerName: string; items: ItemRow[]; total: number; commission: number };
const NS: Record<string, {next:string;label:string}[]> = { planifie:[{next:"en_cours",label:"Démarrer"},{next:"annule",label:"Annuler"}], en_cours:[{next:"termine",label:"Terminer"},{next:"annule",label:"Annuler"}], termine:[{next:"facture",label:"Générer les factures"}], facture:[], annule:[] };

export default function MissionDetailClient({missionId,missionStatus,customerGroups,customers}:{missionId:string;missionStatus:string;customerGroups:CustomerGroup[];customers:CustomerOption[]}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({customerId:"",description:"",brand:"",purchasePrice:"",commissionRate:"15",notes:""});
  const [error, setError] = useState<string|null>(null);
  const commPreview = useMemo(()=>{const p=parseFloat(form.purchasePrice)||0,r=parseFloat(form.commissionRate)||0;return p>0&&r>0?(p*r)/100:0;},[form.purchasePrice,form.commissionRate]);
  function updateField(f:string,v:string){setForm((p)=>({...p,[f]:v}));}
  function resetForm(){setForm({customerId:"",description:"",brand:"",purchasePrice:"",commissionRate:"15",notes:""});setError(null);}

  async function handleAddItem(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setError(null);const fd=new FormData();fd.append("missionId",missionId);Object.entries(form).forEach(([k,v])=>fd.append(k,v));startTransition(async()=>{const r=await addPsItemAction(fd);if(r?.error)setError(r.error);else{resetForm();setShowAdd(false);}});}
  function handleDeleteItem(id:string){if(!confirm("Supprimer ?"))return;startTransition(async()=>{await deletePsItemAction(id,missionId);});}
  function handleStatus(s:string){if(s==="facture"){startTransition(async()=>{const r=await generateInvoiceFromMissionAction(missionId);if("invoiceId" in r&&r.invoiceId)router.push(`/invoices/${r.invoiceId}`);});return;}startTransition(async()=>{await updateMissionStatusAction(missionId,s);});}
  function handleDelete(){if(!confirm("Supprimer cette mission ?"))return;startTransition(async()=>{await deleteMissionAction(missionId);});}

  const nextActions=NS[missionStatus]||[];
  const canAdd=["planifie","en_cours"].includes(missionStatus);

  return (
    <>
      {canAdd&&<div className="flex items-center justify-between bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4">
        <div><h3 className="text-sm font-semibold text-zinc-300">Articles</h3><p className="text-[11px] text-zinc-500 mt-0.5">Ajoute chaque article acheté.</p></div>
        <button onClick={()=>setShowAdd(true)} disabled={isPending||customers.length===0} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"><Plus size={14}/>Ajouter</button>
      </div>}

      {customerGroups.length===0?<div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-12 text-center"><Package size={40} className="mx-auto text-zinc-700 mb-3"/><p className="text-zinc-500 text-sm">Aucun article</p></div>:(
        <div className="space-y-4">{customerGroups.map((g)=>(
          <div key={g.customerId} className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-zinc-800/30 border-b border-[var(--color-border)]"><p className="text-sm font-semibold text-zinc-200">{g.customerName}</p><div className="flex items-center gap-4 text-sm"><span className="text-zinc-400">Total : <span className="font-semibold text-zinc-200">{formatCurrency(g.total)}</span></span>{g.commission>0&&<span className="text-indigo-400">+{formatCurrency(g.commission)}</span>}</div></div>
            <div className="divide-y divide-[var(--color-border)]">{g.items.map((item)=>(
              <div key={item.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex-1 min-w-0"><p className="text-[13px] text-zinc-200">{item.description}</p>{item.brand&&<p className="text-[11px] text-zinc-500 mt-0.5">{item.brand}</p>}</div>
                <div className="text-right flex items-center gap-4"><div><p className="text-[13px] font-medium text-zinc-200 tabular-nums">{formatCurrency(item.purchasePrice)}</p>{item.commissionAmount&&<p className="text-[11px] text-indigo-400 tabular-nums">+{formatCurrency(item.commissionAmount)}</p>}</div>{canAdd&&<button onClick={()=>handleDeleteItem(item.id)} disabled={isPending} className="text-zinc-600 hover:text-red-400 transition-colors"><Trash2 size={14}/></button>}</div>
              </div>
            ))}</div>
          </div>
        ))}</div>
      )}

      {nextActions.length>0&&<div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5"><h3 className="text-sm font-semibold text-zinc-300 mb-3">Actions</h3><div className="flex flex-wrap gap-2">{nextActions.map((a)=><button key={a.next} onClick={()=>handleStatus(a.next)} disabled={isPending} className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 ${a.next==="annule"?"text-red-400 hover:bg-red-500/10":a.next==="facture"?"text-white bg-indigo-600 hover:bg-indigo-500":a.next==="termine"?"text-white bg-emerald-600 hover:bg-emerald-500":"text-zinc-300 bg-[var(--color-bg-raised)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]"}`}>{a.next==="annule"?<X size={14}/>:a.next==="facture"?<FileText size={14}/>:a.next==="termine"?<CheckCircle size={14}/>:<ArrowRight size={14}/>}{a.label}</button>)}</div></div>}
      <div className="flex items-center justify-end pt-2"><button onClick={handleDelete} disabled={isPending} className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"><Trash2 size={14}/>Supprimer</button></div>

      {showAdd&&<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={()=>setShowAdd(false)}><div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl max-w-lg w-full p-6" onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">Ajouter un article</h3><button onClick={()=>setShowAdd(false)} className="text-zinc-500 hover:text-zinc-300"><X size={18}/></button></div>
        <form onSubmit={handleAddItem} className="space-y-4">
          {error&&<div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>}
          <div><label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Client *</label><select required value={form.customerId} onChange={(e)=>updateField("customerId",e.target.value)} className={inputClass}><option value="">Choisir</option>{customers.map((c)=><option key={c.id} value={c.id}>{c.vip?"* ":""}{c.name}</option>)}</select></div>
          <div><label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Description *</label><input type="text" required value={form.description} onChange={(e)=>updateField("description",e.target.value)} placeholder="Robe Dior..." className={inputClass}/></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Marque</label><input type="text" value={form.brand} onChange={(e)=>updateField("brand",e.target.value)} className={inputClass}/></div><div><label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Prix *</label><input type="number" step="0.01" required value={form.purchasePrice} onChange={(e)=>updateField("purchasePrice",e.target.value)} className={inputClass}/></div></div>
          <div><label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">Commission %</label><input type="number" step="0.5" value={form.commissionRate} onChange={(e)=>updateField("commissionRate",e.target.value)} className={inputClass}/>{commPreview>0&&<p className="text-[11px] text-indigo-400 mt-1">Commission : {formatCurrency(commPreview)}</p>}</div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={()=>{resetForm();setShowAdd(false);}} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300">Annuler</button><button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50">{isPending?"...":"Ajouter"}</button></div>
        </form>
      </div></div>}
    </>
  );
}
