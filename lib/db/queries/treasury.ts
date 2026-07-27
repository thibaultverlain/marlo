import { db } from "../client";
import {
  shopSettings, pendingPayouts, treasuryMovements, sales, products, customers,
  type PendingPayout, type NewPendingPayout, type TreasuryMovement,
} from "../schema";
import { eq, and, sql, desc, gte, isNotNull, isNull } from "drizzle-orm";
import { getStockStats } from "./products";

/** Seuil d'immobilisation du capital en regime normal. */
export const NORMAL_THRESHOLD = 0.65;
/**
 * Seuil pendant une derogation vente privee (decision du 27/07/2026).
 * Justification : en VP les pieces sont achetees a -70/-80% du prix boutique,
 * la rotation est rapide et la marge elevee — le garde-fou anti-sur-stockage
 * se retournerait contre son objectif en bloquant la meilleure opportunite
 * de marge de l'annee. Contrepartie : duree limitee, retour automatique a 65%.
 */
export const VP_MODE_THRESHOLD = 0.80;
/** Duree maximale d'une derogation, en jours. */
export const VP_MODE_MAX_DAYS = 60;

/**
 * Une vente en attente de paiement, derivee dynamiquement de sales
 * (payment_status = 'en_attente' AND shipping_status IS NOT NULL).
 * Pas de saisie manuelle : c'est calcule depuis les commandes.
 */
export type PendingSalePayout = {
  id: string;             // sale id
  saleId: string;
  amount: number;         // netRevenue si dispo, sinon salePrice
  channel: string;
  productTitle: string | null;
  productBrand: string | null;
  customerName: string | null;
  soldAt: Date;
  shippingStatus: string | null;
};

/**
 * Etat tresorerie complet d'un shop :
 *   - cashBalance : solde courant (saisi manuellement)
 *   - cashUpdatedAt : dernier date de mise a jour
 *   - pendingPayouts : ventes en attente de credit plateforme
 *   - stockValue : valeur d'achat du stock actuel (reutilise getStockStats)
 *   - capitalTotal = cash + stock + pending
 *   - lockedRatio = stockValue / capitalTotal (0..1)
 *   - stopBuying = lockedRatio > 0.65
 */
export type TreasuryState = {
  cashBalance: number;
  cashUpdatedAt: Date | null;
  pendingPayouts: PendingSalePayout[];  // Dynamique : ventes en_attente
  pendingTotal: number;
  stockValue: number;
  capitalTotal: number;
  lockedRatio: number;
  stopBuying: boolean;
  buyingBudget: number;
  buyingThreshold: number;    // 0.65 en normal, 0.80 pendant une derogation VP
  vpModeActive: boolean;      // Derogation vente privee en cours ?
  vpModeUntil: Date | null;   // Date de fin de la derogation
  vpModeLabel: string | null; // Motif (ex: "VP Kering multimarques Paris")
  movements: TreasuryMovement[];
  monthApports: number;
  monthPrelevements: number;
};

