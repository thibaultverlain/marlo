import { db } from "../client";
import { sales, products, customers, purchases } from "../schema";
import { eq, desc, sql, and, gte, lte, isNotNull } from "drizzle-orm";

/**
 * Constantes micro-entreprise VENTE DE BIENS (BIC) 2026.
 *
 * ATTENTION : les taux sont donnes a titre indicatif.
 * Verifier avec un expert-comptable pour la situation exacte.
 * Barème URSSAF et abattement peuvent evoluer entre lois de finances.
 */
export const MICRO = {
  /** Seuil franchise en base de TVA — vente de biens (2026, source impots.gouv.fr). */
  VAT_THRESHOLD:       85_000,
  /** Seuil majore de franchise TVA vente de biens (bascule TVA en cours d'annee). */
  VAT_THRESHOLD_MAJ:   93_500,
  /** Plafond global du regime micro vente de biens (sortie totale au-dela). */
  MICRO_CEILING:      188_700,
  /** Cotisations sociales URSSAF vente de biens (%). */
  URSSAF_RATE:            0.123,
  /** Contribution formation professionnelle (%). */
  CFP_RATE:               0.001,
  /** Versement liberatoire IR — vente de biens (%). */
  VFL_RATE:               0.01,
  /** Abattement forfaitaire pour frais professionnels (vente de biens). */
  DEDUCTION_RATE:         0.71,
};

export type RecipeEntry = {
  date: Date;
  invoiceNumber: string | null;
  customerName: string | null;
  productTitle: string | null;
  channel: string;
  amount: number;
  paymentMethod: string | null;
};

export type PurchaseEntry = {
  id: string;
  date: Date | null;
  description: string;
  supplier: string | null;
  amount: number;
  paymentMethod: string | null;
  category: string | null;
  productSku: string | null;
};

/**
 * Livre de recettes — compta d'ENCAISSEMENT.
 *
 * En micro-entreprise, une recette appartient a la periode ou l'argent est
 * REELLEMENT ENCAISSE, pas a celle de la vente. Une piece vendue le 25 juillet
 * et payee le 11 aout se declare en aout.
 *
 * On filtre donc sur paid_at, jamais sur sold_at. Les ventes non encaissees
 * (paid_at NULL) sont exclues : elles ne sont pas encore declarables.
 */
