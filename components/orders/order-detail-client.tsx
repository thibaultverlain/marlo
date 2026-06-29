"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Package, Truck, CheckCircle2, CreditCard,
  Copy, Check, AlertTriangle, MapPin, ExternalLink, Camera, X,
  Upload, FileText, Edit2, Save, Mail, Phone,
} from "lucide-react";
import {
  updateShippingStatusAction,
  updatePaymentStatusAction,
  updateTrackingAction,
  togglePrepChecklistAction,
  setDisputeAction,
  updateOrderNotesAction,
} from "@/lib/actions/orders";
import { getTrackingUrl, getCarrierName } from "@/lib/tracking";

type OrderDetail = {
  id: string;
  shopId: string | null;
  productId: string | null;
  customerId: string | null;
  channel: string;
  salePrice: string;
  platformFees: string | null;
  shippingCost: string | null;
  netRevenue: string | null;
  margin: string | null;
  marginPct: string | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  shippingStatus: string | null;
  trackingNumber: string | null;
  invoiceNumber: string | null;
  soldAt: Date;
  notes: string | null;
  prepChecklist: Record<string, boolean> | null;
  disputeStatus: string | null;
  disputeReason: string | null;
  disputeOpenedAt: Date | null;
  disputeResolvedAt: Date | null;
  shippingPhotos: string[];
  productTitle: string | null;
  productBrand: string | null;
  productSku: string | null;
  productImages: string[] | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  customerCity: string | null;
};

const CHANNELS: Record<string, string> = {
  vinted: "Vinted", vestiaire: "Vestiaire", stockx: "StockX", prive: "Client prive", autre: "Autre",
};

const CHECKLIST_ITEMS = [
  { key: "article_verifie",   label: "Article verifie",         hint: "Etat conforme aux photos, pas de defaut" },
  { key: "photo_etat",        label: "Photo d'etat prise",      hint: "Preuve avant envoi (au cas ou litige)" },
  { key: "accessoires",       label: "Accessoires inclus",      hint: "Dust bag, boite, carte authenticite" },
  { key: "emballage",         label: "Emballage soigne",        hint: "Mousseline, papier de soie, scelle" },
  { key: "mot_personnalise",  label: "Mot personnalise inclus", hint: "Petit mot pour la cliente" },
  { key: "etiquette_imprimee", label: "Etiquette imprimee",     hint: "Bordereau de transport pret" },
];

const TIMELINE_STEPS = [
  { key: "vendu",       label: "Vendu",        icon: CheckCircle2 },
  { key: "preparation", label: "Preparation",  icon: Package },
  { key: "expedie",     label: "Expediee",     icon: Truck },
  { key: "livre",       label: "Livree",       icon: CheckCircle2 },
  { key: "paye",        label: "Payee",        icon: CreditCard },
];

