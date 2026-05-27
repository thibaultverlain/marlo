import { db } from "../client";
import { shopSettings, pendingPayouts, type PendingPayout, type NewPendingPayout } from "../schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { getStockStats } from "./products";

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
  pendingPayouts: PendingPayout[];
  pendingTotal: number;
  stockValue: number;
  capitalTotal: number;
  lockedRatio: number;
  stopBuying: boolean;
};

export async function getTreasuryState(shopId: string): Promise<TreasuryState> {
  const [settingsRow] = await db
    .select({
      cashBalance: shopSettings.cashBalance,
      cashUpdatedAt: shopSettings.cashUpdatedAt,
    })
    .from(shopSettings)
    .where(eq(shopSettings.shopId, shopId))
    .limit(1);

  const cashBalance = Number(settingsRow?.cashBalance ?? 0);
  const cashUpdatedAt = settingsRow?.cashUpdatedAt ?? null;

  const payouts = await db
    .select()
    .from(pendingPayouts)
    .where(eq(pendingPayouts.shopId, shopId))
    .orderBy(desc(pendingPayouts.createdAt));

  const pendingTotal = payouts.reduce((s, p) => s + Number(p.amount), 0);

  const stockStats = await getStockStats(shopId);
  const stockValue = Number(stockStats?.totalValue ?? 0);

  const capitalTotal = cashBalance + stockValue + pendingTotal;
  const lockedRatio = capitalTotal > 0 ? stockValue / capitalTotal : 0;
  const stopBuying = lockedRatio > 0.65;

  return {
    cashBalance,
    cashUpdatedAt,
    pendingPayouts: payouts,
    pendingTotal,
    stockValue,
    capitalTotal,
    lockedRatio,
    stopBuying,
  };
}

export async function updateCashBalance(shopId: string, amount: number): Promise<void> {
  await db
    .update(shopSettings)
    .set({
      cashBalance: String(amount),
      cashUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(shopSettings.shopId, shopId));
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
    // Ajouter au cash
    await tx
      .update(shopSettings)
      .set({
        cashBalance: sql`coalesce(${shopSettings.cashBalance}, 0) + ${payout.amount}`,
        cashUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(shopSettings.shopId, shopId));
    // Supprimer le pending
    await tx
      .delete(pendingPayouts)
      .where(eq(pendingPayouts.id, id));
  });
}
