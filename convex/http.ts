import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import Stripe from "stripe";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = new Stripe(STRIPE_SECRET_KEY ?? "missing", {
  // Uses account default API version
});

const handleStripeWebhook = httpAction(async (ctx, request) => {
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return new Response("Stripe env not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const rawBody = Buffer.from(await request.arrayBuffer());

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err.message ?? "Invalid signature"}`, {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        if (!userId) break;

        await ctx.runMutation(internal.users.setPremiumStatus, {
          userId: userId as Id<"users">,
          isPremium: true,
          stripeCustomerId:
            typeof session.customer === "string" ? session.customer : undefined,
          stripeSubscriptionId:
            typeof session.subscription === "string"
              ? session.subscription
              : undefined,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (!userId) break;

        await ctx.runMutation(internal.users.setPremiumStatus, {
          userId: userId as Id<"users">,
          isPremium: false,
          stripeCustomerId:
            typeof subscription.customer === "string"
              ? subscription.customer
              : undefined,
          stripeSubscriptionId: null,
        });
        break;
      }
    }
  } catch (err: any) {
    console.error("Stripe webhook handler error:", err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

import { handleWebhook } from "./revenuecat";

const http = httpRouter();

http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: handleStripeWebhook,
});

http.route({
  path: "/revenuecat-webhook",
  method: "POST",
  handler: handleWebhook,
});

export default http;




