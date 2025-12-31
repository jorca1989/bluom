export const STRIPE_PRICES = {
  monthly: {
    USD: "price_1SUB8TGBTnWixaddYJHYHYhX",
    EUR: "price_REPLACE_ME",
    GBP: "price_REPLACE_ME",
    CAD: "price_REPLACE_ME",
    AUD: "price_REPLACE_ME",
    JPY: "price_REPLACE_ME",
  },
  annual: {
    USD: "price_1SUBBXGBTnWixaddKkWbUh9a",
    EUR: "price_REPLACE_ME",
    GBP: "price_REPLACE_ME",
    CAD: "price_REPLACE_ME",
    AUD: "price_REPLACE_ME",
    JPY: "price_REPLACE_ME",
  },
} as const;

export type PlanId = keyof typeof STRIPE_PRICES;
export type Currency = keyof typeof STRIPE_PRICES.monthly;

export function getStripePriceId(planId: PlanId, currency: Currency): string {
  const priceId = STRIPE_PRICES[planId][currency];
  if (!priceId || priceId === "price_REPLACE_ME") {
    throw new Error(
      `No Stripe price configured for ${planId} in ${currency}. Update convex/stripe/priceMaps.ts with the real price_... id.`
    );
  }
  return priceId;
}






