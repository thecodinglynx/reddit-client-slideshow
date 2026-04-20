This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Testing Stripe Locally

### Prerequisites

1. A [Stripe account](https://dashboard.stripe.com) with **test mode** enabled (toggle in the top-right of the dashboard)
2. The [Stripe CLI](https://docs.stripe.com/stripe-cli) installed

### Setup

1. Copy your **test mode** API keys from Stripe Dashboard > Developers > API keys into `.env.local`:

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_ID=price_...
```

2. Start the dev server:

```bash
npm run dev
```

3. In a separate terminal, forward Stripe webhooks to your local server:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

4. Copy the webhook signing secret printed by the CLI (`whsec_...`) into `.env.local`:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

5. Restart the dev server so it picks up the new secret.

### Testing the checkout flow

1. Sign in with Google
2. Navigate to `/account` and click "Upgrade to Premium"
3. Use Stripe's test card: `4242 4242 4242 4242`, any future expiry, any CVC
4. After payment completes, the webhook marks your account as premium (ads stop showing)

### Notes

- The `STRIPE_WEBHOOK_SECRET` from the CLI is different from the one in the Stripe Dashboard — use the CLI one for local testing
- Test mode and live mode have separate customers, so switching modes requires a fresh checkout
- The Stripe CLI terminal will show webhook delivery status — look for `[200]` responses to confirm the webhook is working

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

For production Stripe, set the **live mode** keys and create a webhook endpoint pointing to `https://your-domain.vercel.app/api/stripe/webhook` in the Stripe Dashboard. Use the dashboard's signing secret (not the CLI one) as `STRIPE_WEBHOOK_SECRET` in Vercel env vars.
