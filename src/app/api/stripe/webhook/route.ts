import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription && session.customer) {
        await db
          .update(subscriptions)
          .set({
            stripeSubscriptionId: session.subscription as string,
            status: "active",
            updatedAt: new Date(),
          })
          .where(
            eq(subscriptions.stripeCustomerId, session.customer as string),
          );
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as any as Stripe.Invoice;
      const invoiceData = invoice as Stripe.Invoice & {
        subscription?: string;
        customer?: string;
      };
      if (invoiceData.subscription && invoiceData.customer) {
        const sub = (await stripe.subscriptions.retrieve(
          invoiceData.subscription as string,
        )) as unknown as Stripe.Subscription & { current_period_end: number };
        await db
          .update(subscriptions)
          .set({
            status: "active",
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            stripePriceId: sub.items.data[0]?.price?.id ?? null,
            updatedAt: new Date(),
          })
          .where(
            eq(subscriptions.stripeCustomerId, invoice.customer as string),
          );
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as unknown as Stripe.Subscription & {
        current_period_end: number;
      };
      await db
        .update(subscriptions)
        .set({
          status: sub.status,
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await db
        .update(subscriptions)
        .set({
          status: "canceled",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
