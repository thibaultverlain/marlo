"use server";

import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/require-role";
import { stripe, STRIPE_CONFIG, isShopBypassed } from "@/lib/stripe/client";
import { getSubscriptionState } from "@/lib/db/queries/subscriptions";
import { db } from "@/lib/db/client";
import { shopSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function createCheckoutSessionAction(plan: "mensuel" | "annuel") {
  const ctx = await getAuthContext();

  if (!STRIPE_CONFIG.enabled) {
    return { error: "Les paiements ne sont pas encore actives. Reviens bientot." };
  }

  if (isShopBypassed(ctx.shopId)) {
    return { error: "Compte founder - pas besoin d'abonnement." };
  }

  const priceId = plan === "annuel" ? STRIPE_CONFIG.priceYearly : STRIPE_CONFIG.priceMonthly;
  if (!priceId) {
    return { error: "Stripe price non configure. Contacte le support." };
  }

  // Get existing customer or create new
  const state = await getSubscriptionState(ctx.shopId);
  let customerId = state.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: {
        shop_id: ctx.shopId,
        user_id: ctx.userId,
      },
    });
    customerId = customer.id;

    // Save customer ID immediately
    await db
      .insert(shopSubscriptions)
      .values({
        shopId: ctx.shopId,
        stripeCustomerId: customerId,
        status: "incomplete",
      })
      .onConflictDoUpdate({
        target: shopSubscriptions.shopId,
        set: { stripeCustomerId: customerId, updatedAt: new Date() },
      });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${getAppUrl()}/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppUrl()}/billing?canceled=1`,
      metadata: {
        shop_id: ctx.shopId,
        plan,
      },
      subscription_data: {
        metadata: {
          shop_id: ctx.shopId,
          plan,
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return { error: "Impossible de creer la session de paiement." };
    }

    return { success: true, url: session.url };
  } catch (err: any) {
    console.error("createCheckoutSessionAction:", err);
    return { error: err.message ?? "Erreur Stripe" };
  }
}

export async function createPortalSessionAction() {
  const ctx = await getAuthContext();
  const state = await getSubscriptionState(ctx.shopId);

  if (!state.stripeCustomerId) {
    return { error: "Aucun abonnement Stripe trouve." };
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: state.stripeCustomerId,
      return_url: `${getAppUrl()}/billing`,
    });

    return { success: true, url: session.url };
  } catch (err: any) {
    console.error("createPortalSessionAction:", err);
    return { error: err.message ?? "Erreur Stripe" };
  }
}
