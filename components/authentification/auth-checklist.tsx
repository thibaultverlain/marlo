"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  ArrowLeft, ShieldCheck, AlertTriangle, XCircle, Clock,
  Check, ImageOff, ChevronDown, ChevronUp, Loader2
} from "lucide-react";
import { BRAND_CHECKLISTS, buildFullChecklist, CATEGORY_LABELS } from "@/lib/authentification/checklists";
import type { CheckPoint, CheckCategory } from "@/lib/authentification/checklists";
import type { Product, AuthenticityCheck } from "@/lib/db/schema";
import { saveAuthCheckAction } from "@/lib/actions/authentification";

type PointState = { id: string; checked: boolean };

type Verdict = "authentique" | "suspect" | "faux" | "non_conclu";

const VERDICT_OPTIONS: { value: Verdict; label: string; icon: React.ElementType; color: string; border: string }[] = [
  { value: "authentique", label: "Authentique", icon: ShieldCheck,    color: "text-emerald-400", border: "border-emerald-500/60 bg-emerald-500/8" },
  { value: "suspect",     label: "Suspect",     icon: AlertTriangle,  color: "text-amber-400",   border: "border-amber-500/60 bg-amber-500/8" },
  { value: "faux",        label: "Faux",        icon: XCircle,        color: "text-red-400",     border: "border-red-500/60 bg-red-500/8" },
  { value: "non_conclu",  label: "Non conclu",  icon: Clock,          color: "text-zinc-500",    border: "border-zinc-500/40 bg-zinc-500/8" },
];

export default function AuthChecklist({
  brand,
  model,
  productId,
  products,
  onSaved,
  onBack,
}: {
  brand: string;
  model: string;
  productId: string;
  products: Product[];
  onSaved: (check: AuthenticityCheck) => void;
  onBack: () => void;
}) {
  const brandData = BRAND_CHECKLISTS.find((b) => b.id === brand);
  const modelData = brandData?.models.find((m) => m.id === model);
  const allPoints = buildFullChecklist(brand, model || undefined);

  const [pointStates, setPointStates] = useState<PointState[]>(
    allPoints.map((p) => ({ id: p.id, checked: false }))
  );
  const [verdict, setVerdict] = useState<Verdict>("non_conclu");
  const [notes, setNotes] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<CheckCategory>>(
    new Set(Object.keys(CATEGORY_LABELS) as CheckCategory[])
  );
  const [expandedPhotos, setExpandedPhotos] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const checkedCount = pointStates.filter((s) => s.checked).length;
  const criticalPoints = allPoints.filter((p) => p.critical);
  const failedCritical = criticalPoints.filter((p) => {
    const state = pointStates.find((s) => s.id === p.id);
    return !state?.checked;
  });

  const groupedPoints = allPoints.reduce<Record<CheckCategory, CheckPoint[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<CheckCategory, CheckPoint[]>);

  function toggle(id: string) {
    setPointStates((prev) =>
      prev.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s))
    );
  }

  function toggleCategory(cat: CheckCategory) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function togglePhoto(id: string) {
    setExpandedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveAuthCheckAction({
        brand,
        model: model || undefined,
        productId: productId || undefined,
        points: pointStates,
        verdict,
        notes: notes.trim() || undefined,
      });
      if (result.success && result.id) {
        onSaved({
          id: result.id,
          userId: "",
          shopId: "",
          productId: productId || null,
          brand,
          model: model || null,
          points: pointStates,
          verdict,
          notes: notes || null,
          createdAt: new Date(),
        } as AuthenticityCheck);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-[18px] font-bold text-white">
            {brandData?.label}{modelData ? ` — ${modelData.label}` : ""}
          </h2>
          <p className="text-[12px] text-zinc-500">
            {checkedCount}/{allPoints.length} points verifies
            {failedCritical.length > 0 && (
              <span className="ml-2 text-amber-400">· {failedCritical.length} point{failedCritical.length > 1 ? "s" : ""} critique{failedCritical.length > 1 ? "s" : ""} non valides</span>
            )}
          </p>
        </div>
        {/* Progress bar */}
        <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-rose-500 transition-all duration-300 rounded-full"
            style={{ width: `${allPoints.length > 0 ? (checkedCount / allPoints.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Checklist grouped by category */}
      <div className="space-y-3">
        {(Object.keys(groupedPoints) as CheckCategory[]).map((cat) => {
          const pts = groupedPoints[cat];
          if (!pts?.length) return null;
          const isExpanded = expandedCategories.has(cat);
          const catChecked = pts.filter((p) => pointStates.find((s) => s.id === p.id)?.checked).length;

          return (
            <div key={cat} className="card-static overflow-hidden">
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--color-bg-hover)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-white">{CATEGORY_LABELS[cat]}</span>
                  <span className="text-[11px] text-zinc-500">{catChecked}/{pts.length}</span>
                </div>
                {isExpanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
              </button>

              {isExpanded && (
                <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border-subtle)]">
                  {pts.map((point) => {
                    const state = pointStates.find((s) => s.id === point.id);
                    const isChecked = state?.checked ?? false;
                    const photoExpanded = expandedPhotos.has(point.id);

                    return (
                      <div key={point.id} className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggle(point.id)}
                            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                              isChecked
                                ? "bg-emerald-500 border-emerald-500"
                                : point.critical
                                ? "border-amber-500/50 hover:border-amber-400"
                                : "border-zinc-700 hover:border-zinc-500"
                            }`}
                          >
                            {isChecked && <Check size={11} className="text-white" strokeWidth={2.5} />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-[13px] font-medium leading-tight ${isChecked ? "text-zinc-400 line-through decoration-zinc-600" : "text-white"}`}>
                                {point.label}
                              </p>
                              {point.critical && !isChecked && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                  Critique
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] text-zinc-500 mt-1 leading-relaxed">{point.detail}</p>

                            {point.photo && (
                              <button
                                onClick={() => togglePhoto(point.id)}
                                className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-400 hover:text-rose-300 transition-colors"
                              >
                                {photoExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                {photoExpanded ? "Masquer la photo" : "Voir la photo de reference"}
                              </button>
                            )}

                            {point.photo && photoExpanded && (
                              <div className="mt-2 rounded-lg overflow-hidden border border-[var(--color-border)] bg-zinc-900">
                                <ReferencePhoto src={point.photo} alt={point.label} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Verdict */}
      <div className="card-static p-5 space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Verdict</p>
        <div className="grid grid-cols-2 gap-2">
          {VERDICT_OPTIONS.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.value}
                onClick={() => setVerdict(v.value)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all ${
                  verdict === v.value ? `${v.border} ${v.color}` : "border-[var(--color-border)] text-zinc-500 hover:border-zinc-600"
                }`}
              >
                <Icon size={16} />
                <span className="text-[13px] font-semibold">{v.label}</span>
              </button>
            );
          })}
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Notes <span className="text-zinc-700 normal-case font-normal">(optionnel)</span>
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Details supplementaires, points douteux..."
            className="w-full px-3 py-2.5 bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg text-[13px] text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500/50 resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white text-[14px] font-semibold rounded-xl transition-colors"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          {isPending ? "Sauvegarde..." : "Sauvegarder le rapport"}
        </button>
      </div>
    </div>
  );
}

function ReferencePhoto({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-zinc-500">
        <ImageOff size={24} />
        <p className="text-[11px]">Photo de reference a ajouter dans {src}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain"
        onError={() => setError(true)}
        sizes="(max-width: 768px) 100vw, 600px"
      />
    </div>
  );
}
