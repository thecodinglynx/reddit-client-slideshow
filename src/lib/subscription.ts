import { db } from "./db";
import { subscriptions } from "./db/schema";
import { eq } from "drizzle-orm";

export async function getUserSubscription(userId: string) {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

export function isSubscriptionActive(
  sub: { status: string; currentPeriodEnd: Date | null } | null
): boolean {
  if (!sub) return false;
  if (sub.status !== "active" && sub.status !== "trialing") return false;
  if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return false;
  return true;
}
