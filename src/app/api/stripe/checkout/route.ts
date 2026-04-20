import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId || !stripe) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 },
    );
  }

  // Check for existing Stripe customer
  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, session.user.id))
    .limit(1);

  let customerId = existing[0]?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      metadata: { userId: session.user.id },
    });
    customerId = customer.id;

    await db.insert(subscriptions).values({
      userId: session.user.id,
      stripeCustomerId: customerId,
      status: "inactive",
    });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account?canceled=true`,
    metadata: { userId: session.user.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
