import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserSubscription, isSubscriptionActive } from "@/lib/subscription";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await getUserSubscription(session.user.id);

  return NextResponse.json({
    subscription: sub
      ? {
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
          isPremium: isSubscriptionActive(sub),
        }
      : null,
  });
}
