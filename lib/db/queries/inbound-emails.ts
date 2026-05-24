import { db } from "../client";
import { shops, teamMembers, processedInboundEmails } from "../schema";
import { eq, and } from "drizzle-orm";

export type InboundShopContext = {
  shopId: string;
  ownerId: string;
};

/**
 * Trouve le shop a partir du token d'adresse inbound + retourne l'owner.
 * Retourne null si le token ne correspond a aucun shop.
 */
export async function getShopByInboundToken(token: string): Promise<InboundShopContext | null> {
  const rows = await db
    .select({
      shopId: shops.id,
      ownerId: teamMembers.userId,
    })
    .from(shops)
    .innerJoin(teamMembers, and(
      eq(teamMembers.shopId, shops.id),
      eq(teamMembers.role, "owner"),
    ))
    .where(eq(shops.inboundEmailToken, token))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Verifie si un message-id a deja ete traite (n'importe quel shop).
 * Le message-id est UNIQUE globalement, donc on n'a pas besoin de filtrer.
 */
export async function isMessageAlreadyProcessed(messageId: string): Promise<boolean> {
  const rows = await db
    .select({ id: processedInboundEmails.id })
    .from(processedInboundEmails)
    .where(eq(processedInboundEmails.messageId, messageId))
    .limit(1);
  return rows.length > 0;
}

/**
 * Marque un message comme traite. Idempotent via la contrainte UNIQUE message_id.
 */
export async function recordProcessedEmail(
  shopId: string,
  messageId: string,
  saleId: string | null,
): Promise<void> {
  await db.insert(processedInboundEmails).values({
    shopId,
    messageId,
    saleId,
  }).onConflictDoNothing({ target: processedInboundEmails.messageId });
}
