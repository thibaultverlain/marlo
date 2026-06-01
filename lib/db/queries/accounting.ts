import { db } from "../client";
import { sales, products, customers, purchases } from "../schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

// Taux TVA par defaut applique sur les ventes et les achats avec facture TVA (ventes privees / outlets pro).
// Pour les achats a des particuliers (ex Vinted), la TVA n'est pas deductible — c'est gere via le flag tvaDeductible sur la ligne purchase si necessaire.
// Pour rester simple ici on calcule la TVA comme si tout etait soumis a TVA 20% — c'est une approximation a affiner avec l'expert-comptable.
export const VAT_RATE = 0.20;

// Bareme IS 2026 : 15% jusqu'a 42 500 EUR de benefice imposable (PME a capital detenu >=75% par personnes physiques), 25% au-dela.
export const IS_RATE_REDUCED = 0.15;
export const IS_RATE_NORMAL = 0.25;
export const IS_THRESHOLD = 42_500;

// Flat tax PFU sur dividendes (12.8% IR + 17.2% prelevements sociaux).
export const FLAT_TAX_RATE = 0.30;

export type RecipeEntry = {
  date: Date;
  invoiceNumber: string | null;
  customerName: string | null;
  productTitle: string | null;
  channel: string;
  amountTTC: number;
  amountHT: number;
  vat: number;
  paymentMethod: string | null;
};

export type PurchaseEntry = {
  id: string;
  date: Date | null;
  description: string;
  supplier: string | null;
  amountTTC: number;
  amountHT: number;
  vat: number;
  vatDeductible: boolean;
  paymentMethod: string | null;
  category: string | null;
  productSku: string | null;
  productTitle?: string | null;
};

function splitTTC(ttc: number, deductible = true) {
  if (!deductible) return { ht: ttc, vat: 0 };
  const ht = ttc / (1 + VAT_RATE);
  const vat = ttc - ht;
  return { ht, vat };
}

// Estime si la TVA d'un achat est deductible : oui pour les ventes privees / outlets pro, non pour les particuliers.
function isVatDeductible(supplier: string | null, source: string | null): boolean {
  const s = `${supplier ?? ""} ${source ?? ""}`.toLowerCase();
  if (s.includes("vinted") || s.includes("particulier")) return false;
  return true;
}

export async function getRecipeBook(shopId: string, year?: number): Promise<RecipeEntry[]> {
  const y = year ?? new Date().getFullYear();
  const startOfYear = new Date(y, 0, 1);
  const endOfYear = new Date(y, 11, 31, 23, 59, 59);

  const rows = await db
    .select({
      soldAt: sales.soldAt, invoiceNumber: sales.invoiceNumber, channel: sales.channel,
      amount: sales.salePrice, paymentMethod: sales.paymentMethod,
      productTitle: products.title, customerFirstName: customers.firstName, customerLastName: customers.lastName,
    })
    .from(sales)
    .leftJoin(products, eq(sales.productId, products.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .where(and(eq(sales.shopId, shopId), gte(sales.soldAt, startOfYear), lte(sales.soldAt, endOfYear)))
    .orderBy(sales.soldAt);

  return rows.map((r) => {
    const ttc = Number(r.amount);
    const { ht, vat } = splitTTC(ttc, true);
    return {
      date: r.soldAt,
      invoiceNumber: r.invoiceNumber,
      customerName: r.customerFirstName && r.customerLastName ? `${r.customerFirstName} ${r.customerLastName}` : null,
      productTitle: r.productTitle,
      channel: r.channel,
      amountTTC: ttc,
      amountHT: ht,
      vat,
      paymentMethod: r.paymentMethod,
    };
  });
}

export async function getPurchasesRegister(shopId: string, year?: number): Promise<PurchaseEntry[]> {
  const y = year ?? new Date().getFullYear();
  const startOfYear = new Date(y, 0, 1);
  const endOfYear = new Date(y, 11, 31, 23, 59, 59);

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
      gte(products.purchaseDate, startOfYear.toISOString().split("T")[0]),
      lte(products.purchaseDate, endOfYear.toISOString().split("T")[0])
    ))
    .orderBy(desc(products.purchaseDate));

  const explicit: PurchaseEntry[] = explicitPurchases
    .filter((p) => { if (!p.purchasedAt) return false; const d = new Date(p.purchasedAt); return d >= startOfYear && d <= endOfYear; })
    .map((p) => {
      const ttc = Number(p.amount);
      const deductible = isVatDeductible(p.supplier, null);
      const { ht, vat } = splitTTC(ttc, deductible);
      return {
        id: p.id,
        date: p.purchasedAt ? new Date(p.purchasedAt) : null,
        description: p.description,
        supplier: p.supplier,
        amountTTC: ttc, amountHT: ht, vat, vatDeductible: deductible,
        paymentMethod: p.paymentMethod, category: p.category, productSku: p.productSku,
      };
    });

  const implicit: PurchaseEntry[] = productPurchases.map((p) => {
    const ttc = Number(p.amount);
    const deductible = isVatDeductible(p.supplier, p.supplier);
    const { ht, vat } = splitTTC(ttc, deductible);
    return {
      id: `prod-${p.id}`,
      date: p.purchasedAt ? new Date(p.purchasedAt) : null,
      description: p.description,
      supplier: p.supplier,
      amountTTC: ttc, amountHT: ht, vat, vatDeductible: deductible,
      paymentMethod: null, category: "stock", productSku: p.productSku,
    };
  });

  return [...explicit, ...implicit].sort((a, b) => { if (!a.date) return 1; if (!b.date) return -1; return a.date.getTime() - b.date.getTime(); });
}

