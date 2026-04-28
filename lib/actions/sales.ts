"use server";
import { getCurrentUserId } from "@/lib/auth/get-user";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSale } from "@/lib/db/queries/sales";
import { getProductById } from "@/lib/db/queries/products";
import { calculatePlatformFees, calculateMargin } from "@/lib/data";

// Clean price string: accept comma or dot, strip currency symbols and spaces
function cleanPrice(s: string | null | undefined): string {
  if (!s || s.trim() === "") return "0";
  return s.replace(/[€\s]/g, "").replace(",", ".").trim() || "0";
}

function isValidPrice(s: string): boolean {
  const cleaned = cleanPrice(s);
  return !isNaN(parseFloat(cleaned)) && isFinite(Number(cleaned));
}

const saleSchema = z.object({
  productId: z.string().uuid("Article requis"),
  customerId: z.string().uuid().optional().nullable().or(z.literal("")),
  channel: z.enum(["vinted", "vestiaire", "stockx", "prive", "autre"]),
  salePrice: z.string().refine(isValidPrice, "Prix de vente invalide").transform(cleanPrice),
  platformFees: z.string().transform(cleanPrice).optional(),
  platformFeesAuto: z.string().optional(),
  shippingCost: z.string().transform(cleanPrice).optional(),
  shippingPaidBy: z.enum(["vendeur", "acheteur", "offert"]).default("acheteur"),
  paymentMethod: z.enum(["virement", "especes", "cb", "paypal", "plateforme", "autre"]).optional(),
  trackingNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function createSaleAction(formData: FormData) {
  const raw = {
    productId: formData.get("productId") as string,
    customerId: formData.get("customerId") as string,
    channel: formData.get("channel") as string,
    salePrice: formData.get("salePrice") as string,
    platformFees: formData.get("platformFees") as string,
    platformFeesAuto: formData.get("platformFeesAuto") as string,
    shippingCost: formData.get("shippingCost") as string || "0",
    shippingPaidBy: (formData.get("shippingPaidBy") as string) || "acheteur",
    paymentMethod: formData.get("paymentMethod") as string,
    trackingNumber: formData.get("trackingNumber") as string | null,
    notes: formData.get("notes") as string | null,
  };

  const parsed = saleSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  try {
    const product = await getProductById(parsed.data.productId);
    if (!product) {
      return { error: "Article introuvable" };
    }

    const salePriceNum = parseFloat(parsed.data.salePrice);
    const isAuto = parsed.data.platformFeesAuto === "true";
    const platformFeesNum = isAuto
      ? calculatePlatformFees(parsed.data.channel, salePriceNum)
      : parseFloat(parsed.data.platformFees || "0");
    const shippingCostNum = parseFloat(parsed.data.shippingCost || "0");

    const { netRevenue, margin, marginPct } = calculateMargin(
      Number(product.purchasePrice),
      salePriceNum,
      platformFeesNum,
      shippingCostNum,
      parsed.data.shippingPaidBy === "vendeur"
    );

    const userId = await getCurrentUserId();
    await createSale({
      userId,
      productId: parsed.data.productId,
      customerId: parsed.data.customerId && parsed.data.customerId.length > 0 ? parsed.data.customerId : null,
      channel: parsed.data.channel,
      salePrice: parsed.data.salePrice,
      platformFees: String(platformFeesNum),
      shippingCost: parsed.data.shippingCost || "0",
      shippingPaidBy: parsed.data.shippingPaidBy,
      netRevenue: String(netRevenue),
      margin: String(margin),
      marginPct: String(marginPct),
      paymentMethod: parsed.data.paymentMethod ?? null,
      paymentStatus: "en_attente",
      trackingNumber: parsed.data.trackingNumber ?? null,
      shippingStatus: parsed.data.channel === "prive" ? null : "a_expedier",
      notes: parsed.data.notes ?? null,
    });
  } catch (err) {
    console.error("createSaleAction error:", err);
    return { error: "Erreur lors de l'enregistrement de la vente." };
  }

  revalidatePath("/sales");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  redirect("/sales");
}

export async function deleteSaleAction(saleId: string) {
  const { deleteSale } = await import("@/lib/db/queries/sales");

  try {
    await deleteSale(saleId);
  } catch (err) {
    console.error("deleteSaleAction error:", err);
    return { error: "Erreur lors de la suppression." };
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  redirect("/sales");
}