export async function getTreasuryState(shopId: string): Promise<TreasuryState> {
  const [settingsRow] = await db
    .select({
      cashBalance: shopSettings.cashBalance,
      cashUpdatedAt: shopSettings.cashUpdatedAt,
      vpModeUntil: shopSettings.vpModeUntil,
      vpModeLabel: shopSettings.vpModeLabel,
    })
    .from(shopSettings)
    .where(eq(shopSettings.shopId, shopId))
    .limit(1);

  const cashBalance = Number(settingsRow?.cashBalance ?? 0);
  const cashUpdatedAt = settingsRow?.cashUpdatedAt ?? null;
  const vpModeUntil = settingsRow?.vpModeUntil ?? null;
  const vpModeLabel = settingsRow?.vpModeLabel ?? null;

  // "En cours" est maintenant derive des ventes en attente de paiement
  // (payment_status = 'en_attente' AND shipping_status IS NOT NULL, i.e. commandes actives)
  const pendingRows = await db
    .select({
      id: sales.id,
      amount: sales.netRevenue,
      salePrice: sales.salePrice,
      channel: sales.channel,
      soldAt: sales.soldAt,
      shippingStatus: sales.shippingStatus,
      productTitle: products.title,
      productBrand: products.brand,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
    })
    .from(sales)
    .leftJoin(products, eq(sales.productId, products.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(
      and(
        eq(sales.shopId, shopId),
        isNotNull(sales.shippingStatus),
        eq(sales.paymentStatus, "en_attente"),
      )
    )
    .orderBy(desc(sales.soldAt));

  const payouts: PendingSalePayout[] = pendingRows.map((r) => ({
    id: r.id,
    saleId: r.id,
    amount: Number(r.amount ?? r.salePrice ?? 0),
    channel: r.channel,
    productTitle: r.productTitle,
    productBrand: r.productBrand,
    customerName: r.customerFirstName ? `${r.customerFirstName} ${r.customerLastName ?? ""}`.trim() : null,
    soldAt: r.soldAt,
    shippingStatus: r.shippingStatus,
  }));

  const pendingTotal = payouts.reduce((s, p) => s + p.amount, 0);

  const stockStats = await getStockStats(shopId);
  const stockValue = Number(stockStats?.totalValue ?? 0);

  const movements = await getTreasuryMovements(shopId, 8);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const [monthTotals] = await db
    .select({
      apports: sql<number>`coalesce(sum(${treasuryMovements.amount}) filter (where ${treasuryMovements.type} = 'apport'), 0)::numeric`,
      prelevements: sql<number>`coalesce(abs(sum(${treasuryMovements.amount}) filter (where ${treasuryMovements.type} = 'prelevement')), 0)::numeric`,
    })
    .from(treasuryMovements)
    .where(and(eq(treasuryMovements.shopId, shopId), gte(treasuryMovements.createdAt, startOfMonth)));

  const capitalTotal = cashBalance + stockValue + pendingTotal;
  // Seuil d'immobilisation : 65% en regime normal, 80% pendant une derogation
  // vente privee (decision du 27/07/2026). La derogation expire d'elle-meme.
  const vpModeActive = vpModeUntil !== null && vpModeUntil.getTime() > Date.now();
  const buyingThreshold = vpModeActive ? VP_MODE_THRESHOLD : NORMAL_THRESHOLD;
  const lockedRatio = capitalTotal > 0 ? stockValue / capitalTotal : 0;
  // Budget max = capital * seuil - stock actuel (combien tu peux acheter avant de depasser 65%)
  const buyingBudget = capitalTotal * buyingThreshold - stockValue;
  const stopBuying = buyingBudget <= 0;

  return {
    cashBalance,
    cashUpdatedAt,
    pendingPayouts: payouts,
    pendingTotal,
    stockValue,
    capitalTotal,
    lockedRatio,
    stopBuying,
    buyingBudget,
    buyingThreshold,
    vpModeActive,
    vpModeUntil,
    vpModeLabel,
    movements,
    monthApports: Number(monthTotals?.apports ?? 0),
    monthPrelevements: Number(monthTotals?.prelevements ?? 0),
  };
}

/**
 * Active une derogation vente privee : le seuil d'immobilisation passe a 80%
 * pendant `days` jours (max VP_MODE_MAX_DAYS). Trace un mouvement pour que la
 * decision reste visible dans l'historique. Passer days = 0 pour annuler.
 */
export async function setVpMode(
  shopId: string,
  days: number,
  label: string | null,
): Promise<void> {
  const capped = Math.min(Math.max(days, 0), VP_MODE_MAX_DAYS);
  const until = capped > 0 ? new Date(Date.now() + capped * 86400000) : null;

  await db
    .update(shopSettings)
    .set({
      vpModeUntil: until,
      vpModeLabel: until ? label : null,
      updatedAt: new Date(),
    })
    .where(eq(shopSettings.shopId, shopId));

  await db.insert(treasuryMovements).values({
    shopId,
    type: "ajustement",
    amount: "0",
    balanceAfter: null,
    label: until
      ? `Derogation VP activee ${capped} j (seuil 80%) — ${label ?? "sans motif"}`
      : "Derogation VP annulee (retour seuil 65%)",
  });
}

export async function getTreasuryMovements(shopId: string, limit = 20): Promise<TreasuryMovement[]> {
  return db
    .select()
    .from(treasuryMovements)
    .where(eq(treasuryMovements.shopId, shopId))
    .orderBy(desc(treasuryMovements.createdAt))
    .limit(limit);
}

/**
 * Applique un mouvement de cash SIGNE (apport +, prelevement -) :
 * met a jour le solde et trace le mouvement dans la meme transaction.
 */
export async function applyCashMovement(
  shopId: string,
  type: "apport" | "prelevement",
  signedAmount: number,
  label: string | null,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ cashBalance: shopSettings.cashBalance })
      .from(shopSettings)
      .where(eq(shopSettings.shopId, shopId))
      .limit(1);
    const newBalance = Number(current?.cashBalance ?? 0) + signedAmount;

    await tx
      .update(shopSettings)
      .set({
        cashBalance: String(newBalance),
        cashUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(shopSettings.shopId, shopId));

    await tx.insert(treasuryMovements).values({
      shopId,
      type,
      amount: String(signedAmount),
      balanceAfter: String(newBalance),
      label,
    });
  });
}

