import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/require-role";
import { db } from "@/lib/db/client";
import { sales, products, customers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const CHANNEL_LABELS: Record<string, string> = {
  vinted: "Vinted", vestiaire: "Vestiaire", stockx: "StockX", prive: "Prive", autre: "Autre",
};

const PAYMENT_LABELS: Record<string, string> = {
  en_attente: "En attente", recu: "Recu", rembourse: "Rembourse",
};

const SHIPPING_LABELS: Record<string, string> = {
  a_expedier: "A expedier", expedie: "Expedie", livre: "Livre", retourne: "Retourne",
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

    const rows = await db
      .select({
        id: sales.id,
        soldAt: sales.soldAt,
        channel: sales.channel,
        salePrice: sales.salePrice,
        platformFees: sales.platformFees,
        netRevenue: sales.netRevenue,
        margin: sales.margin,
        marginPct: sales.marginPct,
        paymentStatus: sales.paymentStatus,
        shippingStatus: sales.shippingStatus,
        trackingNumber: sales.trackingNumber,
        notes: sales.notes,
        productTitle: products.title,
        productBrand: products.brand,
        productSku: products.sku,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
      })
      .from(sales)
      .leftJoin(products, eq(sales.productId, products.id))
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(eq(sales.shopId, shopId))
      .orderBy(desc(sales.soldAt));

    const headers = [
      "Date", "SKU", "Article", "Marque", "Client", "Canal",
      "Prix de vente", "Frais plateforme", "Revenu net", "Marge", "Marge %",
      "Paiement", "Expedition", "Tracking", "Notes",
    ];

    const dataRows = rows.map((s) => [
      new Date(s.soldAt!).toLocaleDateString("fr-FR"),
      s.productSku || "",
      s.productTitle || "",
      s.productBrand || "",
      s.customerFirstName ? `${s.customerFirstName} ${s.customerLastName}` : "",
      CHANNEL_LABELS[s.channel] || s.channel,
      s.salePrice,
      s.platformFees || "0",
      s.netRevenue,
      s.margin,
      s.marginPct ? `${Number(s.marginPct).toFixed(1)}%` : "",
      PAYMENT_LABELS[s.paymentStatus || ""] || "",
      s.shippingStatus ? SHIPPING_LABELS[s.shippingStatus] || s.shippingStatus : "",
      s.trackingNumber || "",
      s.notes || "",
    ]);

    const csvBom = "\uFEFF";
    const csv = csvBom +
      headers.map(escapeCsv).join(",") + "\n" +
      dataRows.map((row) => row.map(escapeCsv).join(",")).join("\n");

    const filename = `ventes-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("Sales export error:", err);
    return NextResponse.json({ error: err.message || "Erreur" }, { status: 500 });
  }
}