export async function getRecipeBook(shopId: string, year?: number): Promise<RecipeEntry[]> {
  const y = year ?? new Date().getFullYear();
  const startOfYear = new Date(y, 0, 1);
  const endOfYear = new Date(y, 11, 31, 23, 59, 59);

  const rows = await db
    .select({
      paidAt: sales.paidAt,
      invoiceNumber: sales.invoiceNumber,
      channel: sales.channel,
      // CA declarable = montant REELLEMENT PERCU, pas le prix affiche.
      // Regle confirmee par l'URSSAF le 11/08/2026 : sur une vente Vestiaire
      // a 261,90 EUR dont 52,38 EUR de commission, on declare 209,52 EUR.
      // Fallback sur salePrice pour les ventes sans frais (Vinted, direct).
      amount: sql<string>`coalesce(${sales.netRevenue}, ${sales.salePrice})`,
      paymentMethod: sales.paymentMethod,
      productTitle: products.title,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
    })
    .from(sales)
    .leftJoin(products, eq(sales.productId, products.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(and(
      eq(sales.shopId, shopId),
      eq(sales.paymentStatus, "recu"),
      isNotNull(sales.paidAt),
      gte(sales.paidAt, startOfYear),
      lte(sales.paidAt, endOfYear),
    ))
    .orderBy(sales.paidAt);

  return rows.map((r) => ({
    date: r.paidAt!,
    invoiceNumber: r.invoiceNumber,
    customerName: r.customerFirstName && r.customerLastName ? `${r.customerFirstName} ${r.customerLastName}` : null,
    productTitle: r.productTitle,
    channel: r.channel,
    amount: Number(r.amount),
    paymentMethod: r.paymentMethod,
  }));
}

/**
 * Registre des achats (obligatoire en micro pour la vente de biens).
 * Rassemble les achats explicites de la table purchases + les achats de
 * produits (proxy sur la table products pour tracer les investissements stock).
 */
export async function getPurchasesRegister(shopId: string, year?: number): Promise<PurchaseEntry[]> {
  const y = year ?? new Date().getFullYear();
  const startOfYear = new Date(y, 0, 1);
  const endOfYear = new Date(y, 11, 31, 23, 59, 59);
  const startDateStr = startOfYear.toISOString().split("T")[0];
  const endDateStr = endOfYear.toISOString().split("T")[0];

  const explicitPurchases = await db
    .select({
      id: purchases.id, purchasedAt: purchases.purchasedAt, description: purchases.description,
      supplier: purchases.supplier, amount: purchases.amount, paymentMethod: purchases.paymentMethod,
      category: purchases.category, productSku: products.sku,
    })
    .from(purchases)
    .leftJoin(products, eq(purchases.productId, products.id))
    .where(eq(purchases.shopId, shopId))
    .orderBy(desc(purchases.createdAt));

  const productPurchases = await db
    .select({
      id: products.id, purchasedAt: products.purchaseDate, description: products.title,
      supplier: products.purchaseSource, amount: products.purchasePrice, productSku: products.sku,
    })
    .from(products)
    .where(and(
      eq(products.shopId, shopId),
      gte(products.purchaseDate, startDateStr),
      lte(products.purchaseDate, endDateStr)
    ))
    .orderBy(desc(products.purchaseDate));

  const explicit: PurchaseEntry[] = explicitPurchases
    .filter((p) => { if (!p.purchasedAt) return false; const d = new Date(p.purchasedAt); return d >= startOfYear && d <= endOfYear; })
    .map((p) => ({
      id: p.id, date: p.purchasedAt ? new Date(p.purchasedAt) : null, description: p.description,
      supplier: p.supplier, amount: Number(p.amount), paymentMethod: p.paymentMethod,
      category: p.category, productSku: p.productSku,
    }));

  const implicit: PurchaseEntry[] = productPurchases.map((p) => ({
    id: `prod-${p.id}`, date: p.purchasedAt ? new Date(p.purchasedAt) : null, description: p.description,
    supplier: p.supplier, amount: Number(p.amount), paymentMethod: null, category: "stock", productSku: p.productSku,
  }));

  return [...explicit, ...implicit].sort((a, b) => { if (!a.date) return 1; if (!b.date) return -1; return a.date.getTime() - b.date.getTime(); });
}

export type MicroStats = {
  // Volumes
  salesCount: number;
  expensesCount: number;
  // Recettes / depenses (compta d'encaissement)
  revenue: number;         // = CA encaisse de l'annee (base de calcul micro)
  expenses: number;        // depenses reelles (pour ton pilotage, PAS pour le fisc)
  // Charges micro estimees
  urssafDue: number;       // 12,3% du CA vente biens
  cfpDue: number;          // 0,1% du CA
  totalSocialCharges: number; // urssaf + cfp
  incomeTaxVfl: number;    // 1% du CA en option versement liberatoire
  taxableBaseIfBareme: number; // 29% du CA (apres abattement 71%) — base pour bareme progressif
  // Resultat de pilotage
  netAfterSocial: number;  // CA - cotisations sociales
  netAfterAll: number;     // CA - cotisations - IR VFL
  // Plafonds
  vatThreshold: number;
  vatUsagePct: number;     // 0..100
  vatRemainingBudget: number;
  vatWarning: "ok" | "warning" | "over";  // > 80% = warning, > 100% = over
  ceiling: number;
  ceilingUsagePct: number;
};

export async function getAccountingStats(shopId: string, year?: number): Promise<MicroStats> {
  const [recipes, purchasesList] = await Promise.all([
    getRecipeBook(shopId, year),
    getPurchasesRegister(shopId, year),
  ]);

  const revenue = recipes.reduce((s, r) => s + r.amount, 0);
  const expenses = purchasesList.reduce((s, p) => s + p.amount, 0);

  const urssafDue = revenue * MICRO.URSSAF_RATE;
  const cfpDue = revenue * MICRO.CFP_RATE;
  const totalSocialCharges = urssafDue + cfpDue;
  const incomeTaxVfl = revenue * MICRO.VFL_RATE;
  const taxableBaseIfBareme = revenue * (1 - MICRO.DEDUCTION_RATE); // = 29% du CA

  const netAfterSocial = revenue - totalSocialCharges;
  const netAfterAll = netAfterSocial - incomeTaxVfl;

  const vatUsagePct = MICRO.VAT_THRESHOLD > 0 ? Math.min(100, (revenue / MICRO.VAT_THRESHOLD) * 100) : 0;
  const vatRemainingBudget = MICRO.VAT_THRESHOLD - revenue;
  const vatWarning: MicroStats["vatWarning"] = vatUsagePct >= 100 ? "over" : vatUsagePct >= 80 ? "warning" : "ok";

  const ceilingUsagePct = MICRO.MICRO_CEILING > 0 ? Math.min(100, (revenue / MICRO.MICRO_CEILING) * 100) : 0;

  return {
    salesCount: recipes.length,
    expensesCount: purchasesList.length,
    revenue,
    expenses,
    urssafDue,
    cfpDue,
    totalSocialCharges,
    incomeTaxVfl,
    taxableBaseIfBareme,
    netAfterSocial,
    netAfterAll,
    vatThreshold: MICRO.VAT_THRESHOLD,
    vatUsagePct,
    vatRemainingBudget,
    vatWarning,
    ceiling: MICRO.MICRO_CEILING,
    ceilingUsagePct,
  };
}
