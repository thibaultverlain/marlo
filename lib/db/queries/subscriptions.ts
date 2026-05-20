import { db } from "@/lib/db/client";
import { shopSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isShopBypassed } from "@/lib/stripe/client";

export type SubscriptionState = {
  status: "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | "bypassed" | "none";
  hasAccess: boolean;
  isPaywalled: boolean;
  trialDaysLeft: number | null;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  plan: "mensuel" | "annuel" | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

export async function getSubscriptionState(shopId: string): Promise<SubscriptionState> {
  // Founder bypass
  if (isShopBypassed(shopId)) {
    return {
      status: "bypassed",
      hasAccess: true,
      isPaywalled: false,
      trialDaysLeft: null,
      trialEndsAt: null,
      currentPeriodEnd: null,
      plan: null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };
  }

  const [sub] = await db
    .select()
    .from(shopSubscriptions)
    .where(eq(shopSubscriptions.shopId, shopId))
    .limit(1);

  if (!sub) {
    return {
      status: "none",
      hasAccess: false,
      isPaywalled: true,
      trialDaysLeft: null,
      trialEndsAt: null,
      currentPeriodEnd: null,
      plan: null,
      cancelAtPeriodEnd: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };
  }

  const now = new Date();
  let hasAccess = false;
  let trialDaysLeft: number | null = null;

  if (sub.status === "trialing" && sub.trialEndsAt) {
    const trialEnd = new Date(sub.trialEndsAt);
    if (trialEnd > now) {
      hasAccess = true;
      trialDaysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
  } else if (sub.status === "active") {
    hasAccess = true;
  } else if (sub.status === "past_due") {
    // 7-day grace period
    if (sub.currentPeriodEnd) {
      const graceEnd = new Date(new Date(sub.currentPeriodEnd).getTime() + 7 * 24 * 60 * 60 * 1000);
      hasAccess = now < graceEnd;
    }
  } else if (sub.status === "canceled" && sub.currentPeriodEnd) {
    // Access until end of paid period
    hasAccess = now < new Date(sub.currentPeriodEnd);
  }

  return {
    status: sub.status,
    hasAccess,
    isPaywalled: !hasAccess,
    trialDaysLeft,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodEnd: sub.currentPeriodEnd,
    plan: sub.plan,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
    stripeCustomerId: sub.stripeCustomerId,
    stripeSubscriptionId: sub.stripeSubscriptionId,
  };
}

export async function createTrialSubscription(shopId: string) {
  const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await db
    .insert(shopSubscriptions)
    .values({
      shopId,
      status: "trialing",
      trialEndsAt: trialEnd,
    })
    .onConflictDoNothing();
}

export async function upsertSubscriptionFromStripe(data: {
  shopId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete";
  plan: "mensuel" | "annuel";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
}) {
  await db
    .insert(shopSubscriptions)
    .values({
      shopId: data.shopId,
      stripeCustomerId: data.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      status: data.status,
      plan: data.plan,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      canceledAt: data.canceledAt,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: shopSubscriptions.shopId,
      set: {
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        status: data.status,
        plan: data.plan,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        canceledAt: data.canceledAt,
        updatedAt: new Date(),
      },
    });
}

export async function getShopBySubscriptionId(stripeSubscriptionId: string): Promise<string | null> {
  const [row] = await db
    .select({ shopId: shopSubscriptions.shopId })
    .from(shopSubscriptions)
    .where(eq(shopSubscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);
  return row?.shopId ?? null;
}

export async function getShopByCustomerId(stripeCustomerId: string): Promise<string | null> {
  const [row] = await db
    .select({ shopId: shopSubscriptions.shopId })
    .from(shopSubscriptions)
    .where(eq(shopSubscriptions.stripeCustomerId, stripeCustomerId))
    .limit(1);
  return row?.shopId ?? null;
}
