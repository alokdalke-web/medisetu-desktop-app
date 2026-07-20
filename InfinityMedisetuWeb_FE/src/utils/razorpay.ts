// src/utils/razorpay.ts - Shared Razorpay payment utility for subscriptions and add-ons

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOptions {
  keyId: string;
  amount: number;
  currency: string;
  orderId: string;
  description: string;
  planId?: string;
  planName?: string;
  addOnId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PaymentResult {
  success: boolean;
  orderId?: string;
  paymentId?: string;
  signature?: string;
  paymentMethod?: string;
  error?: string;
}

const SCRIPT_LOAD_TIMEOUT_MS = 10000;

export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      resolve(false);
    };

    document.body.appendChild(script);
  });
};

const loadRazorpayScriptWithTimeout = (): Promise<boolean> => {
  const timeout = new Promise<boolean>((resolve) => {
    setTimeout(() => resolve(false), SCRIPT_LOAD_TIMEOUT_MS);
  });

  return Promise.race([loadRazorpayScript(), timeout]);
};

export const processRazorpayPayment = async (
  options: RazorpayOptions
): Promise<PaymentResult> => {
  const scriptLoaded = await loadRazorpayScriptWithTimeout();

  if (!scriptLoaded) {
    return {
      success: false,
      error: "Payment gateway could not be loaded",
    };
  }

  return new Promise((resolve) => {
    const razorpayOptions: any = {
      key: options.keyId,
      amount: options.amount,
      currency: options.currency,
      name: "Infinity Medisetu",
      description: options.description,
      order_id: options.orderId,
      theme: {
        color: "#0D9488",
      },
      modal: {
        ondismiss: () => {
          resolve({
            success: false,
            error: "Payment cancelled by user",
          });
        },
      },
      handler: (response: any) => {
        const paymentMethod = response.method || "online";
        resolve({
          success: true,
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
          paymentMethod: paymentMethod,
        });
      },
    };

    if (options.customerName || options.customerEmail || options.customerPhone) {
      razorpayOptions.prefill = {};
      if (options.customerName) razorpayOptions.prefill.name = options.customerName;
      if (options.customerEmail) razorpayOptions.prefill.email = options.customerEmail;
      if (options.customerPhone) razorpayOptions.prefill.contact = options.customerPhone;
    }

    try {
      const razorpay = new window.Razorpay(razorpayOptions);
      razorpay.open();
    } catch (_error) {
      resolve({
        success: false,
        error: "Failed to initialize payment gateway",
      });
    }
  });
};
