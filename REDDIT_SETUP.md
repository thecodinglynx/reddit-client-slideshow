# Reddit API Setup

## No Setup Required for Basic Usage

This app uses Reddit's **public JSON API**, which does not require authentication for browsing public subreddits. It works out of the box — no Reddit account or API keys needed.

### How it works

The app appends `.json` to standard Reddit URLs (e.g., `https://www.reddit.com/r/earthporn/hot.json`) to fetch post data. Reddit's public API:

- Returns CORS headers (`Access-Control-Allow-Origin: *`), so browser-based requests work directly
- Has a rate limit of ~100 requests per 10 minutes for unauthenticated access
- Requires a User-Agent header (the app sends `reddit-slideshow-client/1.0`)

### Limitations

- **Rate limiting**: ~10 requests/minute. The app fetches 50 posts per subreddit in a single request, so this is rarely an issue.
- **Private/quarantined subreddits**: Not accessible without authentication.
- **NSFW content**: Available on public subreddits without auth, but filtered by default in app settings.

---

## Optional: Reddit OAuth Setup (for higher rate limits)

If you want higher rate limits (600 requests/10 minutes) or access to private subreddits, you can register an app:

### Step 1: Create a Reddit Account
1. Go to [reddit.com](https://www.reddit.com) and create an account (or log in)

### Step 2: Register an Application
1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
2. Scroll to the bottom and click **"create another app..."**
3. Fill in the form:
   - **name**: `reddit-slideshow` (or any name)
   - **App type**: Select **"web app"**
   - **description**: Optional
   - **about url**: Optional
   - **redirect uri**: `http://localhost:3000/api/auth/callback` (for local dev)
4. Click **"create app"**

### Step 3: Note Your Credentials
After creating the app, you'll see:
- **Client ID**: The string under the app name (e.g., `aB1cD2eF3gH4iJ`)
- **Client Secret**: The secret shown on the page

### Step 4: Configure the App
Create a `.env.local` file in the project root:

```env
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
```

> **Note**: OAuth support is not yet implemented in the app. This section is for future reference.