export type SasuStats = {
  // Volumes
  salesCount: number;
  expensesCount: number;
  // Ventes
  revenueTTC: number;
  revenueHT: number;
  vatCollected: number;
  // Achats / charges
  expensesTTC: number;
  expensesHT: number;
  vatDeductible: number;
  // TVA
  vatToPay: number;
  // Resultat
  resultBeforeTax: number;   // HT - HT (= produits - charges)
  corporateTax: number;       // IS estime
  netResult: number;          // resultat apres IS
  marginPct: number;          // resultat avant IS / revenueHT
  // Dividendes potentiels
  netDividendsIfDistributed: number; // netResult * (1 - flat tax)
  flatTaxAmount: number;
};

export async function getAccountingStats(shopId: string, year?: number): Promise<SasuStats> {
  const [recipes, purchasesList] = await Promise.all([
    getRecipeBook(shopId, year),
    getPurchasesRegister(shopId, year),
  ]);

  const revenueTTC = recipes.reduce((s, r) => s + r.amountTTC, 0);
  const revenueHT = recipes.reduce((s, r) => s + r.amountHT, 0);
  const vatCollected = recipes.reduce((s, r) => s + r.vat, 0);

  const expensesTTC = purchasesList.reduce((s, p) => s + p.amountTTC, 0);
  const expensesHT = purchasesList.reduce((s, p) => s + p.amountHT, 0);
  const vatDeductible = purchasesList.reduce((s, p) => s + p.vat, 0);

  const vatToPay = Math.max(0, vatCollected - vatDeductible);

  const resultBeforeTax = revenueHT - expensesHT;
  let corporateTax = 0;
  if (resultBeforeTax > 0) {
    if (resultBeforeTax <= IS_THRESHOLD) {
      corporateTax = resultBeforeTax * IS_RATE_REDUCED;
    } else {
      corporateTax = IS_THRESHOLD * IS_RATE_REDUCED + (resultBeforeTax - IS_THRESHOLD) * IS_RATE_NORMAL;
    }
  }
  const netResult = resultBeforeTax - corporateTax;
  const marginPct = revenueHT > 0 ? (resultBeforeTax / revenueHT) * 100 : 0;

  const flatTaxAmount = netResult > 0 ? netResult * FLAT_TAX_RATE : 0;
  const netDividendsIfDistributed = netResult > 0 ? netResult - flatTaxAmount : 0;

  return {
    salesCount: recipes.length,
    expensesCount: purchasesList.length,
    revenueTTC, revenueHT, vatCollected,
    expensesTTC, expensesHT, vatDeductible,
    vatToPay,
    resultBeforeTax, corporateTax, netResult, marginPct,
    netDividendsIfDistributed, flatTaxAmount,
  };
}
