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
  formData.forEach((value, key) => {
    if (key === "listedOn") {
      if (!raw.listedOn) raw.listedOn = [];
      raw.listedOn.push(value);
    } else {
      raw[key] = value;
    }
  });
  if (!raw.listedOn) raw.listedOn = [];

  const parsed = productSchema.partial().safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  try {
    const updateData: Record<string, any> = { ...parsed.data };
    // Include status if provided
    const status = formData.get("status") as string;
    if (status) updateData.status = status;

    await updateProduct(id, updateData);
  } catch (err) {
    console.error("updateProductAction error:", err);
    return { error: "Erreur lors de la mise à jour." };
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
