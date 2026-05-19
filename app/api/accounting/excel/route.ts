import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/require-role";
import { getRecipeBook, getPurchasesRegister } from "@/lib/db/queries/accounting";
import { CHANNELS } from "@/lib/data";

export const dynamic = "force-dynamic";

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest) {
  try {
    const { shopId } = await getAuthContext();
    const sp = request.nextUrl.searchParams;
    const year = parseInt(sp.get("year") ?? String(new Date().getFullYear()), 10);
    const tab = sp.get("tab") ?? "recipes";

    let csv: string;
    let filename: string;

    if (tab === "purchases") {
      const purchases = await getPurchasesRegister(shopId, year);
      const headers = ["Date", "SKU", "Description", "Fournisseur", "Categorie", "Paiement", "Montant (€)"];
      const rows = purchases.map((p) => [
        p.date ? new Date(p.date).toLocaleDateString("fr-FR") : "",
        p.productSku ?? "",
        p.description,
        p.supplier ?? "",
        p.category ?? "",
        p.paymentMethod ?? "",
        p.amount.toFixed(2).replace(".", ","),
      ]);
      csv = "\uFEFF" + headers.map(escapeCsv).join(",") + "\n" + rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
      filename = `registre-achats-${year}.csv`;
    } else {
      const recipes = await getRecipeBook(shopId, year);
      const headers = ["Date", "N Facture", "Client", "Article", "Canal", "Paiement", "Montant (€)"];
      const rows = recipes.map((r) => [
        new Date(r.date).toLocaleDateString("fr-FR"),
        r.invoiceNumber ?? "",
        r.customerName ?? "",
        r.productTitle ?? "",
        CHANNELS.find((c) => c.value === r.channel)?.label ?? r.channel,
        r.paymentMethod ?? "",
        r.amount.toFixed(2).replace(".", ","),
      ]);
      csv = "\uFEFF" + headers.map(escapeCsv).join(",") + "\n" + rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
      filename = `livre-recettes-${year}.csv`;
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("Accounting export error:", err);
    return NextResponse.json({ error: err.message || "Erreur" }, { status: 500 });
  }
}