const DISPUTE_LABELS: Record<string, { label: string; color: string }> = {
  ouvert:           { label: "Litige en cours",  color: "text-red-400 bg-red-500/10 border-red-500/30" },
  rembourse:        { label: "Rembourse",        color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30" },
  resolu:           { label: "Resolu",           color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  article_recupere: { label: "Article recupere", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
};

function formatCurrency(v: string | number | null): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(v));
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function getCurrentStep(o: OrderDetail): string {
  if (o.paymentStatus === "recu" && (o.shippingStatus === "livre" || o.shippingStatus === "expedie")) return "paye";
  if (o.shippingStatus === "livre") return "livre";
  if (o.shippingStatus === "expedie") return "expedie";
  const checklist = o.prepChecklist ?? {};
  const anyChecked = Object.values(checklist).some((v) => v === true);
  if (anyChecked) return "preparation";
  return "vendu";
}

export default function OrderDetailClient({ order: initialOrder }: { order: OrderDetail }) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [isPending, startTransition] = useTransition();
  const [trackingInput, setTrackingInput] = useState(order.trackingNumber ?? "");
  const [editingTracking, setEditingTracking] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState(order.notes ?? "");
  const [copied, setCopied] = useState<string | null>(null);
  const [disputeFormOpen, setDisputeFormOpen] = useState(false);
  const [disputeReasonInput, setDisputeReasonInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const checklist = order.prepChecklist ?? {};
  const checklistDone = CHECKLIST_ITEMS.filter((i) => checklist[i.key]).length;
  const checklistTotal = CHECKLIST_ITEMS.length;
  const currentStep = getCurrentStep(order);
  const currentStepIdx = TIMELINE_STEPS.findIndex((s) => s.key === currentStep);

  const customerName = order.customerFirstName ? `${order.customerFirstName} ${order.customerLastName ?? ""}`.trim() : null;
  const customerFullAddress = [order.customerAddress, order.customerCity].filter(Boolean).join(", ");

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  function toggleChecklist(key: string) {
    const next = !checklist[key];
    setOrder((o) => ({ ...o, prepChecklist: { ...(o.prepChecklist ?? {}), [key]: next } }));
    startTransition(async () => { await togglePrepChecklistAction(order.id, key, next); });
  }

  function handleMarkShipped() {
    startTransition(async () => {
      await updateTrackingAction(order.id, trackingInput.trim());
      setOrder((o) => ({ ...o, shippingStatus: "expedie", trackingNumber: trackingInput.trim() || null }));
      setEditingTracking(false);
      router.refresh();
    });
  }

  function handleStatusChange(status: string) {
    startTransition(async () => {
      await updateShippingStatusAction(order.id, status);
      setOrder((o) => ({ ...o, shippingStatus: status }));
      router.refresh();
    });
  }

  function handlePaymentReceived() {
    startTransition(async () => {
      await updatePaymentStatusAction(order.id, "recu");
      setOrder((o) => ({ ...o, paymentStatus: "recu" }));
      router.refresh();
    });
  }

  function handleSaveNotes() {
    startTransition(async () => {
      await updateOrderNotesAction(order.id, notesInput);
      setOrder((o) => ({ ...o, notes: notesInput }));
      setEditingNotes(false);
    });
  }

  function handleOpenDispute() {
    if (!disputeReasonInput.trim()) return;
    startTransition(async () => {
      await setDisputeAction(order.id, "ouvert", disputeReasonInput);
      setOrder((o) => ({ ...o, disputeStatus: "ouvert", disputeReason: disputeReasonInput, disputeOpenedAt: new Date() }));
      setDisputeFormOpen(false);
      setDisputeReasonInput("");
      router.refresh();
    });
  }

  function handleResolveDispute(resolution: string) {
    startTransition(async () => {
      await setDisputeAction(order.id, resolution || null, order.disputeReason);
      setOrder((o) => ({ ...o, disputeStatus: resolution || null, disputeResolvedAt: new Date() }));
      router.refresh();
    });
  }

  async function handleUploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/orders/${order.id}/upload-photo`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setOrder((o) => ({ ...o, shippingPhotos: data.photos }));
      } else {
        alert(data.error ?? "Erreur d'upload");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeletePhoto(url: string) {
    if (!confirm("Supprimer cette photo ?")) return;
    const res = await fetch(`/api/orders/${order.id}/upload-photo`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (data.success) setOrder((o) => ({ ...o, shippingPhotos: data.photos }));
  }

  const disputeBadge = order.disputeStatus ? DISPUTE_LABELS[order.disputeStatus] : null;

  return (
    <>
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/orders" className="w-9 h-9 rounded-lg border border-[var(--color-border)] flex items-center justify-center text-zinc-400 hover:text-white shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">Commande</p>
          <h1 className="text-xl lg:text-2xl font-bold text-white truncate">{order.productTitle ?? "Article"}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {order.productBrand && <>{order.productBrand} · </>}
            {CHANNELS[order.channel] ?? order.channel} · {formatCurrency(order.salePrice)} · {formatDate(order.soldAt)}
          </p>
        </div>
        {disputeBadge && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${disputeBadge.color}`}>
            <AlertTriangle size={12} />
            {disputeBadge.label}
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="card-static p-4 lg:p-5">
        <div className="flex items-start justify-between gap-1">
          {TIMELINE_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isDone = i < currentStepIdx;
            const isCurrent = i === currentStepIdx;
            const isFuture = i > currentStepIdx;
            return (
              <div key={step.key} className="flex flex-col items-center text-center flex-1 min-w-0 relative">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors z-10 ${
                  isDone ? "bg-emerald-500/15 border-emerald-500 text-emerald-400" :
                  isCurrent ? "bg-rose-500/15 border-rose-500 text-rose-400 ring-4 ring-rose-500/15" :
                  "bg-zinc-800/40 border-zinc-700 text-zinc-600"
                }`}>
                  <Icon size={16} />
                </div>
                <p className={`text-[10px] sm:text-[11px] font-medium mt-2 ${
                  isFuture ? "text-zinc-600" : isCurrent ? "text-rose-400" : "text-zinc-400"
                }`}>
                  {step.label}
                </p>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div className={`absolute top-[18px] left-[calc(50%+18px)] right-[calc(-50%+18px)] h-px ${isDone ? "bg-emerald-500/40" : "bg-zinc-700/50"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action principale contextuelle */}
      {(currentStep === "vendu" || currentStep === "preparation") && (
        <div className="card-static p-5 bg-amber-500/[0.04] border-amber-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Package size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-white">Preparer la commande</p>
              <p className="text-[12px] text-zinc-400">Coche les etapes de preparation au fur et a mesure</p>
            </div>
            <div className="ml-auto text-[13px] font-mono text-amber-400 tabular-nums">{checklistDone}/{checklistTotal}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CHECKLIST_ITEMS.map((item) => {
              const done = !!checklist[item.key];
              return (
                <button
                  key={item.key}
                  onClick={() => toggleChecklist(item.key)}
                  disabled={isPending}
                  className={`text-left flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                    done
                      ? "bg-emerald-500/5 border-emerald-500/30"
                      : "bg-[var(--color-bg)]/40 border-[var(--color-border)] hover:border-zinc-600"
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                    done ? "bg-emerald-500 border-emerald-500" : "border-zinc-600"
                  }`}>
                    {done && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium ${done ? "text-emerald-300 line-through" : "text-white"}`}>{item.label}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{item.hint}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {checklistDone === checklistTotal && order.shippingStatus !== "expedie" && order.shippingStatus !== "livre" && (
            <div className="mt-4 pt-4 border-t border-amber-500/20">
              {!editingTracking ? (
                <button onClick={() => setEditingTracking(true)} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-500 hover:bg-rose-400 rounded-lg text-white font-semibold text-[14px]">
                  <Truck size={16} />
                  Marquer comme expediee
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    placeholder="Numero de suivi (optionnel)"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    autoFocus
                    className="flex-1 min-w-[180px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-zinc-500 font-mono"
                  />
                  <button onClick={handleMarkShipped} disabled={isPending} className="px-4 py-2 bg-rose-500 hover:bg-rose-400 rounded-lg text-white font-semibold text-[13px] disabled:opacity-50">
                    Confirmer
                  </button>
                  <button onClick={() => setEditingTracking(false)} className="p-2 text-zinc-500 hover:text-zinc-300">
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {currentStep === "expedie" && (
        <div className="card-static p-5 bg-emerald-500/[0.04] border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Truck size={18} className="text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-white">Commande en transit</p>
              <p className="text-[12px] text-zinc-400">Confirme la livraison quand la cliente l'a recue</p>
            </div>
            <button onClick={() => handleStatusChange("livre")} disabled={isPending} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-white font-semibold text-[13px] disabled:opacity-50 flex items-center gap-2">
              <CheckCircle2 size={14} />
              Marquer livree
            </button>
          </div>
        </div>
      )}

      {currentStep === "livre" && (
        <div className="card-static p-5 bg-rose-500/[0.04] border-rose-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <CreditCard size={18} className="text-rose-400" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-white">En attente du paiement</p>
              <p className="text-[12px] text-zinc-400">Confirme quand l'argent est arrive sur ton compte</p>
            </div>
            <button onClick={handlePaymentReceived} disabled={isPending} className="px-4 py-2 bg-rose-500 hover:bg-rose-400 rounded-lg text-white font-semibold text-[13px] disabled:opacity-50 flex items-center gap-2">
              <Check size={14} />
              Paiement recu
            </button>
          </div>
        </div>
      )}

      {currentStep === "paye" && (
        <div className="card-static p-5 bg-emerald-500/[0.04] border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-white">Commande terminee</p>
              <p className="text-[12px] text-zinc-400">Marge nette : {formatCurrency(order.margin)} ({order.marginPct ?? "0"}%)</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Adresse / Client */}
        <div className="card-static p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-semibold text-white flex items-center gap-2">
              <MapPin size={14} className="text-zinc-500" />
              Adresse & client
            </h2>
            {order.customerId && (
              <Link href={`/customers/${order.customerId}`} className="text-[11px] text-rose-400 hover:underline flex items-center gap-1">
                Voir fiche <ExternalLink size={10} />
              </Link>
            )}
          </div>
          {customerName ? (
            <div className="space-y-2.5">
              <Row icon={null} label={customerName} bold copyable id={`name-${order.id}`} copied={copied} onCopy={handleCopy} />
              {customerFullAddress && <Row icon={MapPin} label={customerFullAddress} copyable id={`addr-${order.id}`} copied={copied} onCopy={handleCopy} />}
              {order.customerEmail && <Row icon={Mail} label={order.customerEmail} copyable id={`email-${order.id}`} copied={copied} onCopy={handleCopy} />}
              {order.customerPhone && <Row icon={Phone} label={order.customerPhone} copyable id={`phone-${order.id}`} copied={copied} onCopy={handleCopy} />}
            </div>
          ) : (
            <p className="text-[13px] text-zinc-500">Pas de client lie (vente plateforme anonyme).</p>
          )}
        </div>

        {/* Tracking + paiement */}
        <div className="card-static p-5 space-y-4">
          <h2 className="text-[13px] font-semibold text-white flex items-center gap-2">
            <Truck size={14} className="text-zinc-500" />
            Expedition & paiement
          </h2>
          <div className="space-y-2.5 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Statut expedition</span>
              <span className="text-white font-medium">{order.shippingStatus ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-zinc-500">Numero de suivi</span>
              {order.trackingNumber ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <code className="text-emerald-400 font-mono text-[12px]">{order.trackingNumber}</code>
                  <button onClick={() => handleCopy(order.trackingNumber!, "tracking")} className="p-0.5 hover:text-zinc-200 text-zinc-500">
                    {copied === "tracking" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  </button>
                  <a
                    href={getTrackingUrl(order.trackingNumber)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20"
                    title={getCarrierName(order.trackingNumber) ?? "Suivre"}
                  >
                    <ExternalLink size={10} />
                    Suivre
                  </a>
                </div>
              ) : <span className="text-zinc-600">non saisi</span>}
            </div>
            {order.trackingNumber && (
              <div className="flex items-center justify-between -mt-1">
                <span className="text-zinc-500 text-[11px]">Transporteur</span>
                <span className="text-zinc-400 text-[11px]">{getCarrierName(order.trackingNumber)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Statut paiement</span>
              <span className={`font-medium ${order.paymentStatus === "recu" ? "text-emerald-400" : "text-amber-400"}`}>
                {order.paymentStatus ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Frais plateforme</span>
              <span className="text-zinc-300 tabular-nums">{formatCurrency(order.platformFees)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Net recu</span>
              <span className="text-white font-semibold tabular-nums">{formatCurrency(order.netRevenue)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-subtle)]">
              <span className="text-zinc-500">Marge nette</span>
              <span className={`font-semibold tabular-nums ${Number(order.margin) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatCurrency(order.margin)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Photos d'envoi */}
      <div className="card-static p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[13px] font-semibold text-white flex items-center gap-2">
            <Camera size={14} className="text-zinc-500" />
            Photos d'envoi
            <span className="text-zinc-500 font-normal">({order.shippingPhotos?.length ?? 0})</span>
          </h2>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 disabled:opacity-50">
            <Upload size={12} />
            {uploading ? "Upload..." : "Ajouter une photo"}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} />
        </div>
        {order.shippingPhotos && order.shippingPhotos.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {order.shippingPhotos.map((url) => (
              <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-[var(--color-border)] group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Photo envoi" className="w-full h-full object-cover" />
                <button onClick={() => handleDeletePhoto(url)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-zinc-500">Prends en photo l'article + l'emballage avant d'expedier. Utile si litige.</p>
        )}
      </div>

      {/* Litige */}
      <div className={`card-static p-5 ${order.disputeStatus === "ouvert" ? "ring-1 ring-red-500/30" : ""}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-white flex items-center gap-2">
            <AlertTriangle size={14} className="text-zinc-500" />
            Litige
          </h2>
          {disputeBadge && (
            <span className={`text-[11px] font-semibold px-2 py-1 rounded border ${disputeBadge.color}`}>
              {disputeBadge.label}
            </span>
          )}
        </div>

        {order.disputeStatus === null ? (
          !disputeFormOpen ? (
            <button onClick={() => setDisputeFormOpen(true)}
              className="text-[12px] text-red-400 hover:underline">
              Declarer un litige sur cette commande
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={disputeReasonInput}
                onChange={(e) => setDisputeReasonInput(e.target.value)}
                placeholder="Motif du litige (article non recu, faux, abime, retour demande...)"
                rows={3}
                autoFocus
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-zinc-500"
              />
              <div className="flex gap-2">
                <button onClick={handleOpenDispute} disabled={isPending || !disputeReasonInput.trim()}
                  className="px-3 py-1.5 text-[12px] font-semibold bg-red-500 hover:bg-red-400 text-white rounded-lg disabled:opacity-50">
                  Ouvrir le litige
                </button>
                <button onClick={() => { setDisputeFormOpen(false); setDisputeReasonInput(""); }}
                  className="px-3 py-1.5 text-[12px] text-zinc-500 hover:text-zinc-300">
                  Annuler
                </button>
              </div>
            </div>
          )
        ) : order.disputeStatus === "ouvert" ? (
          <div className="space-y-3">
            <div className="p-3 bg-red-500/[0.05] border border-red-500/20 rounded-lg">
              <p className="text-[11px] text-red-400 uppercase tracking-wider font-semibold mb-1">Motif</p>
              <p className="text-[13px] text-red-200">{order.disputeReason ?? "Aucun motif renseigne"}</p>
              <p className="text-[10px] text-zinc-500 mt-2">Ouvert le {formatDate(order.disputeOpenedAt)}</p>
            </div>
            <p className="text-[11px] text-zinc-500 mb-2">Resolution :</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => handleResolveDispute("rembourse")} disabled={isPending}
                className="px-3 py-1.5 text-[12px] text-zinc-300 bg-[var(--color-bg-hover)] hover:bg-zinc-700 rounded-lg">
                Rembourse
              </button>
              <button onClick={() => handleResolveDispute("article_recupere")} disabled={isPending}
                className="px-3 py-1.5 text-[12px] text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg">
                Article recupere
              </button>
              <button onClick={() => handleResolveDispute("resolu")} disabled={isPending}
                className="px-3 py-1.5 text-[12px] text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg">
                Resolu sans frais
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {order.disputeReason && (
              <p className="text-[12px] text-zinc-400">Motif : {order.disputeReason}</p>
            )}
            <p className="text-[11px] text-zinc-500">
              Resolu le {formatDate(order.disputeResolvedAt)}
            </p>
            <button onClick={() => handleResolveDispute("")} disabled={isPending}
              className="text-[11px] text-zinc-500 hover:text-rose-400 mt-2">
              Reouvrir le litige
            </button>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="card-static p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-white flex items-center gap-2">
            <FileText size={14} className="text-zinc-500" />
            Notes
          </h2>
          {!editingNotes ? (
            <button onClick={() => { setEditingNotes(true); setNotesInput(order.notes ?? ""); }}
              className="text-[11px] text-rose-400 hover:underline flex items-center gap-1">
              <Edit2 size={11} />
              Modifier
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleSaveNotes} disabled={isPending}
                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1">
                <Save size={11} /> Sauver
              </button>
              <button onClick={() => setEditingNotes(false)}
                className="text-[11px] text-zinc-500 hover:underline">
                Annuler
              </button>
            </div>
          )}
        </div>
        {editingNotes ? (
          <textarea
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            placeholder="Demande de la cliente, infos d'envoi, anecdote..."
            rows={4}
            autoFocus
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-zinc-500"
          />
        ) : (
          <p className="text-[13px] text-zinc-400 whitespace-pre-wrap">{order.notes || <span className="text-zinc-600 italic">Aucune note</span>}</p>
        )}
      </div>
    </>
  );
}

function Row({ icon: Icon, label, bold, copyable, id, copied, onCopy }: {
  icon: any; label: string; bold?: boolean; copyable?: boolean;
  id?: string; copied?: string | null; onCopy?: (text: string, id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      {Icon && <Icon size={13} className="text-zinc-500 shrink-0" />}
      <span className={`text-[13px] flex-1 ${bold ? "text-white font-medium" : "text-zinc-300"}`}>{label}</span>
      {copyable && id && onCopy && (
        <button onClick={() => onCopy(label, id)} className="p-1 text-zinc-500 hover:text-zinc-300">
          {copied === id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
        </button>
      )}
    </div>
  );
}
