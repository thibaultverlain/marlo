import { NextRequest, NextResponse } from "next/server";
import { getShopSettings } from "@/lib/db/queries/settings";
import { getInvoiceWithSale } from "@/lib/db/queries/invoices";
import { getProductById } from "@/lib/db/queries/products";
import { getMissionItems } from "@/lib/db/queries/personal-shopping";
import { generateInvoicePDF, type InvoiceLine } from "@/lib/invoice/pdf-generator";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const settings = await getShopSettings();
    if (!settings) {
      return NextResponse.json({ error: "Paramètres de facturation manquants" }, { status: 400 });
    }

    const data = await getInvoiceWithSale(id);
    if (!data || !data.invoice) {
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
    }
    if (!data.customer) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    }

    const vatRate = Number(settings.vatRate ?? 0);
    const lines: InvoiceLine[] = [];

    // ── Vente ──
    if (data.invoice.type === "vente" && data.sale?.productId) {
      const product = await getProductById(data.sale.productId);
      if (product) {
        const salePrice = Number(data.sale.salePrice);
        const unitHT = settings.vatSubject ? salePrice / (1 + vatRate) : salePrice;
        const metadata = [product.brand, product.model, product.size && `Taille ${product.size}`, product.color]
          .filter(Boolean)
          .join(" · ");
        lines.push({
          description: product.title,
          metadata: metadata || undefined,
          quantity: 1,
          unitPriceHT: unitHT,
          totalHT: unitHT,
        });
      }
    }

    // ── Sourcing ──
    if (data.invoice.type === "sourcing" && data.sourcing) {
      const commissionAmount = Number(data.sourcing.commissionAmount ?? 0);
      const unitHT = settings.vatSubject ? commissionAmount / (1 + vatRate) : commissionAmount;
      const ratePct = Number(data.sourcing.commissionRate ?? 0) * 100;

      lines.push({
        description: `Commission de sourcing : ${data.sourcing.description}`,
        metadata: [
          data.sourcing.brand,
          data.sourcing.model,
          ratePct > 0 ? `Taux : ${ratePct.toFixed(0)}%` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        quantity: 1,
        unitPriceHT: unitHT,
        totalHT: unitHT,
      });
    }

    // ── Personal Shopping ──
    if (data.invoice.type === "personal_shopping" && data.psMission) {
      const items = await getMissionItems(data.psMission.id);
      const customerItems = items.filter((i) => i.customerId === data.customer!.id);

      for (const item of customerItems) {
        const comm = item.commissionAmount ?? 0;
        if (comm <= 0) continue;
        const unitHT = settings.vatSubject ? comm / (1 + vatRate) : comm;
        lines.push({
          description: `Commission personal shopping : ${item.description}`,
          metadata: [item.brand, data.psMission.name].filter(Boolean).join(" · "),
          quantity: 1,
          unitPriceHT: unitHT,
          totalHT: unitHT,
        });
      }
    }

    // Fallback
    if (lines.length === 0) {
      const amountTTC = Number(data.invoice.amountTtc);
      const unitHT = settings.vatSubject ? amountTTC / (1 + vatRate) : amountTTC;
      const typeLabels: Record<string, string> = {
        vente: "Vente",
        sourcing: "Commission de sourcing",
        personal_shopping: "Commission personal shopping",
      };
      lines.push({
        description: typeLabels[data.invoice.type] ?? "Prestation",
        quantity: 1,
        unitPriceHT: unitHT,
        totalHT: unitHT,
      });
    }

    const pdfBlob = await generateInvoicePDF({
      settings,
      customer: data.customer,
      invoice: {
        invoiceNumber: data.invoice.invoiceNumber,
        createdAt: data.invoice.createdAt,
        type: data.invoice.type,
      },
      lines,
      amountHT: Number(data.invoice.amountHt),
      vatRate: Number(data.invoice.vatRate ?? 0),
      vatAmount: Number(data.invoice.vatAmount ?? 0),
      amountTTC: Number(data.invoice.amountTtc),
    });

    const buffer = Buffer.from(await pdfBlob.arrayBuffer());
    const download = req.nextUrl.searchParams.get("download") === "1";
    const filename = `${data.invoice.invoiceNumber}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur de génération PDF" },
      { status: 500 }
    );
  }
}
