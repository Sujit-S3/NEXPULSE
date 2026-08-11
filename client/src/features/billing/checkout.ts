import type { RazorpayCheckoutResult, RazorpayFailure } from "./types";

interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  image?: string;
  prefill: { name: string; email: string; contact?: string };
  theme: { color: string; backdrop_color: string };
  handler: (result: RazorpayCheckoutResult) => void;
  modal: { ondismiss: () => void; escape: boolean; backdropclose: boolean };
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", handler: (failure: RazorpayFailure) => void): void;
}

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let checkoutLoader: Promise<RazorpayConstructor> | undefined;

export function loadRazorpayCheckout(): Promise<RazorpayConstructor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (checkoutLoader) return checkoutLoader;

  checkoutLoader = new Promise<RazorpayConstructor>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    const script = existing ?? document.createElement("script");
    const fail = () => {
      checkoutLoader = undefined;
      reject(new Error("Razorpay Checkout could not be loaded. Check your connection and try again."));
    };
    script.addEventListener("load", () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else fail();
    }, { once: true });
    script.addEventListener("error", fail, { once: true });
    if (!existing) {
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }
  });

  return checkoutLoader;
}
