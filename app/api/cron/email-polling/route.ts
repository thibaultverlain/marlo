import { NextRequest, NextResponse } from "next/server";
import { getActiveCredentialsForPolling, updatePollResult } from "@/lib/db/queries/email-credentials";
import { pollShopMailbox } from "@/lib/email/imap-poller";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // Hobby plan max

/**
 * Endpoint appele par Vercel Cron OU par un cron externe (cron-job.org, GitHub Actions...).
 * Auth : header Authorization: Bearer <CRON_SECRET>
 *
 * Itere sur tous les shops actifs avec credentials IMAP, polle leur boite,
 * cree les ventes pour les emails de vente detectes.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const shops = await getActiveCredentialsForPolling();
  const summaries: Array<{ shopId: string; processed: number; skipped: number; errors: string[] }> = [];

  // Process shops in parallel mais avec une limite raisonnable
  const CONCURRENCY = 5;
  for (let i = 0; i < shops.length; i += CONCURRENCY) {
    const batch = shops.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async ({ creds, ownerId }) => {
        const result = await pollShopMailbox(creds, ownerId);
        const status = result.errors.length === 0 ? "ok" : `errors: ${result.errors.length}`;
        const errorText = result.errors.length > 0 ? result.errors.join(" | ").slice(0, 500) : null;
        await updatePollResult(creds.shopId, status, errorText);
        return {
          shopId: result.shopId,
          processed: result.processed,
          skipped: result.skipped,
          errors: result.errors,
        };
      }),
    );
    summaries.push(...results);
  }

  const totalProcessed = summaries.reduce((s, r) => s + r.processed, 0);
  const totalErrors = summaries.reduce((s, r) => s + r.errors.length, 0);
  const elapsed = Date.now() - startedAt;

  console.log(
    `[Email Polling] ${shops.length} shop(s) polled in ${elapsed}ms — processed=${totalProcessed} errors=${totalErrors}`,
  );

  return NextResponse.json({
    success: true,
    shopsPolled: shops.length,
    totalProcessed,
    totalErrors,
    elapsedMs: elapsed,
    summaries,
  });
}
