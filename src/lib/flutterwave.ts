/**
 * Flutterwave Payment Integration
 *
 * Supports:
 * - M-Pesa (Kenya) — STK Push via mobile_money_kenya
 * - Mobile Money — MTN/Airtel across Africa (Ghana, Uganda, Tanzania, Rwanda, Zambia)
 * - Visa/Mastercard — standard card payments
 *
 * Docs: https://developer.flutterwave.com/reference
 */

import { prisma } from "@/lib/db"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PaymentMethod = "mpesa" | "mobile_money" | "card"

export interface InitiatePaymentParams {
  userId: string
  email: string
  amount: number
  currency: string
  paymentMethod: PaymentMethod
  tier: string
  plan: string
  /** Phone number for mobile money (e.g. 2547XXXXXXXX) */
  phone?: string
  /** Card details for direct card charge */
  card?: {
    number: string
    cvv: string
    expiryMonth: string
    expiryYear: string
  }
  /** Redirect URL for card payments */
  redirectUrl?: string
}

export interface InitiatePaymentResult {
  success: boolean
  /** Internal payment record ID */
  paymentId?: string
  /** Flutterwave transaction reference */
  txRef?: string
  /** Flutterwave transaction ID (after verification) */
  transactionId?: number
  /** For card payments — URL to redirect user to for 3DS/auth */
  authUrl?: string
  /** Error message if failed */
  error?: string
}

