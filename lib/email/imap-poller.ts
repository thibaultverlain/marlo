import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";
import { decrypt } from "@/lib/crypto/encryption";
import { parseSaleEmail } from "@/lib/email-parser";
import { db } from "@/lib/db/client";
import { products, sales } from "@/lib/db/schema";
import { inArray, and, eq } from "drizzle-orm";
import { isMessageAlreadyProcessed, recordProcessedEmail } from "@/lib/db/queries/inbound-emails";
import type { ShopEmailCredentials } from "@/lib/db/schema";

export type PollResult = {
  shopId: string;
  fetched: number;
  processed: number;
  skipped: number;
  errors: string[];
  salesCreated: string[];
};

function isSaleEmail(subject: string, body: string): boolean {
  const s = subject.toLowerCase();
  const b = body.toLowerCase();
  return (
    s.includes("vendu") || s.includes("sold") ||
    s.includes("felicitations") || s.includes("félicitations") ||
    s.includes("congratulations") || s.includes("vente confirmée") ||
    b.includes("a ete vendu") || b.includes("a été vendu") ||
    b.includes("has been sold")
  );
}

/**
 * Verifie que l'expediteur est legitime (Vinted/Vestiaire) pour limiter le spoofing.
 * Le user peut forwarder depuis sa boite perso, donc on whiteliste aussi le sender du forward.
 */
function isTrustedSender(from: string | null): boolean {
  if (!from) return false;
  const f = from.toLowerCase();
  return (
    f.includes("vinted") ||
    f.includes("vestiaire") ||
    f.includes("stockx") ||
    f.includes("noreply") || // beaucoup de notifications ont noreply@plateforme
    f.includes("no-reply")
  );
}

async function processMessage(
  parsed: ParsedMail,
  shopId: string,
  ownerId: string,
): Promise<{ status: "created" | "skipped" | "error"; saleId?: string; reason?: string }> {
  const subject = parsed.subject ?? "";
  const body = parsed.text ?? parsed.html?.toString().replace(/<[^>]*>/g, " ") ?? "";
  const messageId = parsed.messageId ?? null;
  const fromText = parsed.from?.text ?? null;

  // 1. Sanity checks
  if (!subject && !body) return { status: "skipped", reason: "empty" };
  if (!isSaleEmail(subject, body)) return { status: "skipped", reason: "not_sale_email" };
  if (!isTrustedSender(fromText)) return { status: "skipped", reason: "untrusted_sender" };

  // 2. Dedup
  if (messageId) {
    const already = await isMessageAlreadyProcessed(messageId);
    if (already) return { status: "skipped", reason: "already_processed" };
  }

  // 3. Parse
  const data = parseSaleEmail(subject, body);
  if (!data) return { status: "skipped", reason: "could_not_parse" };

  // 4. Match produit dans le stock du shop
  const inStock = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.shopId, shopId),
        inArray(products.status, ["en_stock", "en_vente", "reserve"]),
      ),
    );

  const titleLower = data.productTitle.toLowerCase();
  const matched = inStock.find((p) => {
    const brandLower = p.brand.toLowerCase();
    const productTitleLower = p.title.toLowerCase();
    return (
      titleLower.includes(brandLower) ||
      productTitleLower.includes(titleLower.slice(0, 15)) ||
      titleLower.includes(productTitleLower.slice(0, 15))
    );
  });

  // 5. Calcul marge
  const channel = data.platform === "vinted" ? "vinted" : "vestiaire";
  const purchasePrice = matched ? Number(matched.purchasePrice) : 0;
  const margin = matched ? data.netRevenue - purchasePrice : 0;
  const marginPct = matched && data.salePrice > 0 ? (margin / data.salePrice) * 100 : 0;

  // 6. Insert sale
  const [sale] = await db
    .insert(sales)
    .values({
      userId: ownerId,
      shopId,
      productId: matched?.id ?? null,
      channel: channel as any,
      salePrice: String(data.salePrice),
      platformFees: String(data.platformFees),
      shippingCost: "0",
      shippingPaidBy: "acheteur",
      netRevenue: String(data.netRevenue),
      margin: String(margin),
      marginPct: String(Math.round(marginPct * 100) / 100),
      paymentMethod: "plateforme",
      paymentStatus: "en_attente",
      shippingStatus: "a_expedier",
      soldAt: data.date,
      notes: matched
        ? `Auto-import IMAP ${data.platform}`
        : `${data.productTitle} (import IMAP ${data.platform})`,
    })
    .returning();

  // 7. Update produit
  if (matched) {
    await db
      .update(products)
      .set({ status: "vendu", updatedAt: new Date() })
      .where(and(eq(products.id, matched.id), eq(products.shopId, shopId)));
  }

  // 8. Dedup record
  if (messageId) {
    await recordProcessedEmail(shopId, messageId, sale.id);
  }

  return { status: "created", saleId: sale.id };
}

