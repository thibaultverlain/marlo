"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { getNextSku } from "@/lib/db/queries/products";

export type ImportRow = {
  title: string;
  brand: string;
  model?: string;
  category?: string;
  size?: string;
  color?: string;
  condition?: string;
  purchasePrice: string;
  targetPrice?: string;
  purchaseSource?: string;
  purchaseDate?: string;
  notes?: string;
};

const VALID_CATEGORIES = ["sacs", "chaussures", "vetements", "accessoires", "montres", "bijoux", "autre"];
const VALID_CONDITIONS = ["neuf_avec_etiquettes", "neuf_sans_etiquettes", "comme_neuf", "tres_bon", "bon", "correct"];

export async function bulkImportProducts(rows: ImportRow[]): Promise<
  | { error: string; success?: undefined }
  | { success: true; imported: number; skipped: number; error?: undefined }
> {
  if (rows.length === 0) return { error: "Aucune donnée à importer" };

  try {
    const firstSku = await getNextSku();
    const firstSkuNum = parseInt(firstSku.split("-")[1], 10);

    const valuesToInsert = rows
      .map((row, index) => {
        if (!row.title || !row.brand || !row.purchasePrice) return null;

        const sku = `MAR-${String(firstSkuNum + index).padStart(4, "0")}`;
        const category = row.category && VALID_CATEGORIES.includes(row.category) ? row.category : "autre";
        const condition = row.condition && VALID_CONDITIONS.includes(row.condition) ? row.condition : "bon";

        return {
          sku,
          title: row.title,
          brand: row.brand,
          model: row.model ?? null,
          category: category as typeof VALID_CATEGORIES[number],
          size: row.size ?? null,
          color: row.color ?? null,
          condition: condition as typeof VALID_CONDITIONS[number],
          purchasePrice: row.purchasePrice,
          targetPrice: row.targetPrice ?? null,
          purchaseSource: row.purchaseSource ?? null,
          purchaseDate: row.purchaseDate ?? null,
          notes: row.notes ?? null,
          status: "en_stock" as const,
        };
      })
      .filter(Boolean) as typeof products.$inferInsert[];

    if (valuesToInsert.length === 0) {
      return { error: "Aucune ligne valide. Chaque ligne doit avoir : titre, marque, prix d'achat." };
    }

    await db.insert(products).values(valuesToInsert);

    revalidatePath("/products");
    revalidatePath("/dashboard");
    return { success: true, imported: valuesToInsert.length, skipped: rows.length - valuesToInsert.length };
  } catch (err) {
    console.error("bulkImportProducts error:", err);
    return { error: "Erreur lors de l'import. Vérifie le format de ton fichier." };
  }
}
