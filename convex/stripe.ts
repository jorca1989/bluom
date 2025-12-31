import Stripe from "stripe";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { getStripePriceId } from "./stripe/priceMaps";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
if (!STRIPE_SECRET_KEY) {
  // Throwing at module load time helps surface misconfig early in dev logs.
  // Convex will still load the module, but the action will fail until configured.
  // eslint-disable-next-line no-console
  console.error("Missing key:", process.env.STRIPE_SECRET_KEY ? "Present" : "Absent");
}

const stripe = new Stripe(STRIPE_SECRET_KEY ?? "missing", {
  // Let Stripe use your account's default API version.
});

// Expo dev deep links (Test Mode checkout)
// Note: `exp://localhost:19000` may need to be replaced with your LAN URL on a real device.
const SUCCESS_URL = "exp://localhost:19000/--/fuel?session_id={CHECKOUT_SESSION_ID}";
const CANCEL_URL = "exp://localhost:19000/--/fuel";

export const createCheckoutSession = action({
  args: {
    planId: v.optional(v.union(v.literal("monthly"), v.literal("annual"))),
    currency: v.union(
      v.literal("USD"),
      v.literal("EUR"),
      v.literal("GBP"),
      v.literal("CAD"),
      v.literal("AUD"),
      v.literal("JPY")
    ),
    items: v.optional(
      v.array(
        v.object({
          name: v.string(),
          quantity: v.float64(),
          unitAmountCents: v.float64(),
        })
      )
    ),
  },
  handler: async (ctx, { planId, currency, items }): Promise<{ sessionId: string; url: string | null } | { error: string }> => {
    // eslint-disable-next-line no-console
    console.log("Stripe configured with key type:", STRIPE_SECRET_KEY?.substring(0, 7));

    if (!STRIPE_SECRET_KEY) {
      return { error: "Missing STRIPE_SECRET_KEY in Convex environment" };
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { error: "Unauthenticated" };
    }

    // Convex actions don't have ctx.db, so we use an existing query:
    const convexUser = await ctx.runQuery(api.users.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!convexUser) {
      return { error: "User record not found in Convex" };
    }

    const safePlanId = planId ?? "monthly";
    const currencyLower = currency.toLowerCase();

    // If no items are passed, fetch from the user's shopping list
    let line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (Array.isArray(items) && items.length > 0) {
      line_items = items.map((it) => ({
        quantity: Math.max(1, Math.floor(it.quantity)),
        price_data: {
          currency: currencyLower,
          unit_amount: Math.max(0, Math.floor(it.unitAmountCents)),
          product_data: { name: it.name },
        },
      }));
    } else if (planId === undefined) {
      // If no planId is specified and no items are passed, assume shopping list checkout
      const shoppingListItems = await ctx.runQuery(api.shoppingList.listForUser, {
        userId: convexUser._id,
      });

      const pendingItems = shoppingListItems.filter((i: Doc<"shoppingList">) => !i.completed);

      if (pendingItems.length === 0) {
        return { error: "No items in shopping list to checkout" };
      }

      line_items = pendingItems.map((it: Doc<"shoppingList">) => {
        let quantity = 1;
        let name = it.name;

        if (typeof it.quantity === "number") {
          quantity = Math.max(1, Math.floor(it.quantity));
        } else if (typeof it.quantity === "string") {
          // If quantity is a string (e.g., "1 bunch"), append to name for clarity
          name = `${it.name} (${it.quantity})`;
        }

        return {
          quantity,
          price_data: {
            currency: currencyLower,
            // Defaulting to 0/Free for shopping list items since we don't track prices
            unit_amount: 0,
            product_data: { name },
          },
        };
      });
    }

    try {
      if (line_items.length > 0) {

        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          line_items,
          success_url: SUCCESS_URL,
          cancel_url: CANCEL_URL,
          client_reference_id: convexUser._id,
          metadata: {
            userId: convexUser._id,
            clerkId: identity.subject,
            type: "shopping_list",
            currency,
            itemsCount: String(line_items.length),
          },
        });

        return { sessionId: session.id, url: session.url };
      }

      const priceId = getStripePriceId(safePlanId, currency);
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: SUCCESS_URL,
        cancel_url: CANCEL_URL,
        client_reference_id: convexUser._id,
        metadata: {
          userId: convexUser._id,
          clerkId: identity.subject,
          planId: safePlanId,
          currency,
          type: "premium_subscription",
        },
        subscription_data: {
          metadata: {
            userId: convexUser._id,
            clerkId: identity.subject,
            planId: safePlanId,
            currency,
          },
        },
      });

      return { sessionId: session.id, url: session.url };
    } catch (e: any) {
      return { error: e?.message ? String(e.message) : "Stripe session creation failed" };
    }
  },
});


