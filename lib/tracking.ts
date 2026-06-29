/**
 * Detection automatique du transporteur a partir du numero de suivi
 * et generation de l'URL de suivi.
 *
 * Couvre les principaux transporteurs utilises en France pour le resale luxe :
 * - La Poste / Colissimo
 * - Chronopost
 * - Mondial Relay
 * - DHL Express
 * - UPS
 * - DPD / Geopost
 *
 * Fallback : 17track.net (couvre 1000+ transporteurs).
 */

export type Carrier = {
  id: string;
  name: string;
  url: (tracking: string) => string;
};

const CARRIERS: Record<string, Carrier> = {
  colissimo: {
    id: "colissimo",
    name: "Colissimo (La Poste)",
    url: (n) => `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(n)}`,
  },
  chronopost: {
    id: "chronopost",
    name: "Chronopost",
    url: (n) => `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${encodeURIComponent(n)}`,
  },
  mondial_relay: {
    id: "mondial_relay",
    name: "Mondial Relay",
    url: (n) => `https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition=${encodeURIComponent(n)}`,
  },
  dhl: {
    id: "dhl",
    name: "DHL Express",
    url: (n) => `https://www.dhl.com/fr-fr/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(n)}`,
  },
  ups: {
    id: "ups",
    name: "UPS",
    url: (n) => `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}`,
  },
  dpd: {
    id: "dpd",
    name: "DPD",
    url: (n) => `https://www.dpd.fr/trace/${encodeURIComponent(n)}`,
  },
  generic: {
    id: "generic",
    name: "Inconnu (17track)",
    url: (n) => `https://t.17track.net/fr#nums=${encodeURIComponent(n)}`,
  },
};

/**
 * Detecte le transporteur a partir du format du numero de suivi.
 * Retourne null si non identifiable (fallback sur generic).
 */
export function detectCarrier(tracking: string | null | undefined): Carrier {
  if (!tracking) return CARRIERS.generic;
  const t = tracking.trim().toUpperCase();

  // UPS : 1Z + 16 caracteres alphanumeriques
  if (/^1Z[A-Z0-9]{16}$/i.test(t)) return CARRIERS.ups;

  // Chronopost : 13 chiffres commencant par XB, XK, XS, XJ, XL, XV, XX, etc.
  if (/^X[A-Z]\d{9}[A-Z]{2}$/i.test(t)) return CARRIERS.chronopost;

  // Colissimo : 13 caracteres commencant par lettres (6T, 8L, 8R, BT, CA, CB, CD, CE, CY, CZ, LR, LS, etc.)
  // Format standard : 2 lettres + 9 chiffres + 2 lettres OU 13 chiffres
  if (
    /^(6[A-Z]|8[A-Z]|B[A-Z]|C[A-Z]|L[A-Z]|R[A-Z])\d{9}[A-Z]{2}$/i.test(t) ||
    /^[A-Z]{2}\d{9}FR$/i.test(t)
  ) return CARRIERS.colissimo;

  // Mondial Relay : 8 a 11 chiffres
  if (/^\d{8,11}$/.test(t)) return CARRIERS.mondial_relay;

  // DPD : 14 chiffres
  if (/^\d{14}$/.test(t)) return CARRIERS.dpd;

  // DHL : 10 chiffres ou 11 chiffres
  if (/^\d{10,11}$/.test(t)) return CARRIERS.dhl;

  return CARRIERS.generic;
}

/**
 * URL de suivi pour un numero donne (auto-detection du transporteur).
 */
export function getTrackingUrl(tracking: string | null | undefined): string | null {
  if (!tracking) return null;
  const carrier = detectCarrier(tracking);
  return carrier.url(tracking.trim());
}

/**
 * Nom du transporteur detecte (pour l'UI).
 */
export function getCarrierName(tracking: string | null | undefined): string | null {
  if (!tracking) return null;
  return detectCarrier(tracking).name;
}
