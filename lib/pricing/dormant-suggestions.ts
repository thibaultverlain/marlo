/**
 * Algorithme de suggestion de baisse de prix pour un produit dormant.
 *
 * Regles :
 *   - 0-30 jours  : pas de suggestion (laisse vivre)
 *   - 30-60 jours : -10% sur le prix cible
 *   - 60-90 jours : -20% sur le prix cible
 *   - 90+ jours   : -30% + suggestion de basculer en vente privee
 *
 * On ne suggere une baisse que si la marge apres baisse reste >= 0.
 * (Pas de suggestion qui te fait vendre a perte.)
 */

export type DormantSuggestion = {
  days: number;
  severity: "watch" | "warm" | "hot" | "critical";
  suggestedDiscount: number; // 0, 0.1, 0.2, 0.3
  suggestedPrice: number | null;
  suggestedAction: string;
  marginAfterDiscount: number | null;
  marginAfterDiscountPct: number | null;
  feasible: boolean; // false si baisse fait passer en dessous du prix d'achat
};

export function computeDormantSuggestion(
  daysInStock: number,
  purchasePrice: number,
  targetPrice: number | null,
): DormantSuggestion {
  let discount = 0;
  let severity: DormantSuggestion["severity"] = "watch";
  let action = "Laisser vivre encore quelques jours";

  if (daysInStock >= 90) {
    discount = 0.3;
    severity = "critical";
    action = "Baisser de 30% ou basculer en vente privee";
  } else if (daysInStock >= 60) {
    discount = 0.2;
    severity = "hot";
    action = "Baisser de 20% pour relancer la visibilite";
  } else if (daysInStock >= 30) {
    discount = 0.1;
    severity = "warm";
    action = "Baisser de 10% pour signaler aux acheteurs";
  }

  if (!targetPrice || discount === 0) {
    return {
      days: daysInStock,
      severity,
      suggestedDiscount: discount,
      suggestedPrice: null,
      suggestedAction: action,
      marginAfterDiscount: null,
      marginAfterDiscountPct: null,
      feasible: true,
    };
  }

  const suggestedPrice = Math.round(targetPrice * (1 - discount));
  const marginAfter = suggestedPrice - purchasePrice;
  const marginPct = purchasePrice > 0 ? (marginAfter / purchasePrice) * 100 : 0;
  const feasible = marginAfter >= 0;

  if (!feasible) {
    action = "Baisse impossible sans vendre a perte. Envisage une vente privee ou un trade.";
  }

  return {
    days: daysInStock,
    severity,
    suggestedDiscount: discount,
    suggestedPrice,
    suggestedAction: action,
    marginAfterDiscount: marginAfter,
    marginAfterDiscountPct: Math.round(marginPct * 10) / 10,
    feasible,
  };
}
