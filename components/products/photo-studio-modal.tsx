"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Upload, Wand2, ImageIcon, Loader2, Check, AlertCircle, RotateCcw } from "lucide-react";

// Background presets - all generated client-side via gradients/patterns
const BACKGROUNDS = [
  { id: "white", label: "Blanc studio", gradient: "linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%)", thumb: "#ffffff" },
  { id: "cream", label: "Beige luxe", gradient: "linear-gradient(180deg, #faf5eb 0%, #ede4cf 100%)", thumb: "#f0e6d0" },
  { id: "grey", label: "Gris degrade", gradient: "linear-gradient(180deg, #f5f5f5 0%, #d4d4d4 100%)", thumb: "#dfdfdf" },
  { id: "rose", label: "Rose poudre", gradient: "linear-gradient(180deg, #fef0f1 0%, #fbd6dd 100%)", thumb: "#fbd6dd" },
  { id: "marble", label: "Marbre", gradient: null, thumb: "#e8e6e1" }, // Marble via pattern
];

const CANVAS_SIZE = 1080; // Final size 1080x1080 (Instagram + Vinted optimal)
const PREVIEW_SIZE = 360; // Display size in modal

type Step = "idle" | "processing" | "editing" | "saving";

export default function PhotoStudioModal({
  productId,
  open,
  onClose,
  onSaved,
}: {
  productId: string;
  open: boolean;
  onClose: () => void;
  onSaved: (url: string) => void;
}) {
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [cutoutBlob, setCutoutBlob] = useState<Blob | null>(null);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);

  // Editor params
  const [bg, setBg] = useState("white");
  const [shadow, setShadow] = useState(60); // 0-100
  const [brightness, setBrightness] = useState(100); // 50-150

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep("idle");
      setError(null);
      setOriginalFile(null);
      setCutoutBlob(null);
      if (cutoutUrl) URL.revokeObjectURL(cutoutUrl);
      setCutoutUrl(null);
      setBg("white");
      setShadow(60);
      setBrightness(100);
    }
  }, [open]);

  // Process file with background removal
  async function handleFile(file: File) {
    setOriginalFile(file);
    setStep("processing");
    setError(null);

    try {
      // Dynamic import - heavy lib, only load when needed
      const { removeBackground } = await import("@imgly/background-removal");

      const blob = await removeBackground(file, {
        output: {
          format: "image/png",
          quality: 1,
        },
      });

      setCutoutBlob(blob);
      setCutoutUrl(URL.createObjectURL(blob));
      setStep("editing");
    } catch (err: any) {
      console.error("Background removal error:", err);
      setError("Impossible de traiter cette image. Essaie une autre photo.");
      setStep("idle");
    }
  }

  // Draw preview on canvas
  const drawCanvas = useCallback(() => {
    if (!cutoutUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    // 1. Draw background
    drawBackground(ctx, bg);

    // 2. Load cutout image
    const img = new Image();
    img.onload = () => {
      // Fit object centered with padding
      const padding = CANVAS_SIZE * 0.12;
      const maxSize = CANVAS_SIZE - padding * 2;
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (CANVAS_SIZE - w) / 2;
      const y = (CANVAS_SIZE - h) / 2;

      // 3. Draw shadow (under the object)
      if (shadow > 0) {
        ctx.save();
        const shadowIntensity = shadow / 100;
        ctx.shadowColor = `rgba(0, 0, 0, ${0.35 * shadowIntensity})`;
        ctx.shadowBlur = 50 * shadowIntensity;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 30 * shadowIntensity;
        // Draw a transparent rect under image to cast shadow without modifying object
        ctx.fillStyle = "rgba(0,0,0,0.001)";
        ctx.fillRect(x, y, w, h);
        ctx.restore();
      }

      // 4. Draw object with brightness adjustment
      ctx.save();
      ctx.filter = `brightness(${brightness}%)`;
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
    };
    img.src = cutoutUrl;
  }, [cutoutUrl, bg, shadow, brightness]);

  // Draw background based on preset
  function drawBackground(ctx: CanvasRenderingContext2D, preset: string) {
    const config = BACKGROUNDS.find((b) => b.id === preset);
    if (!config) return;

    if (config.id === "marble") {
      // Marble effect via radial gradient + noise
      const grad = ctx.createRadialGradient(CANVAS_SIZE * 0.3, CANVAS_SIZE * 0.3, 0, CANVAS_SIZE * 0.5, CANVAS_SIZE * 0.5, CANVAS_SIZE * 0.7);
      grad.addColorStop(0, "#f5f3ee");
      grad.addColorStop(0.5, "#e8e6e1");
      grad.addColorStop(1, "#d8d5cd");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      // Subtle veining
      ctx.strokeStyle = "rgba(150, 145, 138, 0.15)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const startX = Math.random() * CANVAS_SIZE;
        const startY = Math.random() * CANVAS_SIZE;
        ctx.moveTo(startX, startY);
        for (let j = 0; j < 5; j++) {
          ctx.lineTo(startX + (Math.random() - 0.5) * 400, startY + (Math.random() - 0.5) * 400);
        }
        ctx.stroke();
      }
    } else if (config.gradient) {
      // Linear gradient
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_SIZE);
      // Parse colors from CSS gradient (simplified)
      if (preset === "white") { grad.addColorStop(0, "#ffffff"); grad.addColorStop(1, "#f5f5f5"); }
      else if (preset === "cream") { grad.addColorStop(0, "#faf5eb"); grad.addColorStop(1, "#ede4cf"); }
      else if (preset === "grey") { grad.addColorStop(0, "#f5f5f5"); grad.addColorStop(1, "#d4d4d4"); }
      else if (preset === "rose") { grad.addColorStop(0, "#fef0f1"); grad.addColorStop(1, "#fbd6dd"); }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }
  }

  useEffect(() => {
    if (step === "editing") drawCanvas();
  }, [step, drawCanvas]);

  // Save
  async function handleSave() {
    if (!canvasRef.current) return;
    setStep("saving");
    setError(null);

    try {
      // Canvas to blob
      const blob: Blob = await new Promise((resolve, reject) => {
        canvasRef.current!.toBlob((b) => b ? resolve(b) : reject(new Error("Canvas vide")), "image/jpeg", 0.92);
      });

      // Create File from blob
      const file = new File([blob], `studio-${Date.now()}.jpg`, { type: "image/jpeg" });

      // Upload via existing API endpoint
      const formData = new FormData();
      formData.append("file", file);
      formData.append("productId", productId);

      const res = await fetch(`/api/products/${productId}/upload-photo`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erreur d'upload");
      }

      const data = await res.json();
      onSaved(data.url);
      onClose();
    } catch (err: any) {
      console.error("Save error:", err);
      setError(err.message ?? "Erreur d'enregistrement");
      setStep("editing");
    }
  }

  function reset() {
    setOriginalFile(null);
    setCutoutBlob(null);
    if (cutoutUrl) URL.revokeObjectURL(cutoutUrl);
    setCutoutUrl(null);
    setStep("idle");
    setError(null);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <Wand2 size={15} className="text-rose-400" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white">Marlo Studio</h3>
              <p className="text-[11px] text-zinc-500">Photo professionnelle en quelques clics</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] text-zinc-500 hover:text-zinc-300">
            <X size={18} />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-4 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Step: IDLE - upload */}
          {step === "idle" && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-10 text-center cursor-pointer hover:border-rose-500/40 hover:bg-rose-500/[0.02] transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg-hover)] flex items-center justify-center mx-auto mb-4">
                <ImageIcon size={24} className="text-zinc-500" />
              </div>
              <p className="text-[14px] font-semibold text-white mb-1">Charge une photo</p>
              <p className="text-[12px] text-zinc-500">Article photographie chez toi, fond importe peu</p>
              <p className="text-[10px] text-zinc-600 mt-3">JPG, PNG · 10MB max</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
            </div>
          )}

          {/* Step: PROCESSING */}
          {step === "processing" && (
            <div className="py-16 text-center">
              <div className="inline-block">
                <Loader2 size={36} className="text-rose-400 animate-spin" />
              </div>
              <p className="text-[14px] font-semibold text-white mt-4">Detection de l'objet...</p>
              <p className="text-[12px] text-zinc-500 mt-1">Ca prend 3 a 5 secondes</p>
              <p className="text-[10px] text-zinc-600 mt-3">Premiere utilisation : telechargement du modele (~50MB)</p>
            </div>
          )}

          {/* Step: EDITING */}
          {(step === "editing" || step === "saving") && cutoutUrl && (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-5">
              {/* Preview */}
              <div className="flex items-start justify-center">
                <div className="relative w-full max-w-[400px] aspect-square rounded-xl overflow-hidden border border-[var(--color-border)]">
                  <canvas
                    ref={canvasRef}
                    style={{ width: "100%", height: "100%", display: "block" }}
                  />
                  {step === "saving" && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                      <Loader2 size={28} className="text-white animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-5">
                {/* Backgrounds */}
                <div>
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Fond</p>
                  <div className="grid grid-cols-5 md:grid-cols-3 gap-2">
                    {BACKGROUNDS.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setBg(b.id)}
                        disabled={step === "saving"}
                        className={`aspect-square rounded-lg border-2 transition-all ${bg === b.id ? "border-rose-400 ring-2 ring-rose-400/20" : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"}`}
                        style={{ background: b.gradient ?? b.thumb }}
                        title={b.label}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-1.5">{BACKGROUNDS.find((b) => b.id === bg)?.label}</p>
                </div>

                {/* Shadow */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Ombre</p>
                    <p className="text-[10px] text-zinc-400 tabular-nums">{shadow}%</p>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={shadow}
                    disabled={step === "saving"}
                    onChange={(e) => setShadow(Number(e.target.value))}
                    className="w-full accent-rose-400"
                  />
                </div>

                {/* Brightness */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Luminosite</p>
                    <p className="text-[10px] text-zinc-400 tabular-nums">{brightness}%</p>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    value={brightness}
                    disabled={step === "saving"}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-rose-400"
                  />
                </div>

                {/* Reset button */}
                <button
                  onClick={reset}
                  disabled={step === "saving"}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-medium text-zinc-500 hover:text-zinc-300 transition disabled:opacity-50"
                >
                  <RotateCcw size={12} />
                  Recharger
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === "editing" || step === "saving") && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--color-border)]">
            <button
              onClick={onClose}
              disabled={step === "saving"}
              className="px-4 py-2 text-[13px] font-medium text-zinc-400 hover:text-zinc-200 transition disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={step === "saving"}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition disabled:opacity-50"
            >
              {step === "saving" ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Check size={13} />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