/**
 * Connecte un shop a sa boite IMAP, lit les UNSEEN, traite, mark as SEEN.
 * Tolere les erreurs : ne plante pas le cron complet si un shop fail.
 */
export async function pollShopMailbox(
  creds: ShopEmailCredentials,
  ownerId: string,
): Promise<PollResult> {
  const result: PollResult = {
    shopId: creds.shopId,
    fetched: 0,
    processed: 0,
    skipped: 0,
    errors: [],
    salesCreated: [],
  };

  let password: string;
  try {
    password = decrypt(creds.imapPasswordEncrypted);
  } catch (err: any) {
    result.errors.push(`Decrypt failed: ${err.message}`);
    return result;
  }

  const client = new ImapFlow({
    host: creds.imapHost,
    port: creds.imapPort,
    secure: creds.imapUseTls,
    auth: { user: creds.imapUsername, pass: password },
    logger: false,
    socketTimeout: 30_000,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock(creds.imapFolder);
    try {
      // Recherche UNSEEN — Gmail retourne tout l'historique non lu, on limite a 50 par poll
      const uids = (await client.search({ seen: false }, { uid: true })) || [];
      const toProcess = uids.slice(0, 50);
      result.fetched = toProcess.length;

      for (const uid of toProcess) {
        try {
          const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
          if (!msg || !msg.source) {
            result.skipped++;
            continue;
          }
          const parsed = await simpleParser(msg.source);
          const r = await processMessage(parsed, creds.shopId, ownerId);

          if (r.status === "created" && r.saleId) {
            result.processed++;
            result.salesCreated.push(r.saleId);
          } else {
            result.skipped++;
          }

          // Marquer comme lu meme si skip pour pas retraiter en boucle
          await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
        } catch (err: any) {
          result.errors.push(`UID ${uid}: ${err.message ?? err}`);
        }
      }
    } finally {
      lock.release();
    }
  } catch (err: any) {
    result.errors.push(`IMAP: ${err.message ?? err}`);
  } finally {
    try { await client.logout(); } catch {}
  }

  return result;
}

/**
 * Teste juste la connexion IMAP (login + select INBOX). Pour le bouton "Tester" du formulaire.
 */
export async function testImapConnection(creds: {
  imapHost: string;
  imapPort: number;
  imapUseTls: boolean;
  imapUsername: string;
  password: string;
  imapFolder: string;
}): Promise<{ ok: true; messageCount: number } | { ok: false; error: string }> {
  const client = new ImapFlow({
    host: creds.imapHost,
    port: creds.imapPort,
    secure: creds.imapUseTls,
    auth: { user: creds.imapUsername, pass: creds.password },
    logger: false,
    socketTimeout: 15_000,
  });

  try {
    await client.connect();
    const mailbox = await client.mailboxOpen(creds.imapFolder, { readOnly: true });
    const messageCount = typeof mailbox.exists === "number" ? mailbox.exists : 0;
    await client.logout();
    return { ok: true, messageCount };
  } catch (err: any) {
    try { await client.logout(); } catch {}
    return { ok: false, error: err.message ?? String(err) };
  }
}
