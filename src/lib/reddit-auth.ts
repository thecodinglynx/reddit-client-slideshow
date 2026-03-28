let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getRedditAccessToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  // If no Reddit app credentials configured, fall back to unauthenticated
  if (!clientId || !clientSecret) return null;

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "reddit-slideshow/1.0",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) return null;

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

export async function redditFetch(path: string): Promise<Response> {
  const token = await getRedditAccessToken();

  if (token) {
    // Authenticated: use oauth.reddit.com
    return fetch(`https://oauth.reddit.com${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "reddit-slideshow/1.0",
      },
      cache: "no-store",
    });
  }

  // Fallback: unauthenticated via www.reddit.com (works locally, may 403 on cloud)
  return fetch(`https://www.reddit.com${path}`, {
    headers: {
      "User-Agent": "reddit-slideshow/1.0",
    },
    cache: "no-store",
  });
}
