/**
 * Parse Vinted and Vestiaire Collective sale confirmation emails
 * to extract sale data automatically.
 */

export type ParsedSaleEmail = {
  platform: "vinted" | "vestiaire";
  productTitle: string;
  salePrice: number;
  platformFees: number;
  netRevenue: number;
  buyerName?: string;
  date: Date;
  trackingNumber?: string;
  raw: string;
};

/**
 * Detect which platform the email is from and parse accordingly.
 */
export function parseSaleEmail(subject: string, body: string): ParsedSaleEmail | null {
  const lowerSubject = subject.toLowerCase();
  const lowerBody = body.toLowerCase();

  if (lowerSubject.includes("vinted") || lowerBody.includes("vinted")) {
    return parseVintedEmail(subject, body);
  }

  if (
    lowerSubject.includes("vestiaire") ||
    lowerBody.includes("vestiaire collective") ||
    lowerBody.includes("vestiairecollective")
  ) {
    return parseVestiaireEmail(subject, body);
  }

  return null;
}

function parseEurAmount(text: string): number | null {
  // Match patterns like "250,00 €", "250.00€", "250,00€", "EUR 250.00"
  const patterns = [
    /(\d+[.,]\d{2})\s*€/,
    /€\s*(\d+[.,]\d{2})/,
    /EUR\s*(\d+[.,]\d{2})/,
    /(\d+[.,]\d{2})\s*EUR/,
  ];

  for (const pat of patterns) {
    const match = text.match(pat);
    if (match) {
      return parseFloat(match[1].replace(",", "."));
    }
  }
  return null;
}

function parseVintedEmail(subject: string, body: string): ParsedSaleEmail | null {
  try {
    // Vinted emails typically say "Tu as vendu [article]" or "Your item [article] has been sold"
    let productTitle = "";

    // Try French format
    const titleMatch =
      body.match(/tu as vendu\s*[:\-]?\s*(.+?)(?:\n|<br|\.)/i) ||
      body.match(/article vendu\s*[:\-]?\s*(.+?)(?:\n|<br|\.)/i) ||
      subject.match(/vendu\s*[:\-]?\s*(.+)/i);

    if (titleMatch) {
      productTitle = titleMatch[1].trim().replace(/<[^>]*>/g, "").trim();
    }

    // Extract amounts
    // Look for sale price, fees, and net amount
    const lines = body.split(/\n|<br\s*\/?>/).map((l) => l.replace(/<[^>]*>/g, "").trim());

    let salePrice = 0;
    let fees = 0;
    let netRevenue = 0;

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes("prix de vente") || lower.includes("prix total") || lower.includes("montant de la vente")) {
        const amt = parseEurAmount(line);
        if (amt) salePrice = amt;
      }
      if (lower.includes("frais") || lower.includes("commission") || lower.includes("protection")) {
        const amt = parseEurAmount(line);
        if (amt) fees = amt;
      }
      if (lower.includes("vous recevrez") || lower.includes("tu recevras") || lower.includes("montant versé") || lower.includes("revenu")) {
        const amt = parseEurAmount(line);
        if (amt) netRevenue = amt;
      }
    }

    // If we have sale price but not net, calculate
    if (salePrice > 0 && netRevenue === 0) {
      netRevenue = salePrice - fees;
    }
    // If we have net but not sale price
    if (netRevenue > 0 && salePrice === 0) {
      salePrice = netRevenue + fees;
    }

    if (salePrice === 0 && netRevenue === 0) return null;

    // Try to extract buyer name
    let buyerName: string | undefined;
    const buyerMatch = body.match(/acheteur\s*[:\-]?\s*(.+?)(?:\n|<br)/i) ||
      body.match(/acheté par\s*[:\-]?\s*(.+?)(?:\n|<br)/i);
    if (buyerMatch) buyerName = buyerMatch[1].replace(/<[^>]*>/g, "").trim();

    // Tracking number
    let trackingNumber: string | undefined;
    const trackingMatch = body.match(/suivi\s*[:\-]?\s*([A-Z0-9]{8,})/i) ||
      body.match(/tracking\s*[:\-]?\s*([A-Z0-9]{8,})/i);
    if (trackingMatch) trackingNumber = trackingMatch[1];

    return {
      platform: "vinted",
      productTitle: productTitle || "Article Vinted",
      salePrice,
      platformFees: fees,
      netRevenue: netRevenue || salePrice - fees,
      buyerName,
      date: new Date(),
      trackingNumber,
      raw: body.slice(0, 500),
    };
  } catch {
    return null;
  }
}

function parseVestiaireEmail(subject: string, body: string): ParsedSaleEmail | null {
  try {
    let productTitle = "";

    // Vestiaire emails: "Votre article a été vendu" / "Félicitations"
    const titleMatch =
      body.match(/article\s*[:\-]?\s*(.+?)(?:\n|<br|a été vendu)/i) ||
      body.match(/vous avez vendu\s*[:\-]?\s*(.+?)(?:\n|<br|\.)/i) ||
      subject.match(/vendu\s*[:\-]?\s*(.+)/i);

    if (titleMatch) {
      productTitle = titleMatch[1].trim().replace(/<[^>]*>/g, "").trim();
    }

    const lines = body.split(/\n|<br\s*\/?>/).map((l) => l.replace(/<[^>]*>/g, "").trim());

    let salePrice = 0;
    let fees = 0;
    let netRevenue = 0;

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes("prix de vente") || lower.includes("prix final")) {
        const amt = parseEurAmount(line);
        if (amt) salePrice = amt;
      }
      if (lower.includes("commission") || lower.includes("frais")) {
        const amt = parseEurAmount(line);
        if (amt) fees = amt;
      }
      if (lower.includes("vous recevrez") || lower.includes("montant versé") || lower.includes("virement")) {
        const amt = parseEurAmount(line);
        if (amt) netRevenue = amt;
      }
    }

    // Vestiaire takes 15% commission typically
    if (salePrice > 0 && fees === 0) {
      fees = Math.round(salePrice * 0.15 * 100) / 100;
    }
    if (salePrice > 0 && netRevenue === 0) {
      netRevenue = salePrice - fees;
    }
    if (netRevenue > 0 && salePrice === 0) {
      salePrice = netRevenue + fees;
    }

    if (salePrice === 0 && netRevenue === 0) return null;

    return {
      platform: "vestiaire",
      productTitle: productTitle || "Article Vestiaire Collective",
      salePrice,
      platformFees: fees,
      netRevenue: netRevenue || salePrice - fees,
      date: new Date(),
      raw: body.slice(0, 500),
    };
  } catch {
    return null;
  }
}
