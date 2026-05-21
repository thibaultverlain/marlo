import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, STRIPE_CONFIG } from "@/lib/stripe/client";
import { upsertSubscriptionFromStripe, getShopBySubscriptionId, getShopByCustomerId } from "@/lib/db/queries/subscriptions";
import { db } from "@/lib/db/client";
import { shopSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function determinePlan(priceId: string): "mensuel" | "annuel" {
  if (priceId === STRIPE_CONFIG.priceYearly) return "annuel";
  return "mensuel";
}

async function handleSubscriptionEvent(sub: Stripe.Subscription) {
  const shopId = (sub.metadata?.shop_id as string)
    ?? await getShopBySubscriptionId(sub.id)
    ?? await getShopByCustomerId(sub.customer as string);

  if (!shopId) {
    console.error("[stripe webhook] No shop_id found for subscription", sub.id);
    return;
  }

  const priceId = sub.items.data[0]?.price.id ?? "";
  const plan = determinePlan(priceId);

  await upsertSubscriptionFromStripe({
    shopId,
    stripeCustomerId: sub.customer as string,
    stripeSubscriptionId: sub.id,
    status: sub.status as any,
    plan,
    currentPeriodStart: new Date(sub.current_period_start * 1000),
    currentPeriodEnd: new Date(sub.current_period_end * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
  });
}

export async function POST(request: NextRequest) {
  if (!STRIPE_CONFIG.enabled) {
    return NextResponse.json({ received: true, disabled: true });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  if (!STRIPE_CONFIG.webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_CONFIG.webhookSecret);
  } catch (err: any) {
    console.error("[stripe webhook] Signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Fetch the subscription to get full data
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await handleSubscriptionEvent(sub);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionEvent(sub);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const shopId = await getShopBySubscriptionId(invoice.subscription as string);
          if (shopId) {
            await db
              .update(shopSubscriptions)
              .set({ status: "past_due", updatedAt: new Date() })
              .where(eq(shopSubscriptions.shopId, shopId));
          }
        }
        break;
      }

      default:
        // Ignore other events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[stripe webhook] Handler error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
