## Stripe subscriptions (Monthly + Yearly)

This repo uses **Stripe Checkout** created by a **Convex action**, and a **Convex HTTP webhook** to set `users.isPremium`.

### 1) Create Prices (Stripe CLI)

Create prices for each currency for:
- **Premium Monthly** product: `prod_TR3EhtiQnj4ViG`
- **Premium Yearly** product: `prod_TR3IhNQNPeenFv`

After each `stripe prices create ...` command, copy the returned `price_...` id.

Then update:
- `convex/stripe/priceMaps.ts`

### 2) Convex environment variables

Set these in your Convex deployment env:
- `STRIPE_API_KEY`
- `STRIPE_WEBHOOK_SECRET`

### 3) Stripe webhook endpoint

Convex route:
- `POST /stripe-webhook` (see `convex/http.ts`)

### 4) Deep links

Your app scheme is configured in `app.json`:
- `scheme`: `bluom`

Checkout redirects:
- success: `bluom://premium/success?...`
- cancel: `bluom://premium`

### 5) App environment variables

In your local `.env` (Expo):
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=...` (if/when you add Stripe native SDK)
- `EXPO_PUBLIC_CONVEX_URL=...`




