"use client";

import { useState } from "react";
import { ShieldCheck, Clock, CheckCircle2, XCircle, AlertTriangle, Trash2, ChevronRight } from "lucide-react";
import type { AuthenticityCheck } from "@/lib/db/schema";
import type { Product } from "@/lib/db/schema";
import { BRAND_CHECKLISTS } from "@/lib/authentification/checklists";
import AuthBrandSelector from "./auth-brand-selector";
import AuthChecklist from "./auth-checklist";
import { deleteAuthCheckAction } from "@/lib/actions/authentification";
import { formatDate } from "@/lib/utils";

const VERDICT_CONFIG = {
  authentique: { label: "Authentique", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  suspect:     { label: "Suspect",     icon: AlertTriangle, color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  faux:        { label: "Faux",        icon: XCircle,       color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
  non_conclu:  { label: "Non conclu",  icon: Clock,         color: "text-zinc-500",    bg: "bg-zinc-500/10 border-zinc-500/20" },
};

type Step = "select" | "checklist";

export default function AuthPageClient({
  checks,
  products,
  prefillBrand,
  prefillProductId,
}: {
  checks: AuthenticityCheck[];
  products: Product[];
  prefillBrand?: string;
  prefillProductId?: string;
}) {
  const [step, setStep] = useState<Step>(prefillBrand ? "checklist" : "select");
  const [brand, setBrand] = useState(prefillBrand ?? "");
  const [model, setModel] = useState("");
  const [productId, setProductId] = useState(prefillProductId ?? "");
  const [checkList, setCheckList] = useState<AuthenticityCheck[]>(checks);
  const [deleting, setDeleting] = useState<string | null>(null);

  function handleBrandSelected(b: string, m: string, pid: string) {
    setBrand(b);
    setModel(m);
    setProductId(pid);
    setStep("checklist");
  }

  function handleSaved(newCheck: AuthenticityCheck) {
    setCheckList((prev) => [newCheck, ...prev]);
    setStep("select");
    setBrand("");
    setModel("");
    setProductId("");
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await deleteAuthCheckAction(id);
    setCheckList((prev) => prev.filter((c) => c.id !== id));
    setDeleting(null);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
          <ShieldCheck size={20} className="text-rose-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Authentification</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">Verification d'authenticite par marque et modele</p>
        </div>
      </div>

      {/* Main content */}
      {step === "select" && (
        <AuthBrandSelector
          products={products}
          defaultBrand={brand}
          defaultModel={model}
          defaultProductId={productId}
          onStart={handleBrandSelected}
        />
      )}

      {step === "checklist" && brand && (
        <AuthChecklist
          brand={brand}
          model={model}
          productId={productId}
          products={products}
          onSaved={handleSaved}
          onBack={() => setStep("select")}
        />
      )}

      {/* History */}
      {checkList.length > 0 && step === "select" && (
        <div className="card-static p-6">
          <h2 className="text-[15px] font-semibold text-white mb-4">Historique des verifications</h2>
          <div className="space-y-2">
            {checkList.map((c) => {
              const cfg = VERDICT_CONFIG[c.verdict];
              const Icon = cfg.icon;
              const brandLabel = BRAND_CHECKLISTS.find((b) => b.id === c.brand)?.label ?? c.brand;
              const modelLabel = c.brand && c.model
                ? BRAND_CHECKLISTS.find((b) => b.id === c.brand)?.models.find((m) => m.id === c.model)?.label
                : undefined;
              const product = c.productId ? products.find((p) => p.id === c.productId) : undefined;
              const points = c.points as Array<{ id: string; checked: boolean }>;
              const checkedCount = points.filter((p) => p.checked).length;

              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${cfg.bg} transition-all`}
                >
                  <Icon size={18} className={`flex-shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold text-white">{brandLabel}</span>
                      {modelLabel && (
                        <>
                          <ChevronRight size={12} className="text-zinc-500" />
                          <span className="text-[13px] text-zinc-400">{modelLabel}</span>
                        </>
                      )}
                      {product && (
                        <>
                          <ChevronRight size={12} className="text-zinc-500" />
                          <span className="text-[12px] text-zinc-500 truncate">{product.title}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className={`text-[12px] font-medium ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-[11px] text-zinc-500">{checkedCount}/{points.length} points</span>
                      <span className="text-[11px] text-zinc-700">{formatDate(c.createdAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deleting === c.id}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
