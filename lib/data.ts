export const LUXURY_BRANDS = [
  // Maisons haute couture & maroquinerie
  "Hermès", "Chanel", "Louis Vuitton", "Dior", "Gucci", "Saint Laurent",
  "Bottega Veneta", "Balenciaga", "Prada", "Celine", "Fendi", "Loewe",
  "Valentino", "Givenchy", "Burberry", "Versace", "Dolce & Gabbana",
  "Alexander McQueen", "Tom Ford", "Miu Miu", "Goyard", "Berluti",
  "Loro Piana", "Brunello Cucinelli", "Lanvin", "Balmain", "Kenzo",
  "Marni", "Rick Owens", "Maison Margiela", "Off-White", "Palm Angels",
  "Amiri", "Fear of God", "Rhude", "Chrome Hearts",

  // Sneakers & streetwear premium
  "Nike", "Jordan", "Adidas", "Yeezy", "New Balance", "Salomon",
  "Asics", "Puma", "Converse", "Vans", "Reebok",

  // Montres
  "Rolex", "Omega", "Audemars Piguet", "Patek Philippe", "Tag Heuer",
  "Cartier", "IWC", "Jaeger-LeCoultre", "Breitling", "Hublot",
  "Panerai", "Tudor", "Longines", "Zenith", "Vacheron Constantin",

  // Bijoux
  "Cartier", "Tiffany & Co", "Van Cleef & Arpels", "Bulgari",
  "Messika", "Chopard", "Piaget", "Boucheron", "Fred",

  // Premium / Bridge
  "Sézane", "Sandro", "Maje", "Claudie Pierlot", "Ba&sh",
  "The Kooples", "Jacquemus", "Ami Paris", "Isabel Marant",
  "Acne Studios", "A.P.C.", "Zadig & Voltaire", "Iro",
  "Anine Bing", "Totême", "Ganni", "Reformation",

  // Lunettes & accessoires
  "Ray-Ban", "Celine", "Dior", "Gucci", "Prada", "Persol",

  // Outdoor luxe
  "Moncler", "Canada Goose", "Arc'teryx", "Stone Island",
  "C.P. Company", "The North Face (collab)",
] as const;

export const CATEGORIES = [
  { value: "sacs", label: "Sacs" },
  { value: "chaussures", label: "Chaussures" },
  { value: "vetements", label: "Vêtements" },
  { value: "accessoires", label: "Accessoires" },
  { value: "montres", label: "Montres" },
  { value: "bijoux", label: "Bijoux" },
  { value: "autre", label: "Autre" },
] as const;

export const CONDITIONS = [
  { value: "neuf_avec_etiquettes", label: "Neuf avec étiquettes" },
  { value: "neuf_sans_etiquettes", label: "Neuf sans étiquettes" },
  { value: "comme_neuf", label: "Comme neuf" },
  { value: "tres_bon", label: "Très bon état" },
  { value: "bon", label: "Bon état" },
  { value: "correct", label: "État correct" },
] as const;

export const CHANNELS = [
  { value: "vinted", label: "Vinted" },
  { value: "vestiaire", label: "Vestiaire Collective" },
  { value: "stockx", label: "StockX" },
  { value: "prive", label: "Client privé" },
  { value: "autre", label: "Autre" },
] as const;

export const PRODUCT_STATUSES = [
  { value: "en_stock", label: "En stock", color: "bg-gray-500" },
  { value: "en_vente", label: "En vente", color: "bg-blue-500" },
  { value: "reserve", label: "Réservé", color: "bg-amber-500" },
  { value: "vendu", label: "Vendu", color: "bg-green-500" },
  { value: "expedie", label: "Expédié", color: "bg-purple-500" },
  { value: "livre", label: "Livré", color: "bg-emerald-600" },
  { value: "retourne", label: "Retourné", color: "bg-red-500" },
] as const;

// Commissions par plateforme (pour auto-calcul)
export const PLATFORM_FEES: Record<string, {
  sellerFeePct: number;
  processingFeePct: number;
  fixedFee: number;
  note: string;
}> = {
  vinted: {
    sellerFeePct: 0,
    processingFeePct: 0,
    fixedFee: 0,
    note: "Aucune commission vendeur. Protection acheteur payée par l'acheteur.",
  },
  vestiaire: {
    sellerFeePct: 0.15,
    processingFeePct: 0,
    fixedFee: 0,
    note: "Commission ~15% (varie selon le prix, dégressive au-dessus de certains seuils).",
  },
  stockx: {
    sellerFeePct: 0.095,
    processingFeePct: 0.03,
    fixedFee: 0,
    note: "Transaction fee ~9.5% + payment processing ~3%. Varie selon le niveau vendeur.",
  },
  prive: {
    sellerFeePct: 0,
    processingFeePct: 0,
    fixedFee: 0,
    note: "Vente directe, aucune commission.",
  },
  autre: {
    sellerFeePct: 0,
    processingFeePct: 0,
    fixedFee: 0,
    note: "À renseigner manuellement.",
  },
};

export function calculatePlatformFees(channel: string, salePrice: number): number {
  const fees = PLATFORM_FEES[channel];
  if (!fees) return 0;
  return Math.round((salePrice * (fees.sellerFeePct + fees.processingFeePct) + fees.fixedFee) * 100) / 100;
}

export function calculateMargin(
  purchasePrice: number,
  salePrice: number,
  platformFees: number,
  shippingCost: number,
  shippingPaidBySeller: boolean
): { netRevenue: number; margin: number; marginPct: number } {
  const shippingCharge = shippingPaidBySeller ? shippingCost : 0;
  const netRevenue = salePrice - platformFees - shippingCharge;
  const margin = netRevenue - purchasePrice;
  const marginPct = purchasePrice > 0 ? (margin / purchasePrice) * 100 : 0;
  return {
    netRevenue: Math.round(netRevenue * 100) / 100,
    margin: Math.round(margin * 100) / 100,
    marginPct: Math.round(marginPct * 10) / 10,
  };
}
