# Deploying to Vercel

## Prerequisites

- A [GitHub](https://github.com) account with this repo pushed to it
- A [Vercel](https://vercel.com) account (free tier works)

## Step 1: Push your code to GitHub

If you haven't already, create a GitHub repo and push:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/reddit-client-slideshow.git
git branch -M main
git push -u origin main
```

## Step 2: Import project in Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your GitHub account and find `reddit-client-slideshow`
4. Click **Import**

## Step 3: Configure build settings

Vercel auto-detects Next.js projects. The defaults should work:

- **Framework Preset:** Next.js
- **Build Command:** `next build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

No environment variables are needed — the app uses Reddit's public JSON API.

## Step 4: Deploy

1. Click **Deploy**
2. Wait for the build to complete (usually under 2 minutes)
3. Vercel will give you a URL like `https://reddit-client-slideshow.vercel.app`

## Step 5: Verify

1. Open the deployment URL
2. The settings panel should appear
3. Click **Apply & Start** to load media from the default subreddits
4. Confirm images load and the slideshow plays

## Subsequent deployments

Every push to `main` will automatically trigger a new deployment. Pull requests get preview deployments with unique URLs.

## Custom domain (optional)

1. Go to your project in the Vercel dashboard
2. Click **Settings** > **Domains**
3. Add your domain and follow the DNS configuration instructions

## Troubleshooting

- **Images not loading:** Reddit may rate-limit requests from certain IPs. The app proxies requests through a Next.js API route (`/api/reddit`) to avoid CORS issues. If Reddit blocks the server IP, images fetched via direct URL should still work.
- **Build fails:** Ensure you're using Node.js 20+ (Vercel defaults to this). Check that `npm install` succeeds locally before pushing.
- **Blank page:** Open browser dev tools console. If you see CORS or fetch errors, Reddit may be temporarily blocking the deployment region. Try redeploying to a different Vercel region in project settings.
