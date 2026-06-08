import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  checkRateLimit,
  RateLimitError,
  ipFromRequest,
} from "@/lib/rate-limiter";

export async function POST(req: NextRequest) {
  // ── Rate limiting ────────────────────────────────────────
  // Defense in depth: rate limit webhook requests before any processing.
  // The proxy.ts middleware also applies limits, but this ensures the
  // route is protected even if called directly (e.g., in tests).
  try {
    const ip = ipFromRequest(req);
    checkRateLimit(ip, {
      pathPrefix: "/api/webhooks/flutterwave",
      max: 30,
      windowMs: 60_000,
    });
  } catch (err) {
    if (err instanceof RateLimitError) {
      console.error("[Flutterwave] Rate limit exceeded");
      return NextResponse.json(
        {
          error: "Too many requests. Please slow down.",
          retryAfter: err.retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": String(err.retryAfter) },
        }
      );
    }
    // Re-throw unexpected errors so they surface as 500 instead of being silently swallowed
    throw err;
  }

  const webhookSecret = process.env.FLUTTERWAVE_WEBHOOK_SECRET || process.env.FLW_WEBHOOK_HASH || "";
  if (!webhookSecret) {
    console.error("[Flutterwave] Missing webhook secret");
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("verif-hash") || "";

  // Flutterwave sends the webhook secret as a plain verif-hash header (not HMAC)
  if (signature !== webhookSecret) {
    console.error("[Flutterwave] Invalid webhook signature");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: { event?: string; data?: Record<string, any> };
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    console.error("[Flutterwave] Failed to parse webhook payload", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const eventType = event.event || "";
  const data = event.data || {};

  if (eventType === "charge.completed") {
    const txRef = data.tx_ref as string | undefined;
    const status = (data.status as string | undefined)?.toLowerCase() || "";
    const amount = typeof data.amount === "number" ? data.amount : undefined;
    const transactionId = typeof data.id === "number" ? data.id : undefined;

    if (!txRef) {
      return NextResponse.json({ error: "Missing tx_ref" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { flutterwaveTxRef: txRef },
      include: { user: true },
    });

    if (!payment) {
      console.error(`[Flutterwave] Payment not found for tx_ref=${txRef}`);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "PENDING") {
      return NextResponse.json({ message: "Already processed" });
    }

    if (amount !== undefined && payment.amount !== amount) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", metadata: JSON.stringify({ error: "Amount mismatch" }) },
      });
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    if (status === "successful") {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESSFUL",
          flutterwaveTxId: transactionId,
          metadata: JSON.stringify({
            ...(typeof payment.metadata === "string" ? JSON.parse(payment.metadata) : payment.metadata || {}),
            processedAt: now.toISOString(),
          }),
        },
      });

      let tier = payment.tier || "starter";
      const plan = payment.plan || "monthly";

      // Extract Flutterwave customer ID for tokenized recurring payments
      const customerId = data.customer?.id;

      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          subscriptionTier: tier,
          subscriptionStatus: "active",
          subscriptionPlan: plan,
          subscriptionStartsAt: now,
          subscriptionEndsAt: periodEnd,
          trialStartsAt: null,
          trialEndsAt: null,
          ...(customerId ? { flutterwaveCustomerId: String(customerId) } : {}),
        },
      });

      await prisma.subscription.create({
        data: {
          userId: payment.userId,
          tier,
          plan,
          flutterwaveTxRef: txRef,
          flutterwaveTxId: transactionId ?? undefined,
          amount: payment.amount,
          currency: payment.currency,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
    }
  }

  return NextResponse.json({ received: true });
}
