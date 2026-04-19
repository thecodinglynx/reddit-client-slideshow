import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type Stripe from "stripe";
import type { NextRequest } from "next/server";

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: vi.fn() },
    subscriptions: { retrieve: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  subscriptions: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => ({})),
}));

const { POST } = await import("@/app/api/stripe/webhook/route");
const { stripe } = await import("@/lib/stripe");
const { db } = await import("@/lib/db");

const mockedStripe = stripe as unknown as {
  webhooks: {
    constructEvent: ReturnType<typeof vi.fn>;
  };
  subscriptions: {
    retrieve: ReturnType<typeof vi.fn>;
  };
};

const mockedDb = db as unknown as {
  update: ReturnType<typeof vi.fn>;
};

describe("Stripe webhook route", () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    vi.clearAllMocks();
  });

  it("handles invoice.paid events and updates subscription state", async () => {
    const event = {
      type: "invoice.paid",
      data: {
        object: {
          subscription: "sub_123",
          customer: "cus_123",
        },
      },
    } as Stripe.Event;

    mockedStripe.webhooks.constructEvent.mockReturnValue(event);
    mockedStripe.subscriptions.retrieve.mockResolvedValue({
      id: "sub_123",
      current_period_end: 1700000000,
      items: {
        data: [
          {
            price: { id: "price_123" },
          },
        ],
      },
    } as unknown as Stripe.Subscription);

    const request = {
      text: async () => "raw-body",
      headers: { get: vi.fn(() => "stripe-signature") },
    } as unknown as NextRequest;

    const response = await POST(request);

    expect(response?.status).toBe(200);
    expect(mockedStripe.subscriptions.retrieve).toHaveBeenCalledWith("sub_123");
    expect(mockedDb.update).toHaveBeenCalled();
  });
});
