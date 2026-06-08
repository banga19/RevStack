"use client";

import { Component, createRef } from "react";

export interface FlutterwaveCheckoutProps {
  publicKey: string;
  tx_ref: string;
  amount: number;
  currency: string;
  payment_options: string;
  customer: {
    email: string;
    name: string;
    phone_number: string;
  };
  customizations: {
    title: string;
    description: string;
    logo?: string;
  };
  meta?: Record<string, any>;
  onSuccess: (response: any) => void;
  onClose: () => void;
}

export default class FlutterwaveCheckout extends Component<FlutterwaveCheckoutProps> {
  private buttonRef = createRef<HTMLButtonElement>();

  componentDidMount() {
    this.loadScript();
  }

  private loadScript() {
    if (typeof window === "undefined") return;
    const existing = document.querySelector('script[src="https://checkout.flutterwave.com/v3.js"]');
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://checkout.flutterwave.com/v3.js";
      script.async = true;
      document.body.appendChild(script);
    }
    (window as any).FlutterwaveCheckout ||= {
      init: () => {},
      open: () => {},
      close: () => {},
    };
  }

  handlePay = () => {
    const {
      publicKey,
      tx_ref,
      amount,
      currency,
      payment_options,
      customer,
      customizations,
      meta,
      onSuccess,
      onClose,
    } = this.props;

    const handler = (window as any).FlutterwaveCheckout;
    if (!handler) {
      console.error("Flutterwave checkout not loaded");
      onClose();
      return;
    }

    handler.init({
      public_key: publicKey,
      tx_ref,
      amount,
      currency,
      payment_options,
      customer,
      customizations,
      meta,
      callback: (response: any) => {
        onSuccess(response);
      },
      onClose,
    });
    handler.open();
    handler.showPaymentButton();
  };

  render() {
    const { amount, currency } = this.props;
    return (
      <button
        ref={this.buttonRef}
        onClick={this.handlePay}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
      >
        Pay {currency === "KES" ? `KES ${amount}` : `$${amount}`}
      </button>
    );
  }
}
