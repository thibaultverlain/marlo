import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/require-role";
import { getAllCustomers } from "@/lib/db/queries/customers";

export const dynamic = "force-dynamic";

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
    const customers = await getAllCustomers(shopId);

    const headers = [
      "Prenom", "Nom", "Email", "Telephone", "Instagram", "Adresse", "Ville",
      "VIP", "Marques favorites", "Tailles", "Budget",
      "Total depense", "Nb commandes", "Date d'ajout", "Notes",
    ];

    const rows = customers.map((c) => [
      c.firstName,
      c.lastName,
      c.email || "",
      c.phone || "",
      c.instagram || "",
      c.address || "",
      c.city || "",
      c.vip ? "Oui" : "Non",
      (c.preferredBrands || []).join(", "),
      c.preferredSizes || "",
      c.budgetRange || "",
      c.totalSpent || "0",
      c.totalOrders || 0,
      new Date(c.createdAt).toLocaleDateString("fr-FR"),
      c.notes || "",
    ]);

    const csvBom = "\uFEFF";
    const csv = csvBom +
      headers.map(escapeCsv).join(",") + "\n" +
      rows.map((row) => row.map(escapeCsv).join(",")).join("\n");

    const filename = `clients-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("Customers export error:", err);
    return NextResponse.json({ error: err.message || "Erreur" }, { status: 500 });
  }
}
