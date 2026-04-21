/**
 * Parse Vinted and Vestiaire Collective sale confirmation emails.
 * Handles both HTML email bodies and plain text, single-line and multi-line.
 */

export type ParsedSaleEmail = {
  platform: "vinted" | "vestiaire";
  productTitle: string;
  salePrice: number;
  platformFees: number;
  netRevenue: number;
  buyerName?: string;
  date: Date;
  raw: string;
};

export function parseSaleEmail(subject: string, body: string): ParsedSaleEmail | null {
  const lower = (subject + " " + body).toLowerCase();

  if (lower.includes("vinted")) {
    return parseEmail("vinted", subject, body);
  }
  if (lower.includes("vestiaire")) {
    return parseEmail("vestiaire", subject, body);
  }

  // Fallback: try to parse anyway if it mentions "vendu"
  if (lower.includes("vendu") || lower.includes("sold")) {
    return parseEmail("vinted", subject, body);
  }

  return null;
}

function parseAllEurAmounts(text: string): number[] {
  const amounts: number[] = [];
  // Match all euro amounts in any format
  const regex = /(\d[\d\s]*[.,]\d{2})\s*€|€\s*(\d[\d\s]*[.,]\d{2})|(\d[\d\s]*[.,]\d{2})\s*EUR|EUR\s*(\d[\d\s]*[.,]\d{2})/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const raw = (match[1] || match[2] || match[3] || match[4]).replace(/\s/g, "");
    const num = parseFloat(raw.replace(",", "."));
    if (!isNaN(num)) amounts.push(num);
  }
  return amounts;
}

function findAmountNear(text: string, keywords: string[]): number | null {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    const idx = lower.indexOf(kw);
    if (idx === -1) continue;
    // Look at the text within 80 chars after the keyword
    const snippet = text.substring(idx, idx + 80);
    const amounts = parseAllEurAmounts(snippet);
    if (amounts.length > 0) return amounts[0];
  }
  return null;
}

function parseEmail(platform: "vinted" | "vestiaire", subject: string, body: string): ParsedSaleEmail | null {
  try {
    // Clean HTML tags
    const clean = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const fullText = subject + " " + clean;

    // Extract product title
    let productTitle = "";
    const titlePatterns = [
      /tu as vendu\s*[:\-–]?\s*(.+?)(?:\.|!|\n|$)/i,
      /article vendu\s*[:\-–]?\s*(.+?)(?:\.|!|\n|$)/i,
      /vous avez vendu\s*[:\-–]?\s*(.+?)(?:\.|!|\n|$)/i,
      /vendu\s*[:\-–]?\s*(.+?)(?:\.|!|\n|$)/i,
      /article\s*[:\-–]?\s*(.+?)(?:a été vendu|vendu|sold)/i,
    ];
    for (const pat of titlePatterns) {
      const m = fullText.match(pat);
      if (m && m[1].trim().length > 2) {
        productTitle = m[1].trim().slice(0, 80);
        break;
      }
    }

    // Extract amounts by looking for keywords near euro amounts
    const salePrice = findAmountNear(fullText, [
      "prix de vente", "prix total", "montant de la vente",
      "prix final", "vendu pour", "vendu à", "sale price",
    ]);

    const fees = findAmountNear(fullText, [
      "frais plateforme", "frais de service", "frais", "commission",
      "protection", "platform fees", "service fee",
    ]);

    const netRevenue = findAmountNear(fullText, [
      "tu recevras", "vous recevrez", "montant versé", "net reçu",
      "virement", "revenu net", "you will receive", "montant net",
    ]);

    // Fallback: if we found no labeled amounts, try to get all amounts and guess
    let finalSalePrice = salePrice ?? 0;
    let finalFees = fees ?? 0;
    let finalNet = netRevenue ?? 0;

    if (finalSalePrice === 0 && finalNet === 0) {
      // Get all amounts from the text
      const allAmounts = parseAllEurAmounts(fullText);
      if (allAmounts.length >= 3) {
        // Assume: sale price (largest), fees, net revenue
        const sorted = [...allAmounts].sort((a, b) => b - a);
        finalSalePrice = sorted[0];
        finalNet = sorted[1];
        finalFees = sorted[2];
        // Verify: if sale - fees ≈ net, we have it right
        if (Math.abs(finalSalePrice - finalFees - finalNet) > 1) {
          // Try: largest = sale, smallest = fees, middle = net
          finalFees = sorted[sorted.length - 1];
          finalNet = sorted[1];
        }
      } else if (allAmounts.length === 2) {
        finalSalePrice = Math.max(...allAmounts);
        finalNet = Math.min(...allAmounts);
        finalFees = finalSalePrice - finalNet;
      } else if (allAmounts.length === 1) {
        finalSalePrice = allAmounts[0];
        finalNet = allAmounts[0];
      }
    }

    // Fill in missing values
    if (finalSalePrice > 0 && finalNet === 0 && finalFees >= 0) {
      finalNet = finalSalePrice - finalFees;
    }
    if (finalNet > 0 && finalSalePrice === 0) {
      finalSalePrice = finalNet + finalFees;
    }
    if (finalSalePrice > 0 && finalFees === 0 && finalNet > 0) {
      finalFees = finalSalePrice - finalNet;
    }

    // Default fees for Vestiaire (15%) if we only have sale price
    if (platform === "vestiaire" && finalSalePrice > 0 && finalFees === 0 && finalNet === 0) {
      finalFees = Math.round(finalSalePrice * 0.15 * 100) / 100;
      finalNet = finalSalePrice - finalFees;
    }

    if (finalSalePrice === 0 && finalNet === 0) return null;

    return {
      platform,
      productTitle: productTitle || `Article ${platform === "vinted" ? "Vinted" : "Vestiaire Collective"}`,
      salePrice: finalSalePrice,
      platformFees: finalFees,
      netRevenue: finalNet || finalSalePrice - finalFees,
      date: new Date(),
      raw: fullText.slice(0, 300),
    };
  } catch {
    return null;
  }
}
