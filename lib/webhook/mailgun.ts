import crypto from "crypto";

export const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN ?? "inbound.marlo.app";
export const INBOUND_LOCAL_PREFIX = "ventes-";

/**
 * Verifie la signature Mailgun (HMAC-SHA256).
 * Mailgun envoie timestamp + token + signature dans le form data.
 * Signature = HMAC_SHA256(signing_key, timestamp + token).
 *
 * https://documentation.mailgun.com/docs/mailgun/user-manual/tracking-messages/#securing-webhooks
 */
export function verifyMailgunSignature(
  timestamp: string | null,
  token: string | null,
  signature: string | null,
  signingKey: string,
): boolean {
  if (!timestamp || !token || !signature) return false;

  // Rejette les timestamps de plus de 5 minutes (replay protection)
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) return false;

  const expected = crypto
    .createHmac("sha256", signingKey)
    .update(timestamp + token)
    .digest("hex");

  // timingSafeEqual exige des buffers de meme taille
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Extrait le shop token du champ recipient Mailgun.
 * Formats acceptes :
 *   ventes-{uuid}@inbound.marlo.app
 *   ventes-{uuid}@anything (defensive)
 *   "Nom <ventes-{uuid}@...>"
 */
export function extractShopTokenFromRecipient(recipient: string | null): string | null {
  if (!recipient) return null;

  // Extrait l'adresse entre <...> si format "Name <addr>"
  const angleMatch = recipient.match(/<([^>]+)>/);
  const addr = angleMatch ? angleMatch[1] : recipient;

  // Local part avant @
  const atIdx = addr.indexOf("@");
  if (atIdx === -1) return null;
  const localPart = addr.slice(0, atIdx).trim().toLowerCase();

  if (!localPart.startsWith(INBOUND_LOCAL_PREFIX)) return null;
  const token = localPart.slice(INBOUND_LOCAL_PREFIX.length);

  // Validation UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  return uuidRegex.test(token) ? token : null;
}

/**
 * Compose l'adresse inbound complete pour un shop.
 */
export function buildInboundEmailAddress(token: string): string {
  return `${INBOUND_LOCAL_PREFIX}${token}@${INBOUND_DOMAIN}`;
}
