"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Wand2, ImageIcon, Loader2, Check, AlertCircle, RotateCcw } from "lucide-react";

/**
 * Marlo Studio — packshot luxe style Vestiaire / 1stDibs.
 *
 * Le style de reference :
 *   - Fond gris tres clair uniforme (#f4f4f4) avec subtile vignette
 *   - Ombre "puddle" courte sous l'objet (compressee verticalement)
 *   - Centrage propre + padding constant
 *   - Pas de gradient marque
 */

const BACKGROUNDS = [
  { id: "vestiaire", label: "Vestiaire", description: "Style packshot luxe" },
  { id: "studio_white", label: "Blanc studio", description: "Fond blanc pur uniforme" },
  { id: "beige_lux", label: "Beige luxe", description: "Ton chaleureux haut de gamme" },
  { id: "graphite", label: "Graphite", description: "Fond sombre cinematique" },
];

const CANVAS_SIZE = 1080;

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
  const [cutoutBlob, setCutoutBlob] = useState<Blob | null>(null);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);

  const [bg, setBg] = useState("vestiaire");
  const [shadow, setShadow] = useState(75);
  const [brightness, setBrightness] = useState(100);
  const [scale, setScale] = useState(70); // % de la zone de canvas occupee (rendu Vestiaire plus aere)

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cutoutImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("idle");
      setError(null);
      setCutoutBlob(null);
      if (cutoutUrl) URL.revokeObjectURL(cutoutUrl);
      setCutoutUrl(null);
      cutoutImageRef.current = null;
      setBg("vestiaire");
      setShadow(75);
      setBrightness(100);
      setScale(70);
    }
  }, [open]);

  async function handleFile(file: File) {
    setStep("processing");
    setError(null);

    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(file, {
        model: "isnet",
        output: { format: "image/png", quality: 1 },
      });

      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        cutoutImageRef.current = img;
        setCutoutBlob(blob);
        setCutoutUrl(url);
        setStep("editing");
      };
      img.onerror = () => {
        setError("Erreur de chargement de l'image traitee");
        setStep("idle");
      };
      img.src = url;
    } catch (err: any) {
      console.error("Background removal error:", err);
      setError("Impossible de traiter cette image. Essaie une autre photo.");
      setStep("idle");
    }
  }

  /**
   * Calcule le bounding box de l'objet detoure (alpha > 20).
   * Permet de recadrer precisement avant placement.
   */
  function getObjectBounds(img: HTMLImageElement): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } | null {
    const off = document.createElement("canvas");
    off.width = img.width;
    off.height = img.height;
    const offCtx = off.getContext("2d");
    if (!offCtx) return null;
    offCtx.drawImage(img, 0, 0);
    const data = offCtx.getImageData(0, 0, img.width, img.height).data;

    let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
    let found = false;
    // Sample par pas de 2 pour aller plus vite
    for (let y = 0; y < img.height; y += 2) {
      for (let x = 0; x < img.width; x += 2) {
        if (data[(y * img.width + x) * 4 + 3] > 20) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }
    if (!found) return null;
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }

  const drawCanvas = useCallback(() => {
    const img = cutoutImageRef.current;
    if (!img || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    // 1. Fond + vignette
    drawBackground(ctx, bg);

    // 2. Bounding box de l'OBJET DETOURE (pas du PNG entier qui peut avoir
    //    beaucoup de transparence autour). Tout le scaling et centrage se
    //    fait par rapport a ce bounding box.
    const bounds = getObjectBounds(img);
    if (!bounds) {
      // Pas d'objet detecte — fallback : dessiner le PNG centre brut
      ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      return;
    }

    // 3. Calcul du fit base UNIQUEMENT sur la taille de l'objet
    const scaleFactor = scale / 100;
    const maxObjWidth = CANVAS_SIZE * scaleFactor;
    const maxObjHeight = CANVAS_SIZE * scaleFactor * 0.85; // marge pour l'ombre en bas
    const fit = Math.min(maxObjWidth / bounds.width, maxObjHeight / bounds.height);

    // 4. Taille finale du PNG complet apres scaling
    const drawW = img.width * fit;
    const drawH = img.height * fit;

    // 5. Position : on veut le CENTRE de l'objet exactement au centre horizontal,
    //    et la BASE de l'objet a 88% de la hauteur du canvas.
    //    Le centre de l'objet dans le PNG (en pixels PNG) : bounds.minX + bounds.width/2
    //    Apres scaling : (bounds.minX + bounds.width/2) * fit, depuis le coin du PNG dessine.
    //    Donc x_drawImage = CANVAS_SIZE/2 - (bounds.minX + bounds.width/2) * fit
    const objCenterXInPng = bounds.minX + bounds.width / 2;
    const x = CANVAS_SIZE / 2 - objCenterXInPng * fit;

    // Base de l'objet apres scaling = bounds.maxY * fit (depuis le coin du PNG dessine)
    // On veut cette base a baselineY → y_drawImage = baselineY - bounds.maxY * fit
    // Baseline a 82% donne plus d'espace en bas pour l'ombre + plus de respiration
    const baselineY = CANVAS_SIZE * 0.82;
    const y = baselineY - bounds.maxY * fit;

    // 6. Ombre puddle (compressee verticalement, sous l'objet)
    if (shadow > 0) {
      drawPuddleShadow(ctx, img, x, y, drawW, drawH, bounds, fit, shadow);
    }

    // 7. Objet
    ctx.save();
    if (brightness !== 100) {
      ctx.filter = `brightness(${brightness}%)`;
    }
    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.restore();

    // 8. Vignette tres subtile par-dessus (sauf graphite qui en a deja une)
    if (bg !== "graphite") {
      drawSubtleVignette(ctx, bg);
    }
  }, [bg, shadow, brightness, scale]);

  /**
   * Ombre "puddle" : silhouette de l'objet, comprimee verticalement (scaleY ~0.18),
   * blur eleve, position juste sous la base de l'objet.
   * Donne l'effet "Vestiaire" : ombre courte et large.
   */
  function drawPuddleShadow(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    objX: number, objY: number, objW: number, objH: number,
    bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number },
    fit: number,
    intensity: number,
  ) {
    const factor = intensity / 100;

    // Silhouette de l'objet (noir, alpha = 1 partout ou l'objet est present)
    const off = document.createElement("canvas");
    off.width = CANVAS_SIZE;
    off.height = CANVAS_SIZE;
    const offCtx = off.getContext("2d");
    if (!offCtx) return;
    offCtx.drawImage(img, objX, objY, objW, objH);
    offCtx.globalCompositeOperation = "source-in";
    offCtx.fillStyle = "rgba(20, 22, 25, 1)";
    offCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Position de la base de l'objet en coordonnees canvas
    const objBaseY = objY + bounds.maxY * fit;
    const shadowCenterX = objX + (bounds.minX + bounds.width / 2) * fit;

    // Premiere couche : ombre principale, compressee et plus etalee horizontalement
    ctx.save();
    ctx.globalAlpha = 0.28 * factor;
    ctx.filter = `blur(${Math.round(28 * factor + 12)}px)`;

    // Compression verticale + etalement horizontal pour effet "puddle" Vestiaire
    const sy = 0.15;
    const sx = 1.1; // legere extension horizontale
    ctx.translate(shadowCenterX, objBaseY);
    ctx.scale(sx, sy);
    ctx.translate(-shadowCenterX, -objBaseY);
    ctx.drawImage(off, 0, 0);
    ctx.restore();

    // Deuxieme couche : halo plus large et plus flou (ambiant occlusion)
    ctx.save();
    ctx.globalAlpha = 0.14 * factor;
    ctx.filter = `blur(${Math.round(60 * factor + 30)}px)`;
    const sy2 = 0.1;
    const sx2 = 1.35; // halo bien plus large que l'objet
    ctx.translate(shadowCenterX, objBaseY + 10);
    ctx.scale(sx2, sy2);
    ctx.translate(-shadowCenterX, -(objBaseY + 10));
    ctx.drawImage(off, 0, 0);
    ctx.restore();
  }

  /**
   * Vignette ultra subtile : assombrit legerement les coins/bas pour donner
   * de la profondeur sans alterer le fond uniforme. ~5-8% d'opacite max.
   */
  function drawSubtleVignette(ctx: CanvasRenderingContext2D, preset: string) {
    const grad = ctx.createRadialGradient(
      CANVAS_SIZE / 2, CANVAS_SIZE * 0.45, CANVAS_SIZE * 0.3,
      CANVAS_SIZE / 2, CANVAS_SIZE * 0.55, CANVAS_SIZE * 0.75,
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.6, "rgba(0,0,0,0)");
    // Intensite differente selon le fond
    const intensity = preset === "vestiaire" ? 0.05 : preset === "beige_lux" ? 0.07 : 0.04;
    grad.addColorStop(1, `rgba(0,0,0,${intensity})`);
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.restore();
  }

  /**
   * Fond uniforme ou tres legerement gradient selon preset.
   * Style packshot luxe : fond presque flat, pas de gradient agressif.
   */
  function drawBackground(ctx: CanvasRenderingContext2D, preset: string) {
    if (preset === "graphite") {
      // Fond sombre cinematique avec gradient subtil
      const grad = ctx.createRadialGradient(
        CANVAS_SIZE * 0.5, CANVAS_SIZE * 0.4, 0,
        CANVAS_SIZE * 0.5, CANVAS_SIZE * 0.5, CANVAS_SIZE * 0.8,
      );
      grad.addColorStop(0, "#3a3a3d");
      grad.addColorStop(0.5, "#2a2a2c");
      grad.addColorStop(1, "#1a1a1c");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      return;
    }

    let baseColor: string;
    if (preset === "vestiaire") baseColor = "#f4f4f4"; // gris tres clair Vestiaire
    else if (preset === "studio_white") baseColor = "#fafafa"; // presque blanc
    else if (preset === "beige_lux") baseColor = "#efe8da"; // beige chaud subtil
    else baseColor = "#f4f4f4";

    // Remplissage uniforme
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Tres leger gradient bas pour donner de la dimension (pas une teinte differente)
    const grad = ctx.createLinearGradient(0, CANVAS_SIZE * 0.5, 0, CANVAS_SIZE);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.03)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  useEffect(() => {
    if (step === "editing" || step === "saving") drawCanvas();
  }, [step, drawCanvas]);

  async function handleSave() {
    if (!canvasRef.current) return;
    setStep("saving");
    setError(null);

    try {
      const blob: Blob = await new Promise((resolve, reject) => {
        canvasRef.current!.toBlob((b) => b ? resolve(b) : reject(new Error("Canvas vide")), "image/jpeg", 0.95);
      });

      const file = new File([blob], `studio-${Date.now()}.jpg`, { type: "image/jpeg" });

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
    setCutoutBlob(null);
    if (cutoutUrl) URL.revokeObjectURL(cutoutUrl);
    setCutoutUrl(null);
    cutoutImageRef.current = null;
    setStep("idle");
    setError(null);
  }

  if (!open) return null;

  const currentBg = BACKGROUNDS.find((b) => b.id === bg);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <Wand2 size={15} className="text-rose-400" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white">Marlo Studio</h3>
              <p className="text-[11px] text-zinc-500">Packshot luxe en quelques clics</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] text-zinc-500 hover:text-zinc-300">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
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
              <p className="text-[10px] text-zinc-500 mt-3">JPG, PNG · 10MB max · Photo bien eclairee = meilleur detourage</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
            </div>
          )}

          {step === "processing" && (
            <div className="py-16 text-center">
              <Loader2 size={36} className="text-rose-400 animate-spin inline-block" />
              <p className="text-[14px] font-semibold text-white mt-4">Detection precise de l'objet...</p>
              <p className="text-[12px] text-zinc-500 mt-1">Modele haute qualite, 5 a 10 secondes</p>
              <p className="text-[10px] text-zinc-500 mt-3">Premiere utilisation : telechargement du modele (~80MB)</p>
            </div>
          )}

          {(step === "editing" || step === "saving") && cutoutUrl && (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-5">
              <div className="flex items-start justify-center">
                <div className="relative w-full max-w-[420px] aspect-square rounded-xl overflow-hidden border border-[var(--color-border)] shadow-lg">
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

              <div className="space-y-5">
                {/* Backgrounds */}
                <div>
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Fond</p>
                  <div className="space-y-1.5">
                    {BACKGROUNDS.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setBg(b.id)}
                        disabled={step === "saving"}
                        className={`w-full px-3 py-2 rounded-lg text-left transition-all border ${
                          bg === b.id
                            ? "bg-rose-500/8 border-rose-500/40"
                            : "bg-[var(--color-bg-raised)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
                        }`}
                      >
                        <p className={`text-[12px] font-semibold ${bg === b.id ? "text-rose-300" : "text-zinc-300"}`}>{b.label}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">{b.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scale */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Taille</p>
                    <p className="text-[10px] text-zinc-400 tabular-nums">{scale}%</p>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={95}
                    value={scale}
                    disabled={step === "saving"}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full accent-rose-400"
                  />
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
                    min={70}
                    max={130}
                    value={brightness}
                    disabled={step === "saving"}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-rose-400"
                  />
                </div>

                <button
                  onClick={reset}
                  disabled={step === "saving"}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-medium text-zinc-500 hover:text-zinc-300 transition disabled:opacity-50"
                >
                  <RotateCcw size={12} />
                  Recharger une photo
                </button>
              </div>
            </div>
          )}
        </div>

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
