import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/require-role";
import { getAllProducts } from "@/lib/db/queries/products";

export const dynamic = "force-dynamic";

const PRODUCT_STATUS_LABELS: Record<string, string> = {
  en_stock: "En stock",
  en_vente: "En vente",
  reserve: "Reserve",
  vendu: "Vendu",
  expedie: "Expedie",
  livre: "Livre",
  retourne: "Retourne",
};

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  try {
    const { shopId } = await getAuthContext();
    const products = await getAllProducts(shopId);

    const headers = [
      "SKU", "Titre", "Marque", "Categorie", "Taille", "Couleur", "Etat",
      "Prix d'achat", "Prix vise", "Statut", "Date d'ajout", "Notes",
    ];

    const rows = products.map((p) => [
      p.sku,
      p.title,
      p.brand,
      p.category,
      p.size || "",
      p.color || "",
      p.condition,
      p.purchasePrice,
      p.targetPrice || "",
      PRODUCT_STATUS_LABELS[p.status] || p.status,
      new Date(p.createdAt).toLocaleDateString("fr-FR"),
      p.notes || "",
    ]);

    // BOM for Excel UTF-8 detection
    const csvBom = "\uFEFF";
    const csv = csvBom +
      headers.map(escapeCsv).join(",") + "\n" +
      rows.map((row) => row.map(escapeCsv).join(",")).join("\n");

    const filename = `stock-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("Excel export error:", err);
    return NextResponse.json({ error: err.message || "Erreur" }, { status: 500 });
  }
}
