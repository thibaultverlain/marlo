"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createProduct, updateProduct, deleteProduct } from "@/lib/db/queries/products";
import { convertToEur } from "@/lib/currency";
import { getAuthContext } from "@/lib/auth/require-role";

function cleanPrice(s: string | null | undefined): string {
  if (!s || s.trim() === "") return "0";
  return s.replace(/[€\s]/g, "").replace(",", ".").trim() || "0";
}

function isValidPrice(s: string): boolean {
  const cleaned = cleanPrice(s);
  return !isNaN(parseFloat(cleaned)) && isFinite(Number(cleaned));
}

const productSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  brand: z.string().min(1, "La marque est requise"),
  model: z.string().optional().nullable(),
  category: z.enum(["sacs", "chaussures", "vetements", "accessoires", "montres", "bijoux", "autre"]),
  size: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  condition: z.enum(["neuf_avec_etiquettes", "neuf_sans_etiquettes", "comme_neuf", "tres_bon", "bon", "correct"]),
  purchasePrice: z.string().refine(isValidPrice, "Prix invalide").transform(cleanPrice),
  targetPrice: z.string().transform(cleanPrice).optional().nullable(),
  purchaseSource: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  listedOn: z.array(z.string()).optional(),
  status: z.string().optional(),
  serialNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // Premium fields (tous optionnels)
  subcategory: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  countryOfOrigin: z.string().optional().nullable(),
  retailPrice: z.string().optional().nullable(),
  hasInvoice: z.string().optional(), // "true" | "false"
  measurements: z.string().optional(), // JSON string
  signatureDetails: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
});

export async function createProductAction(formData: FormData) {
  const raw = {
    title: formData.get("title") as string,
    brand: formData.get("brand") as string,
    model: formData.get("model") as string | null,
    category: formData.get("category") as string,
    size: formData.get("size") as string | null,
    color: formData.get("color") as string | null,
    condition: formData.get("condition") as string,
    purchasePrice: formData.get("purchasePrice") as string,
    targetPrice: formData.get("targetPrice") as string | null,
    purchaseSource: formData.get("purchaseSource") as string | null,
    purchaseDate: formData.get("purchaseDate") as string | null,
    listedOn: formData.getAll("listedOn") as string[],
    status: (formData.get("status") as string) || "en_stock",
    serialNumber: formData.get("serialNumber") as string | null,
    notes: formData.get("notes") as string | null,
    // Premium fields
    subcategory: formData.get("subcategory") as string | null,
    material: formData.get("material") as string | null,
    countryOfOrigin: formData.get("countryOfOrigin") as string | null,
    retailPrice: formData.get("retailPrice") as string | null,
    hasInvoice: formData.get("hasInvoice") as string | undefined,
    measurements: formData.get("measurements") as string | undefined,
    signatureDetails: formData.getAll("signatureDetails") as string[],
    keywords: formData.getAll("keywords") as string[],
  };

  const purchaseCurrency = (formData.get("purchaseCurrency") as string) || "EUR";

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  try {
    const ctx = await getAuthContext();
    const priceNum = parseFloat(parsed.data.purchasePrice) || 0;
    const priceEur = purchaseCurrency !== "EUR" ? String(convertToEur(priceNum, purchaseCurrency)) : parsed.data.purchasePrice;

    // Parse premium fields
    let measurementsObj: Record<string, number | string> | null = null;
    if (parsed.data.measurements) {
      try {
        const parsedM = JSON.parse(parsed.data.measurements);
        if (parsedM && typeof parsedM === "object") {
          // Convertir les strings en number si possible
          const cleaned: Record<string, number | string> = {};
          for (const [k, v] of Object.entries(parsedM)) {
            const n = Number(v);
            cleaned[k] = !isNaN(n) ? n : String(v);
          }
          measurementsObj = cleaned;
        }
      } catch {}
    }

    await createProduct({
      userId: ctx.userId,
      shopId: ctx.shopId,
      title: parsed.data.title,
      brand: parsed.data.brand,
      model: parsed.data.model ?? null,
      category: parsed.data.category,
      size: parsed.data.size ?? null,
      color: parsed.data.color ?? null,
      condition: parsed.data.condition,
      purchasePrice: parsed.data.purchasePrice,
      purchaseCurrency,
      purchasePriceEur: priceEur,
      targetPrice: parsed.data.targetPrice ?? null,
      purchaseSource: parsed.data.purchaseSource ?? null,
      purchaseDate: parsed.data.purchaseDate ?? null,
      listedOn: parsed.data.listedOn ?? [],
      serialNumber: parsed.data.serialNumber ?? null,
      notes: parsed.data.notes ?? null,
      status: (parsed.data.status as any) ?? "en_stock",
      // Premium fields
      subcategory: parsed.data.subcategory || null,
      material: parsed.data.material || null,
      countryOfOrigin: parsed.data.countryOfOrigin || null,
      retailPrice: parsed.data.retailPrice ? cleanPrice(parsed.data.retailPrice) : null,
      hasInvoice: parsed.data.hasInvoice === "true",
      measurements: measurementsObj,
      signatureDetails: parsed.data.signatureDetails && parsed.data.signatureDetails.length > 0
        ? parsed.data.signatureDetails
        : null,
      keywords: parsed.data.keywords && parsed.data.keywords.length > 0
        ? parsed.data.keywords
        : null,
    });
  } catch (err) {
    console.error("createProductAction error:", err);
    return { error: "Erreur lors de la création. Vérifiez votre connexion à la base de données." };
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");
  redirect("/products");
}

export async function updateProductAction(id: string, formData: FormData) {
  const raw: Record<string, any> = {};
  // Multi-value fields (arrays)
  const arrayKeys = new Set(["listedOn", "signatureDetails", "keywords"]);
  formData.forEach((value, key) => {
    if (arrayKeys.has(key)) {
      if (!raw[key]) raw[key] = [];
      raw[key].push(value);
    } else {
      raw[key] = value;
    }
  });
  if (!raw.listedOn) raw.listedOn = [];

  const parsed = productSchema.partial().safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  }

  try {
    const ctx = await getAuthContext();
    const updateData: Record<string, any> = { ...parsed.data };
    const status = formData.get("status") as string;
    if (status) updateData.status = status;

    // Premium : transformations
    if (parsed.data.measurements !== undefined) {
      try {
        const m = JSON.parse(parsed.data.measurements as string);
        if (m && typeof m === "object") {
          const cleaned: Record<string, number | string> = {};
          for (const [k, v] of Object.entries(m)) {
            const n = Number(v);
            cleaned[k] = !isNaN(n) ? n : String(v);
          }
          updateData.measurements = Object.keys(cleaned).length > 0 ? cleaned : null;
        }
      } catch {
        updateData.measurements = null;
      }
    }
    if (parsed.data.hasInvoice !== undefined) {
      updateData.hasInvoice = parsed.data.hasInvoice === "true";
    }
    if (parsed.data.retailPrice !== undefined) {
      updateData.retailPrice = parsed.data.retailPrice ? cleanPrice(parsed.data.retailPrice) : null;
    }
    // Sanitize empty arrays/strings to null
    if (parsed.data.signatureDetails !== undefined) {
      updateData.signatureDetails = parsed.data.signatureDetails.length > 0 ? parsed.data.signatureDetails : null;
    }
    if (parsed.data.keywords !== undefined) {
      updateData.keywords = parsed.data.keywords.length > 0 ? parsed.data.keywords : null;
    }
    for (const k of ["subcategory", "material", "countryOfOrigin"] as const) {
      if (updateData[k] === "") updateData[k] = null;
    }

    // Record price history if target_price changed
    if (parsed.data.targetPrice !== undefined) {
      const { getProductById } = await import("@/lib/db/queries/products");
      const existing = await getProductById(id);
      if (existing && existing.targetPrice !== parsed.data.targetPrice) {
        const { recordPriceChange } = await import("@/lib/db/queries/price-history");
        await recordPriceChange(
          id, ctx.shopId, ctx.userId,
          existing.targetPrice,
          parsed.data.targetPrice ?? "0",
          "target_price"
        );
      }
    }

    await updateProduct(id, updateData);
  } catch (err) {
    console.error("updateProductAction error:", err);
    return { error: "Erreur lors de la mise a jour." };
  }

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteProductAction(id: string) {
  try {
    const ctx = await getAuthContext();
    await deleteProduct(id, ctx.shopId);
  } catch (err) {
    console.error("deleteProductAction error:", err);
    return { error: "Erreur lors de la suppression." };
  }

  revalidatePath("/products");
  revalidatePath("/dashboard");
  redirect("/products");
}

export async function bulkDeleteProductsAction(ids: string[]) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: "Aucun article selectionne" };
  }
  try {
    const ctx = await getAuthContext();
    await Promise.all(ids.map((id) => deleteProduct(id, ctx.shopId)));
    revalidatePath("/products");
    revalidatePath("/dashboard");
    return { success: true, count: ids.length };
  } catch (err) {
    console.error("bulkDeleteProductsAction error:", err);
    return { error: "Erreur lors de la suppression." };
  }
}

