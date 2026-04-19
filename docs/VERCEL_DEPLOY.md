# Vercel Deployment Guide

## Environment Variables

All of these must be set in your Vercel project settings (Settings > Environment Variables).

### Reddit API (fixes 403 errors on Vercel)

| Variable | Description |
|---|---|
| `REDDIT_CLIENT_ID` | Reddit app client ID |
| `REDDIT_CLIENT_SECRET` | Reddit app secret |

**Setup:** Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps), create an app with type **"script"**. The redirect URI doesn't matter for app-only auth — use `http://localhost:3000`.

### Database (Neon Postgres)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |

**Setup:** Either add Vercel Postgres from the Vercel dashboard (auto-injects the variable) or create a database at [neon.tech](https://neon.tech) and paste the connection string.

After setting the URL, run the schema migration:
```bash
npx drizzle-kit push
```

### Authentication (Auth.js + Google)

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Random secret for JWT signing |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |

**Setup:**
1. Generate `AUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```
2. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an OAuth 2.0 Client ID (type: Web application).
3. Add authorized redirect URI: `https://your-domain.vercel.app/api/auth/callback/google`
4. Copy the client ID and secret.

### Stripe (subscriptions)

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_ID` | Price ID for the premium plan (`price_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key (`pk_live_...` or `pk_test_...`) |

**Setup:**
1. Create a product + recurring price (~$2-3/mo) in the [Stripe Dashboard](https://dashboard.stripe.com/products).
2. Add a webhook endpoint: `https://your-domain.vercel.app/api/stripe/webhook`
   - Events to listen for: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Copy the webhook signing secret.

### Google AdSense

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID` | Publisher ID (`ca-pub-...`) |
| `NEXT_PUBLIC_AD_SLOT` | Ad unit slot ID |

**Setup:** Apply at [adsense.google.com](https://adsense.google.com). Approval can take days/weeks. The app works without these — ads simply won't show.

### App URL

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Your production URL (e.g. `https://reddit-client-slideshow.vercel.app`) |

Used for Stripe checkout redirect URLs.

## Post-Deploy Checklist

1. Set all env vars above in Vercel
2. Run `npx drizzle-kit push` with `DATABASE_URL` set to create tables
3. Verify Google OAuth callback URL matches your Vercel domain
4. Verify Stripe webhook URL matches your Vercel domain
5. Redeploy after setting env vars (Vercel doesn't auto-redeploy on env changes)
