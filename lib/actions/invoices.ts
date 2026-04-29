"use server";
import { getAuthContext } from "@/lib/auth/require-role";

import { revalidatePath } from "next/cache";
import { getSaleById } from "@/lib/db/queries/sales";
import { getCustomerById } from "@/lib/db/queries/customers";
import { getProductById } from "@/lib/db/queries/products";
import { getShopSettings, getNextInvoiceNumber } from "@/lib/db/queries/settings";
import { createInvoice, getInvoiceById, updateInvoice } from "@/lib/db/queries/invoices";
import { getSourcingById } from "@/lib/db/queries/sourcing";
import { getMissionById, getMissionItems } from "@/lib/db/queries/personal-shopping";
import { db } from "@/lib/db/client";
import { sales, sourcingRequests, personalShoppingMissions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function computeVAT(settings: { vatSubject: boolean | null; vatRate: string | null }, amountTTC: number) {
  const vatRate = Number(settings.vatRate ?? 0);
  const amountHT = settings.vatSubject ? amountTTC / (1 + vatRate) : amountTTC;
  const vatAmount = settings.vatSubject ? amountTTC - amountHT : 0;
  const vatMention = settings.vatSubject ? null : "TVA non applicable, art. 293 B du CGI";
  return { vatRate, amountHT, vatAmount, amountTTC, vatMention };
}

export async function generateInvoiceFromSaleAction(saleId: string) {
  try {
    const ctx = await getAuthContext();
    const [settings, sale] = await Promise.all([
      getShopSettings(ctx.shopId),
      getSaleById(saleId),
    ]);

    if (!settings) {
      return { error: "Configure d'abord tes informations légales dans Réglages avant d'émettre une facture." };
    }
    if (!sale) return { error: "Vente introuvable" };
    if (!sale.customerId) return { error: "Cette vente n'a pas de client associé. Ajoute un client avant de facturer." };

    const customer = await getCustomerById(sale.customerId);
    if (!customer) return { error: "Client introuvable" };

    const invoiceNumber = await getNextInvoiceNumber(ctx.shopId);
    const { vatRate, amountHT, vatAmount, amountTTC, vatMention } = computeVAT(settings, Number(sale.salePrice));

    const invoice = await createInvoice({ userId: ctx.userId, shopId: ctx.shopId,
      invoiceNumber,
      type: "vente",
      customerId: sale.customerId,
      relatedSaleId: sale.id,
      amountHt: amountHT.toFixed(2),
      vatRate: String(vatRate),
      vatAmount: vatAmount.toFixed(2),
      amountTtc: amountTTC.toFixed(2),
      vatMention,
      status: "brouillon",
    });

    await db.update(sales).set({ invoiceNumber }).where(eq(sales.id, sale.id));

    revalidatePath("/invoices");
    revalidatePath("/sales");
    revalidatePath(`/sales/${saleId}`);
    return { success: true, invoiceId: invoice.id, invoiceNumber };
  } catch (err) {
    console.error("generateInvoiceFromSaleAction:", err);
    return { error: err instanceof Error ? err.message : "Erreur lors de la génération de la facture." };
  }
}

export async function generateInvoiceFromSourcingAction(sourcingId: string) {
  try {
    const ctx = await getAuthContext();
    const [settings, sourcing] = await Promise.all([
      getShopSettings(ctx.shopId),
      getSourcingById(sourcingId),
    ]);

    if (!settings) {
      return { error: "Configure d'abord tes informations légales dans Réglages." };
    }
    if (!sourcing) return { error: "Demande de sourcing introuvable" };
    if (!sourcing.customerId) return { error: "Pas de client associé à cette demande." };

    const commissionAmount = Number(sourcing.commissionAmount ?? 0);
    if (commissionAmount <= 0) {
      return { error: "La commission est à 0. Lie un article et fixe un prix de vente d'abord." };
    }

    const customer = await getCustomerById(sourcing.customerId);
    if (!customer) return { error: "Client introuvable" };

    const invoiceNumber = await getNextInvoiceNumber(ctx.shopId);
    const { vatRate, amountHT, vatAmount, amountTTC, vatMention } = computeVAT(settings, commissionAmount);

    const invoice = await createInvoice({ userId: ctx.userId, shopId: ctx.shopId,
      invoiceNumber,
      type: "sourcing",
      customerId: sourcing.customerId,
      relatedSourcingId: sourcing.id,
      amountHt: amountHT.toFixed(2),
      vatRate: String(vatRate),
      vatAmount: vatAmount.toFixed(2),
      amountTtc: amountTTC.toFixed(2),
      vatMention,
      status: "brouillon",
    });

    // Update sourcing status to "facture"
    await db
      .update(sourcingRequests)
      .set({ status: "facture", updatedAt: new Date() })
      .where(eq(sourcingRequests.id, sourcing.id));

    revalidatePath("/invoices");
    revalidatePath("/sourcing");
    revalidatePath(`/sourcing/${sourcingId}`);
    return { success: true, invoiceId: invoice.id, invoiceNumber };
  } catch (err) {
    console.error("generateInvoiceFromSourcingAction:", err);
    return { error: err instanceof Error ? err.message : "Erreur lors de la génération." };
  }
}

export async function generateInvoiceFromMissionAction(missionId: string) {
  try {
    const ctx = await getAuthContext();
    const [settings, mission, items] = await Promise.all([
      getShopSettings(ctx.shopId),
      getMissionById(missionId),
      getMissionItems(missionId),
    ]);

    if (!settings) {
      return { error: "Configure d'abord tes informations légales dans Réglages." };
    }
    if (!mission) return { error: "Mission introuvable" };

    const totalCommission = Number(mission.totalCommission ?? 0);
    if (totalCommission <= 0) {
      return { error: "Aucune commission à facturer sur cette mission." };
    }

    // For PS missions, we invoice each customer separately for their items' commissions
    // But simplest approach: one invoice for total commission, linked to first customer
    const customerIds = [...new Set(items.map((i) => i.customerId))];
    if (customerIds.length === 0) {
      return { error: "Aucun article dans cette mission." };
    }

    // Generate one invoice per customer
    const invoiceIds: string[] = [];
    for (const custId of customerIds) {
      const customer = await getCustomerById(custId);
      if (!customer) continue;

      const customerItems = items.filter((i) => i.customerId === custId);
      const customerCommission = customerItems.reduce((s, i) => s + (i.commissionAmount ?? 0), 0);
      if (customerCommission <= 0) continue;

      const invoiceNumber = await getNextInvoiceNumber(ctx.shopId);
      const { vatRate, amountHT, vatAmount, amountTTC, vatMention } = computeVAT(settings, customerCommission);

      const invoice = await createInvoice({ userId: ctx.userId, shopId: ctx.shopId,
        invoiceNumber,
        type: "personal_shopping",
        customerId: custId,
        relatedPsMissionId: mission.id,
        amountHt: amountHT.toFixed(2),
        vatRate: String(vatRate),
        vatAmount: vatAmount.toFixed(2),
        amountTtc: amountTTC.toFixed(2),
        vatMention,
        status: "brouillon",
      });
      invoiceIds.push(invoice.id);
    }

    if (invoiceIds.length === 0) {
      return { error: "Aucune commission facturable trouvée." };
    }

    // Update mission status
    await db
      .update(personalShoppingMissions)
      .set({ status: "facture" })
      .where(eq(personalShoppingMissions.id, mission.id));

    revalidatePath("/invoices");
    revalidatePath("/personal-shopping");
    revalidatePath(`/personal-shopping/${missionId}`);
    return {
      success: true,
      invoiceCount: invoiceIds.length,
      invoiceId: invoiceIds[0],
    };
  } catch (err) {
    console.error("generateInvoiceFromMissionAction:", err);
    return { error: err instanceof Error ? err.message : "Erreur lors de la génération." };
  }
}

export async function markInvoiceAsPaidAction(id: string) {
  try {
    await updateInvoice(id, { status: "payee", paidAt: new Date() });
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return { success: true };
  } catch (err) {
    console.error("markInvoiceAsPaidAction:", err);
    return { error: "Erreur." };
  }
}

export async function markInvoiceAsSentAction(id: string) {
  try {
    await updateInvoice(id, { status: "envoyee", sentAt: new Date() });
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return { success: true };
  } catch (err) {
    console.error("markInvoiceAsSentAction:", err);
    return { error: "Erreur." };
  }
}