export interface VerifyTransactionResult {
  success: boolean
  status: "successful" | "failed" | "pending"
  transactionId?: number
  amount?: number
  currency?: string
  error?: string
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function getConfig() {
  return {
    publicKey: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || process.env.FLW_PUBLIC_KEY || "",
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY || process.env.FLW_SECRET_KEY || "",
    webhookHash: process.env.FLUTTERWAVE_WEBHOOK_SECRET || process.env.FLW_WEBHOOK_HASH || "",
    encryptedKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY || process.env.FLW_ENCRYPTION_KEY || "",
    // Base URL for Flutterwave API
    baseUrl: "https://api.flutterwave.com/v3",
    // Base URL for redirect after card payment
    redirectBase: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  }
}

// ---------------------------------------------------------------------------
// SDK helpers (wraps flutterwave-node-v3)
// ---------------------------------------------------------------------------

function getFlutterwaveInstance() {
  const Flutterwave = require("flutterwave-node-v3")
  const config = getConfig()
  return new Flutterwave(config.publicKey, config.secretKey)
}

// ---------------------------------------------------------------------------
// Configuration check — returns true if Flutterwave credentials are present
// ---------------------------------------------------------------------------

function isConfigured(): boolean {
  return !!(getConfig().secretKey && getConfig().publicKey)
}

// ---------------------------------------------------------------------------
// Initiate Payment
// ---------------------------------------------------------------------------

/**
 * Initiate a payment via Flutterwave based on the selected payment method.
 *
 * For M-Pesa: sends STK Push to the user's phone.
 * For Mobile Money: sends payment request.
 * For Card: creates a card charge (may require 3DS/auth redirect).
 */
export async function initiatePayment(
  params: InitiatePaymentParams,
  /** For testing — inject a mock SDK instead of loading flutterwave-node-v3 */
  sdkOverride?: any
): Promise<InitiatePaymentResult> {
  try {
    const { userId, email, amount, currency, paymentMethod, tier, plan, phone, card, redirectUrl } = params

    // Generate unique transaction reference
    const txRef = `mapato-${userId.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    // Create payment record in DB (pending)
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount,
        currency,
        provider: "flutterwave",
        paymentMethod,
        flutterwaveTxRef: txRef,
        status: "pending",
        tier,
        plan,
        metadata: JSON.stringify({
          phone,
          email,
          initiatedAt: new Date().toISOString(),
        }),
      },
    })

    // ---- Verify Flutterwave is configured ----
    if (!sdkOverride && !isConfigured()) {
      return {
        success: false,
        error: "Flutterwave is not configured. Set FLUTTERWAVE_SECRET_KEY and NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY to process payments.",
      }
    }

    // ---- Call Flutterwave API ----
    const flw = sdkOverride || getFlutterwaveInstance()

    switch (paymentMethod) {
      case "mpesa":
      case "mobile_money": {
        if (!phone) {
          return { success: false, error: "Phone number is required for mobile money payments" }
        }
        // Ensure phone starts with country code
        const formattedPhone = phone.startsWith("+") ? phone.slice(1) : phone.startsWith("0") ? `254${phone.slice(1)}` : phone

        const mobilePayload: Record<string, any> = {
          tx_ref: txRef,
          amount: amount.toString(),
          currency: paymentMethod === "mpesa" ? "KES" : currency,
          payment_options: paymentMethod === "mpesa" ? "mobile_money_kenya" : "mobile_money",
          redirect_url: redirectUrl || `${getConfig().redirectBase}/pricing?payment=success&tx_ref=${txRef}`,
          customer: { email, phonenumber: formattedPhone },
          meta: {
            payment_id: payment.id,
            user_id: userId,
            tier,
            plan,
          },
        }

        // For M-Pesa via Flutterwave, we use the Kenya-specific mobile money method
        let response: any
        if (paymentMethod === "mpesa") {
          response = await flw.MobileMoney.kenya(mobilePayload)
        } else {
          // Generic mobile money — Flutterwave detects by country code
          response = await flw.MobileMoney.mobile_money(mobilePayload)
        }

        if (response.status === "success" || response.status === "pending") {
          return {
            success: true,
            paymentId: payment.id,
            txRef,
          }
        } else {
          // Payment initiation failed — update record
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "failed", metadata: JSON.stringify({ error: response.message }) },
          })
          return { success: false, error: response.message || "Payment initiation failed" }
        }
      }

      case "card": {
        if (!card) {
          return { success: false, error: "Card details are required for card payments" }
        }

        const cardPayload = {
          tx_ref: txRef,
          amount: amount.toString(),
          currency,
          card_number: card.number,
          cvv: card.cvv,
          expiry_month: card.expiryMonth,
          expiry_year: card.expiryYear,
          email,
          redirect_url: redirectUrl || `${getConfig().redirectBase}/pricing?payment=success&tx_ref=${txRef}`,
          meta: {
            payment_id: payment.id,
            user_id: userId,
            tier,
            plan,
          },
        }

        const response = await flw.Charge.card(cardPayload)

        if (response.status === "success") {
          // Card may require 3DS/auth — check for auth URL
          const authUrl = response.meta?.authorization?.redirect || response.meta?.authorization?.url
          if (authUrl) {
            return {
              success: true,
              paymentId: payment.id,
              txRef,
              authUrl,
            }
          }

          // Payment was successful immediately
          await handleSuccessfulPayment(txRef, response.data?.id)
          return {
            success: true,
            paymentId: payment.id,
            txRef,
            transactionId: response.data?.id,
          }
        } else {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "failed", metadata: JSON.stringify({ error: response.message }) },
          })
          return { success: false, error: response.message || "Card payment failed" }
        }
      }

      default:
        return { success: false, error: `Unsupported payment method: ${paymentMethod}` }
    }
  } catch (error: any) {
    console.error("[Flutterwave] Initiate payment error:", error)
    return { success: false, error: error.message || "Failed to initiate payment" }
  }
}

// ---------------------------------------------------------------------------
// Verify Transaction
// ---------------------------------------------------------------------------

/**
 * Verify a Flutterwave transaction by its ID.
 */
export async function verifyTransaction(
  transactionId: number
): Promise<VerifyTransactionResult> {
  try {
    const flw = getFlutterwaveInstance()
    const response = await flw.Transaction.verify({ id: transactionId.toString() })

    if (response.status === "success" && response.data) {
      return {
        success: true,
        status: response.data.status === "successful" ? "successful" : "failed",
        transactionId: response.data.id,
        amount: response.data.amount,
        currency: response.data.currency,
      }
    }

    return { success: false, status: "failed", error: "Verification failed" }
  } catch (error: any) {
    console.error("[Flutterwave] Verify transaction error:", error)
    return { success: false, status: "failed", error: error.message }
  }
}

// ---------------------------------------------------------------------------
// Webhook Handler
// ---------------------------------------------------------------------------

/**
 * Validate Flutterwave webhook signature.
 * Returns true if the request is authentic.
 */
export function validateWebhook(headers: Record<string, string | string[] | undefined>): boolean {
  const config = getConfig()

  const signature = headers["verif-hash"] as string | undefined
  if (!signature || signature !== config.webhookHash) {
    console.error("[Flutterwave] Invalid webhook signature")
    return false
  }

  return true
}

/**
 * Handle a Flutterwave webhook event.
 */
export async function handleWebhookEvent(event: string, data: Record<string, any>): Promise<boolean> {
  try {
    console.log(`[Flutterwave] Webhook event: ${event}`)

    switch (event) {
      case "charge.completed": {
        const txRef = data.tx_ref
        const transactionId = data.id
        const status = data.status

        if (status === "successful") {
          const customerId = data.customer?.id
          await handleSuccessfulPayment(txRef, transactionId, customerId)
          return true
        } else {
          // Payment failed — update record
          await prisma.payment.update({
            where: { flutterwaveTxRef: txRef },
            data: { status: "failed", flutterwaveTxId: transactionId },
          })
          return true
        }
      }

      case "transfer.completed":
        // Could be used for payouts — not needed for now
        return true

      default:
        console.log(`[Flutterwave] Unhandled event: ${event}`)
        return true
    }
  } catch (error) {
    console.error("[Flutterwave] Webhook handler error:", error)
    return false
  }
}

// ---------------------------------------------------------------------------
// Internal: handle successful payment → activate subscription
// ---------------------------------------------------------------------------

async function handleSuccessfulPayment(txRef: string, transactionId: number, customerId?: number | string) {
  // Find the payment record
  const payment = await prisma.payment.findUnique({
    where: { flutterwaveTxRef: txRef },
    include: { user: true },
  })

  if (!payment) {
    console.error(`[Flutterwave] Payment record not found for txRef: ${txRef}`)
    return
  }

  if (payment.status === "success") {
    console.log(`[Flutterwave] Payment ${payment.id} already processed — skipping`)
    return
  }

  // Update payment record
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "success",
      flutterwaveTxId: transactionId,
    },
  })

  // Activate the user's subscription
  const now = new Date()
  const subscriptionEnd = new Date(now)
  subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1) // Monthly

  // Extract phone from payment metadata and save to user profile if present
  let metadata: Record<string, any> = {}
  try { metadata = payment.metadata ? JSON.parse(payment.metadata) : {} } catch {}
  const phone = metadata.phone

  await prisma.user.update({
    where: { id: payment.userId },
    data: {
      subscriptionStatus: "active",
      subscriptionTier: payment.tier || "starter",
      subscriptionPlan: payment.plan || "monthly",
      subscriptionStartsAt: now,
      subscriptionEndsAt: subscriptionEnd,
      // Trial ends when they subscribe
      trialEndsAt: now,
      // Save phone number to user profile if provided during payment
      ...(phone ? { phone } : {}),
      // Save Flutterwave customer ID for tokenized recurring payments
      ...(customerId ? { flutterwaveCustomerId: String(customerId) } : {}),
    },
  })

  // Create a Subscription record (recurring subscription tracking)
  await prisma.subscription.create({
    data: {
      userId: payment.userId,
      tier: payment.tier || "starter",
      plan: payment.plan || "monthly",
      flutterwaveTxRef: payment.flutterwaveTxRef || txRef,
      flutterwaveTxId: transactionId,
      amount: payment.amount,
      currency: payment.currency,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: subscriptionEnd,
    },
  })

  // Log the revenue
  await prisma.revenueEntry.create({
    data: {
      amount: payment.amount,
      type: "setup-fee",
      category: payment.tier || "starter",
      clientName: payment.user.name || payment.user.email,
      date: now,
      note: `Flutterwave payment — ${payment.paymentMethod} (tx: ${transactionId})`,
    },
  })

  console.log(`[Flutterwave] Subscription activated for user ${payment.userId} (${payment.tier})`)
}

// ---------------------------------------------------------------------------
// Check payment status (for frontend polling)
// ---------------------------------------------------------------------------

/**
 * Check if a payment has been processed successfully.
 * Used by the frontend to poll for payment status.
 */
export async function checkPaymentStatus(txRef: string): Promise<{
  status: string
  tier?: string
  plan?: string
}> {
  const payment = await prisma.payment.findUnique({
    where: { flutterwaveTxRef: txRef },
    select: { status: true, tier: true, plan: true },
  })

  if (!payment) {
    return { status: "not-found" }
  }

  return {
    status: payment.status,
    tier: payment.tier || undefined,
    plan: payment.plan || undefined,
  }
}
