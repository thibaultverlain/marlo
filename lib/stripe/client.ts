import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY is not set. Stripe features will fail.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2024-11-20.acacia" as any,
  typescript: true,
});

export const STRIPE_CONFIG = {
  priceMonthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
  priceYearly: process.env.STRIPE_PRICE_YEARLY ?? "",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  // SHOPS_BYPASSED gets paywall bypass (you, the founder)
  shopsBypassed: (process.env.STRIPE_BYPASS_SHOP_IDS ?? "73debfc8-358f-4136-b415-e1148d991a4a")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

export function isShopBypassed(shopId: string): boolean {
  return STRIPE_CONFIG.shopsBypassed.includes(shopId);
}
