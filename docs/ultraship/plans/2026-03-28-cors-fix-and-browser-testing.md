# CORS Fix & Browser Testing Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use ultraship:subagent-driven-development (recommended) or ultraship:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the CORS error blocking Reddit API calls, then use Playwright MCP browser tools to click through the entire UI, identify issues, and fix them.

**Architecture:** Move Reddit API fetching from client-side to a Next.js API route (`/api/reddit`) that proxies requests server-side, bypassing CORS restrictions. Then use Playwright to navigate to http://localhost:3000, interact with settings, start the slideshow, and verify media renders correctly.

**Tech Stack:** Next.js API routes (App Router), Playwright MCP browser tools

---

### Task 1: Create the Reddit API proxy route

**Files:**
- Create: `src/app/api/reddit/route.ts`

- [ ] **Step 1: Create the API route**

```typescript
// src/app/api/reddit/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const subreddit = searchParams.get("subreddit");
  const sort = searchParams.get("sort") || "hot";
  const limit = searchParams.get("limit") || "50";
  const t = searchParams.get("t") || "day";
  const after = searchParams.get("after") || "";
  const raw_json = "1";

  if (!subreddit) {
    return NextResponse.json({ error: "subreddit is required" }, { status: 400 });
  }

  const params = new URLSearchParams({ limit, raw_json });
  if (sort === "top") params.set("t", t);
  if (after) params.set("after", after);

  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/${sort}.json?${params}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "reddit-slideshow-client/1.0 (server-proxy)" },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Reddit API error: ${res.status}` },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Verify route compiles**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

---

### Task 2: Update client to use the proxy

**Files:**
- Modify: `src/lib/reddit.ts:139-188` (the `fetchSubredditMedia` function)

- [ ] **Step 1: Change fetch URL from Reddit direct to local API proxy**

Replace the fetch call in `fetchSubredditMedia` to use `/api/reddit` instead of `https://www.reddit.com/r/...`. Remove the `User-Agent` header (not needed for same-origin).

```typescript
const params = new URLSearchParams({
  subreddit,
  sort,
  limit: String(limit),
});
if (sort === "top") {
  params.set("t", topTimeframe);
}
if (after) {
  params.set("after", after);
}

const url = `/api/reddit?${params}`;

const res = await fetch(url);
```

- [ ] **Step 2: Build to verify no type errors**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

---

### Task 3: Browser test — Settings panel renders

**Tools:** Playwright MCP

- [ ] **Step 1: Navigate to http://localhost:3000**

Use `browser_navigate` to `http://localhost:3000`

- [ ] **Step 2: Take snapshot, verify settings panel is visible**

Use `browser_snapshot` to confirm:
- Settings panel heading "Settings" is visible
- Default subreddit tags (earthporn, pics, itookapicture) are shown
- Sort order buttons (hot, new, top, rising) are visible
- "Apply & Start" button is present

---

### Task 4: Browser test — Add/remove subreddits

- [ ] **Step 1: Remove a default subreddit**

Click the × button on one of the existing subreddit tags.

- [ ] **Step 2: Add a custom subreddit**

Click the subreddit text input, type "aww", press Enter. Verify the tag appears.

- [ ] **Step 3: Take snapshot to confirm subreddit list is correct**

---

### Task 5: Browser test — Start slideshow and verify media loads

- [ ] **Step 1: Click "Apply & Start"**

Click the button. Wait for network activity to complete (loading indicator should disappear).

- [ ] **Step 2: Take snapshot of slideshow**

Verify:
- A media item (image or video) is visible
- The post title and metadata overlay is shown (subreddit, author, score)
- The progress bar at the bottom is present
- The navigation controls (prev, play/pause, next, settings) are visible

- [ ] **Step 3: Check console for errors**

Use `browser_console_messages` to check for:
- JavaScript errors
- Failed network requests
- CORS errors (should be gone now)

---

### Task 6: Browser test — Navigation controls

- [ ] **Step 1: Click next button, verify slide changes**

Use `browser_click` on the next button. Take snapshot to confirm a different post title appears.

- [ ] **Step 2: Click previous button, verify it goes back**

Click prev. Snapshot to confirm original title re-appears.

- [ ] **Step 3: Click play/pause, verify it toggles**

Click the play/pause button. The icon should change from pause (two bars) to play (triangle).

---

### Task 7: Browser test — Reopen settings

- [ ] **Step 1: Click settings gear icon**

Click the gear icon in the bottom controls.

- [ ] **Step 2: Verify settings panel opens with current settings preserved**

Snapshot to confirm the panel shows the previously configured subreddits and sort order.

- [ ] **Step 3: Change sort order to "top", verify timeframe selector appears**

Click "top" sort button. Snapshot to confirm the "Time Period" section appears with hour/day/week/month/year/all options.

---

### Task 8: Fix any issues found during testing

- [ ] **Step 1: Review all console errors and visual issues from Tasks 3-7**
- [ ] **Step 2: Fix each issue identified**
- [ ] **Step 3: Re-test with Playwright to confirm fixes**
