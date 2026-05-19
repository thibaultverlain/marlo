import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/require-role";
import { getAllInvoices } from "@/lib/db/queries/invoices";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyee",
  payee: "Payee",
  annulee: "Annulee",
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
    const invoices = await getAllInvoices(shopId);

    const headers = [
      "Numero", "Date d'emission", "Client", "Email client", "Type",
      "Montant HT", "TVA", "Montant TTC", "Statut", "Date de paiement", "Mention TVA",
    ];

    const rows = invoices.map((inv) => [
      inv.invoiceNumber,
      new Date(inv.createdAt).toLocaleDateString("fr-FR"),
      inv.customerName || "",
      inv.customerEmail || "",
      inv.type,
      inv.amountHt || "0",
      inv.vatAmount || "0",
      inv.amountTtc,
      STATUS_LABELS[inv.status || "brouillon"] || "",
      inv.paidAt ? new Date(inv.paidAt).toLocaleDateString("fr-FR") : "",
      inv.vatMention || "",
    ]);

    const csvBom = "\uFEFF";
    const csv = csvBom +
      headers.map(escapeCsv).join(",") + "\n" +
      rows.map((row) => row.map(escapeCsv).join(",")).join("\n");

    const filename = `factures-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("Invoices export error:", err);
    return NextResponse.json({ error: err.message || "Erreur" }, { status: 500 });
  }
}