/**
 * Mise a jour manuelle du solde : tracee comme "ajustement" (delta = nouveau - ancien).
 * Un ajustement recurrent ou important = ecart de caisse a expliquer.
 */
/**
 * Recalage sur le releve bancaire reel.
 * Ecrit le solde exact et trace l'ecart comme un ajustement, pour qu'on
 * puisse toujours voir de combien Marlo avait derive et quand.
 */
export async function updateCashBalance(shopId: string, amount: number, note?: string | null): Promise<void> {
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ cashBalance: shopSettings.cashBalance })
      .from(shopSettings)
      .where(eq(shopSettings.shopId, shopId))
      .limit(1);
    const previous = Number(current?.cashBalance ?? 0);
    const delta = Math.round((amount - previous) * 100) / 100;

    await tx
      .update(shopSettings)
      .set({
        cashBalance: String(amount),
        cashUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(shopSettings.shopId, shopId));

    if (delta !== 0) {
      const sign = delta > 0 ? "+" : "";
      const base = `Recalage releve bancaire (ecart ${sign}${delta.toFixed(2)} EUR)`;
      await tx.insert(treasuryMovements).values({
        shopId,
        type: "ajustement",
        amount: String(delta),
        balanceAfter: String(amount),
        label: note?.trim() ? `${base} — ${note.trim()}` : base,
      });
    }
  });
}

export async function createPendingPayout(data: NewPendingPayout): Promise<PendingPayout> {
  const [row] = await db.insert(pendingPayouts).values(data).returning();
  return row;
}

export async function deletePendingPayout(id: string, shopId: string): Promise<void> {
  await db
    .delete(pendingPayouts)
    .where(and(eq(pendingPayouts.id, id), eq(pendingPayouts.shopId, shopId)));
}

/**
 * "Marquer comme recu" : supprime le pending + ajoute le montant au cash.
 * Helper pratique pour quand le virement plateforme arrive.
 */
