"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft, Smartphone, CreditCard, Globe, ArrowRight, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PaymentMethod = "mpesa" | "mobile_money" | "card"

interface CheckoutProps {
  tierId: string
  tierName: string
  amount: number
  billingCycle: "monthly" | "yearly"
  onClose: () => void
  onSuccess: () => void
}

interface PaymentState {
  step: "method" | "details" | "processing" | "success" | "error"
  method: PaymentMethod | null
  txRef: string | null
  error: string | null
}

// ---------------------------------------------------------------------------
// Payment method options
// ---------------------------------------------------------------------------

const PAYMENT_METHODS: Array<{
  id: PaymentMethod
  name: string
  description: string
  icon: React.ReactNode
  countries: string
}> = [
  {
    id: "mpesa",
    name: "M-Pesa",
    description: "Pay via M-Pesa STK Push (Kenya)",
    icon: <Smartphone className="h-6 w-6" />,
    countries: "Kenya",
  },
  {
    id: "mobile_money",
    name: "Mobile Money",
    description: "MTN, Airtel, Orange Money & more",
    icon: <Globe className="h-6 w-6" />,
    countries: "Across Africa",
  },
  {
    id: "card",
    name: "Credit / Debit Card",
    description: "Visa, Mastercard, and more",
    icon: <CreditCard className="h-6 w-6" />,
    countries: "Global",
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PaymentCheckout({ tierId, tierName, amount, billingCycle, onClose, onSuccess }: CheckoutProps) {
  const router = useRouter()
  const [payment, setPayment] = useState<PaymentState>({
    step: "method",
    method: null,
    txRef: null,
    error: null,
  })
  const [phone, setPhone] = useState("")
  const [cardDetails, setCardDetails] = useState({
    number: "",
    cvv: "",
    expiryMonth: "",
    expiryYear: "",
  })
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [polling, setPolling] = useState(false)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [])

  // Poll for payment status
  const startPolling = useCallback((txRef: string) => {
    setPolling(true)
    let attempts = 0
    const maxAttempts = 60 // 5 minutes (5s intervals)

    const interval = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/payments/status?tx_ref=${encodeURIComponent(txRef)}`)
        const data = await res.json()

        if (data.status === "success") {
          clearInterval(interval)
          pollingRef.current = null
          setPolling(false)
          setPayment((p) => ({ ...p, step: "success" }))
          setTimeout(() => onSuccess(), 2000)
        } else if (data.status === "failed") {
          clearInterval(interval)
          pollingRef.current = null
          setPolling(false)
          setPayment((p) => ({ ...p, step: "error", error: "Payment failed. Please try again." }))
        } else if (attempts >= maxAttempts) {
          clearInterval(interval)
          pollingRef.current = null
          setPolling(false)
          setPayment((p) => ({ ...p, step: "error", error: "Payment timed out. Check your payment and try again." }))
        }
      } catch {
        // Ignore polling errors — keep trying
      }
    }, 5000)

    pollingRef.current = interval
  }, [onSuccess])

  // Initiate payment
  const handlePay = async () => {
    const method = payment.method
    if (!method) return

    setPayment((p) => ({ ...p, step: "processing", error: null }))

    try {
      const body: Record<string, any> = {
        paymentMethod: method,
        tier: tierId,
        plan: billingCycle,
      }

      if ((method === "mpesa" || method === "mobile_money") && phone) {
        body.phone = phone
      }

      if (method === "card") {
        body.card = cardDetails
      }

      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setPayment((p) => ({ ...p, step: "error", error: data.error || "Payment failed" }))
        return
      }

      if (data.authUrl) {
        // Card requires 3DS redirect
        window.location.href = data.authUrl
        return
      }

      // For mobile money (M-Pesa STK Push), start polling
      if (data.txRef) {
        setPayment((p) => ({ ...p, txRef: data.txRef }))
        startPolling(data.txRef)
      }
    } catch (error: any) {
      setPayment((p) => ({ ...p, step: "error", error: error.message || "Something went wrong" }))
    }
  }

  // Go back to method selection
  const backToMethod = () => {
    setPayment({ step: "method", method: null, txRef: null, error: null })
  }

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16)
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ")
  }

  // -------------------------------------------------------------------
  // Render: Payment Success
  // -------------------------------------------------------------------
  if (payment.step === "success") {
    return (
      <div className="text-center py-8" data-testid="payment-success">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 animate-in zoom-in-50 duration-500" />
          </div>
        </div>
        <h3 className="text-2xl font-bold mb-2">Payment Successful! 🎉</h3>
        <p className="text-muted-foreground mb-4">
          Your {tierName} ({billingCycle}) subscription is now active.
        </p>
        <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
        <div className="mt-6 flex justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------
  // Render: Processing
  // -------------------------------------------------------------------
  if (payment.step === "processing") {
    return (
      <div className="text-center py-8" data-testid="payment-processing">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-primary/10">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          </div>
        </div>
        <h3 className="text-xl font-bold mb-2">Processing Payment</h3>
        <p className="text-muted-foreground mb-2">
          {payment.method === "mpesa"
            ? "An M-Pesa STK Push has been sent to your phone. Enter your PIN to complete payment."
            : payment.method === "mobile_money"
            ? "A payment request has been sent. Check your phone and approve the transaction."
            : "Processing your card payment. Do not close this page."}
        </p>
        <p className="text-sm text-muted-foreground">
          Waiting for confirmation...
        </p>
      </div>
    )
  }

  // -------------------------------------------------------------------
  // Render: Error
  // -------------------------------------------------------------------
  if (payment.step === "error") {
    return (
      <div className="text-center py-8" data-testid="payment-error">
        <div className="flex justify-center mb-6">
          <div className="p-4 rounded-full bg-destructive/10">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        <h3 className="text-xl font-bold mb-2">Payment Failed</h3>
        <p className="text-destructive mb-6">{payment.error}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={backToMethod} data-testid="back-button">
            <ArrowLeft className="h-4 w-4 mr-2" /> Try Again
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------
  // Render: Method Selection
  // -------------------------------------------------------------------
  if (payment.step === "method") {
    return (
      <div className="space-y-6" data-testid="payment-method-selection">
        <div className="text-center mb-2">
          <h3 className="text-xl font-bold">Complete Your Payment</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {tierName} — <strong>${amount}</strong>/{billingCycle === "monthly" ? "mo" : "yr"}
          </p>
        </div>

        <div className="grid gap-3">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => setPayment((p) => ({ ...p, method: method.id, step: "details" }))}
              className="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all text-left group"
            >
              <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {method.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{method.name}</p>
                <p className="text-sm text-muted-foreground">{method.description}</p>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full shrink-0">
                {method.countries}
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </button>
          ))}
        </div>

        <Button variant="ghost" onClick={onClose} className="w-full">
          Cancel
        </Button>
      </div>
    )
  }

  // -------------------------------------------------------------------
  // Render: Payment Details Form
  // -------------------------------------------------------------------
  // M-Pesa / Mobile Money
  if (payment.method === "mpesa" || payment.method === "mobile_money") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={backToMethod} className="p-1 hover:bg-muted rounded-lg transition-colors" data-testid="back-button">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h3 className="text-lg font-bold">
              {payment.method === "mpesa" ? "Pay with M-Pesa" : "Pay with Mobile Money"}
            </h3>
            <p className="text-sm text-muted-foreground">
              ${amount} — {tierName} ({billingCycle})
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="2547XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))}
              className="h-12 text-lg"
            />
            <p className="text-xs text-muted-foreground">
              Enter your phone number with country code (e.g., 2547XXXXXXXX for Kenya)
            </p>
          </div>

          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-sm">
              {payment.method === "mpesa"
                ? "You'll receive an M-Pesa STK Push on your phone. Enter your PIN to complete the payment."
                : "You'll receive a payment request on your phone. Follow the prompts to complete the transaction."}
            </p>
          </div>

          <Button
            onClick={handlePay}
            disabled={phone.length < 10}
            className="w-full h-12 text-base"
          >
            <Smartphone className="h-5 w-5 mr-2" />
            Pay ${amount} via {payment.method === "mpesa" ? "M-Pesa" : "Mobile Money"}
          </Button>
        </div>
      </div>
    )
  }

  // Card payment
  if (payment.method === "card") {
    const currentYear = new Date().getFullYear() % 100
    const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"))
    const years = Array.from({ length: 10 }, (_, i) => String(currentYear + i))

    return (
      <div className="space-y-6" data-testid="card-payment-form">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={backToMethod} className="p-1 hover:bg-muted rounded-lg transition-colors" data-testid="back-button">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h3 className="text-lg font-bold">Pay with Card</h3>
            <p className="text-sm text-muted-foreground">
              ${amount} — {tierName} ({billingCycle})
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cardNumber">Card Number</Label>
            <Input
              id="cardNumber"
              placeholder="4242 4242 4242 4242"
              value={cardDetails.number}
              onChange={(e) =>
                setCardDetails((c) => ({ ...c, number: formatCardNumber(e.target.value) }))
              }
              className="h-12 text-lg font-mono"
              maxLength={19}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expiry</Label>
              <div className="flex gap-2">
                <select
                  value={cardDetails.expiryMonth}
                  onChange={(e) => setCardDetails((c) => ({ ...c, expiryMonth: e.target.value }))}
                  className="flex-1 h-12 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">MM</option>
                  {months.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  value={cardDetails.expiryYear}
                  onChange={(e) => setCardDetails((c) => ({ ...c, expiryYear: e.target.value }))}
                  className="flex-1 h-12 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">YY</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                type="text"
                placeholder="123"
                value={cardDetails.cvv}
                onChange={(e) =>
                  setCardDetails((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))
                }
                className="h-12 text-lg font-mono"
                maxLength={4}
              />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-xs text-muted-foreground">
              Your card details are processed securely via Flutterwave. We never store full card numbers.
            </p>
          </div>

          <Button
            onClick={handlePay}
            disabled={
              cardDetails.number.replace(/\s/g, "").length < 16 ||
              !cardDetails.expiryMonth ||
              !cardDetails.expiryYear ||
              cardDetails.cvv.length < 3
            }
            className="w-full h-12 text-base"
            data-testid="pay-button"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Pay ${amount} via Card
          </Button>
        </div>
      </div>
    )
  }

  return null
}

