import { db } from "../client";
import { sales, products, purchases } from "../schema";
import { eq, sql, and, gte, lte } from "drizzle-orm";

export type SimpleStats = {
  salesCount: number;
  expensesCount: number;
  revenueTTC: number;
  expensesTTC: number;
  resultBeforeTax: number;
  marginPct: number;
};

/**
 * Statistiques comptables simples pour le compte de resultat.
 * Recettes = somme des ventes de l'annee.
 * Depenses = somme des achats explicites + coats produits achetes dans l'annee.
 * Resultat = Recettes - Depenses.
 */
export async function getAccountingStats(shopId: string, year?: number): Promise<SimpleStats> {
  const y = year ?? new Date().getFullYear();
  const startOfYear = new Date(y, 0, 1);
  const endOfYear = new Date(y, 11, 31, 23, 59, 59);
  const startDateStr = startOfYear.toISOString().split("T")[0];
  const endDateStr = endOfYear.toISOString().split("T")[0];

  const [salesStats, purchasesStats, productsStats] = await Promise.all([
    db
      .select({
        total: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
        count: sql<number>`count(*)::int`,
      })
      .from(sales)
      .where(and(eq(sales.shopId, shopId), gte(sales.soldAt, startOfYear), lte(sales.soldAt, endOfYear))),
    db
      .select({
        total: sql<number>`coalesce(sum(amount), 0)::numeric`,
        count: sql<number>`count(*)::int`,
      })
      .from(purchases)
      .where(and(eq(purchases.shopId, shopId), gte(purchases.purchasedAt, startDateStr), lte(purchases.purchasedAt, endDateStr))),
    db
      .select({
        total: sql<number>`coalesce(sum(purchase_price), 0)::numeric`,
        count: sql<number>`count(*)::int`,
      })
      .from(products)
      .where(and(eq(products.shopId, shopId), gte(products.purchaseDate, startDateStr), lte(products.purchaseDate, endDateStr))),
  ]);

  const revenueTTC = Number(salesStats[0]?.total ?? 0);
  const salesCount = salesStats[0]?.count ?? 0;
  const expensesTTC = Number(purchasesStats[0]?.total ?? 0) + Number(productsStats[0]?.total ?? 0);
  const expensesCount = (purchasesStats[0]?.count ?? 0) + (productsStats[0]?.count ?? 0);
  const resultBeforeTax = revenueTTC - expensesTTC;
  const marginPct = revenueTTC > 0 ? (resultBeforeTax / revenueTTC) * 100 : 0;

  return { salesCount, expensesCount, revenueTTC, expensesTTC, resultBeforeTax, marginPct };
}