/**
 * Applique une baisse de prix suggeree (vue Dormants) sur un produit.
 * Cree un entry dans price_history pour tracer la decision.
 */
export async function applyDormantPriceSuggestionAction(
  productId: string,
  newPrice: number,
): Promise<{ success?: boolean; error?: string }> {
  if (!Number.isFinite(newPrice) || newPrice <= 0) {
    return { error: "Prix suggere invalide" };
  }
  try {
    const ctx = await getAuthContext();
    const { getProductById } = await import("@/lib/db/queries/products");
    const existing = await getProductById(productId);
    if (!existing || existing.shopId !== ctx.shopId) {
      return { error: "Produit introuvable" };
    }
    if (Number(existing.purchasePrice) > newPrice) {
      return { error: "Le prix suggere est inferieur au prix d'achat. Baisse refusee." };
    }

    const newPriceStr = String(newPrice);
    if (existing.targetPrice !== newPriceStr) {
      const { recordPriceChange } = await import("@/lib/db/queries/price-history");
      await recordPriceChange(
        productId, ctx.shopId, ctx.userId,
        existing.targetPrice,
        newPriceStr,
        "target_price",
        "Suggestion dormant appliquee",
      );
    }

    await updateProduct(productId, { targetPrice: newPriceStr });
    revalidatePath("/products");
    revalidatePath("/products/dormants");
    revalidatePath(`/products/${productId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("applyDormantPriceSuggestionAction error:", err);
    return { error: "Erreur lors de l'application." };
  }
}

export async function bulkUpdateStatusAction(ids: string[], status: string) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: "Aucun article selectionne" };
  }
  const validStatus = ["en_stock", "en_vente", "reserve"];
  if (!validStatus.includes(status)) {
    return { error: "Statut invalide" };
  }
  try {
    const ctx = await getAuthContext();
    await Promise.all(ids.map((id) => updateProduct(id, { status: status as any })));
    revalidatePath("/products");
    return { success: true, count: ids.length };
  } catch (err) {
    console.error("bulkUpdateStatusAction error:", err);
    return { error: "Erreur lors de la mise a jour." };
  }
}