export async function markPayoutReceived(id: string, shopId: string): Promise<void> {
  const [payout] = await db
    .select()
    .from(pendingPayouts)
    .where(and(eq(pendingPayouts.id, id), eq(pendingPayouts.shopId, shopId)))
    .limit(1);
  if (!payout) throw new Error("Paiement introuvable");

  await db.transaction(async (tx) => {
    // Ajouter au cash et recuperer le nouveau solde
    const [updated] = await tx
      .update(shopSettings)
      .set({
        cashBalance: sql`coalesce(${shopSettings.cashBalance}, 0) + ${payout.amount}`,
        cashUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(shopSettings.shopId, shopId))
      .returning({ cashBalance: shopSettings.cashBalance });
    // Tracer l'encaissement
    await tx.insert(treasuryMovements).values({
      shopId,
      type: "encaissement",
      amount: String(payout.amount),
      balanceAfter: updated?.cashBalance ?? null,
      label: `${payout.label} (${payout.platform})`,
    });
    // Supprimer le pending
    await tx
      .delete(pendingPayouts)
      .where(eq(pendingPayouts.id, id));
  });
}

/**
 * Applique un mouvement de tresorerie automatique lie a un objet source
 * (produit achete, vente encaissee, charge...). Cree le mouvement + met a jour
 * le solde. Idempotent si sourceType/sourceId sont fournis (evite les doublons).
 */
export async function recordAutoMovement(params: {
  shopId: string;
  type: "achat_stock" | "encaissement_vente" | "charge";
  amount: number;      // signe : negatif pour un debit, positif pour un credit
  label: string;
  sourceType: "product" | "sale" | "purchase";
  sourceId: string;
}): Promise<void> {
  const { shopId, type, amount, label, sourceType, sourceId } = params;

  await db.transaction(async (tx) => {
    // Idempotence : si un mouvement pour cette source existe deja avec ce type, on skip.
    const existing = await tx
      .select({ id: treasuryMovements.id })
      .from(treasuryMovements)
      .where(
        and(
          eq(treasuryMovements.shopId, shopId),
          eq(treasuryMovements.type, type),
          sql`source_type = ${sourceType}`,
          sql`source_id = ${sourceId}`,
        )
      )
      .limit(1);
    if (existing.length > 0) return;

    const [current] = await tx
      .select({ cashBalance: shopSettings.cashBalance })
      .from(shopSettings)
      .where(eq(shopSettings.shopId, shopId))
      .limit(1);
    const newBalance = Number(current?.cashBalance ?? 0) + amount;

    await tx
      .update(shopSettings)
      .set({
        cashBalance: String(newBalance),
        cashUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(shopSettings.shopId, shopId));

    await tx.insert(treasuryMovements).values({
      shopId,
      type,
      amount: String(amount),
      balanceAfter: String(newBalance),
      label,
      sourceType,
      sourceId,
    });
  });
}

/**
 * Annule un mouvement lie a une source (si le user delete un produit / annule une vente).
 * Trouve tous les mouvements avec ce sourceType/sourceId, cree un mouvement inverse
 * pour chacun (label prefixe "Annulation :"), met a jour le solde.
 */
export async function reverseAutoMovements(
  shopId: string,
  sourceType: "product" | "sale" | "purchase",
  sourceId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(treasuryMovements)
      .where(
        and(
          eq(treasuryMovements.shopId, shopId),
          sql`source_type = ${sourceType}`,
          sql`source_id = ${sourceId}`,
        )
      );
    if (rows.length === 0) return;

    for (const m of rows) {
      const inverse = -Number(m.amount);
      const [current] = await tx
        .select({ cashBalance: shopSettings.cashBalance })
        .from(shopSettings)
        .where(eq(shopSettings.shopId, shopId))
        .limit(1);
      const newBalance = Number(current?.cashBalance ?? 0) + inverse;

      await tx
        .update(shopSettings)
        .set({
          cashBalance: String(newBalance),
          cashUpdatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(shopSettings.shopId, shopId));

      await tx.insert(treasuryMovements).values({
        shopId,
        type: "ajustement",
        amount: String(inverse),
        balanceAfter: String(newBalance),
        label: `Annulation : ${m.label ?? m.type}`,
      });
    }
  });
}
