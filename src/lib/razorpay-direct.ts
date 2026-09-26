import { ADRIZO_LOGO_DATA_URI } from '@/lib/brand-logo';

export interface LaunchRazorpayOptions {
  items: Array<{
    productId: string;
    size?: string;
    color?: string;
    quantity: number;
    name?: string;
    price: number;
    categorySlug?: string;
    categoryName?: string;
    category?: any;
    isFree?: boolean;
    promotionRule?: string;
    parentId?: string;
    promoGroupId?: string;
    sku?: string;
  }>;
  paymentMethod?: 'ONLINE_RAZORPAY' | 'COD';
  couponCode?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  onSuccess: (data: {
    orderId: string;
    orderNumber: string;
    total: number;
    paymentMethod: string;
    shippingAddress?: string;
    codConfirmationPaid?: number;
    codRemaining?: number;
  }) => void;
  onDismiss?: () => void;
  onError?: (errorMessage: string) => void;
}

export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/magic-checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => {
      const fallback = document.createElement('script');
      fallback.src = 'https://checkout.razorpay.com/v1/checkout.js';
      fallback.onload = () => resolve(true);
      fallback.onerror = () => resolve(false);
      document.body.appendChild(fallback);
    };
    document.body.appendChild(script);
  });
};

export async function launchRazorpayCheckout({
  items,
  paymentMethod = 'ONLINE_RAZORPAY',
  couponCode,
  customer,
  onSuccess,
  onDismiss,
  onError,
}: LaunchRazorpayOptions) {
  try {
    const payload = {
      items,
      isMagicCheckout: true,
      paymentMethod: paymentMethod === 'COD' ? 'COD' : 'ONLINE_RAZORPAY',
      couponCode,
      customer,
    };

    const res = await fetch('/api/checkout/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.success) {
      onError?.(data.error || 'Failed to initialize payment.');
      return;
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      onError?.('Failed to load secure Razorpay gateway. Please check your internet connection.');
      return;
    }

    const isCod = paymentMethod === 'COD';
    const codAdvance = data.codConfirmationAmount || 99;
    const contactToPrefill = data.customer?.phone || customer?.phone || '';
    const emailToPrefill = data.customer?.email || customer?.email || '';
    const nameToPrefill = data.customer?.name || customer?.name || '';

    const options = {
      key: data.key,
      amount: data.amount,
      currency: data.currency || 'INR',
      name: 'ADRIZO',
      description: isCod 
        ? `Order #${data.orderNumber} (₹${codAdvance} COD Advance Confirmation)`
        : `Order #${data.orderNumber}`,
      image: ADRIZO_LOGO_DATA_URI,
      order_id: data.razorpayOrderId,
      one_click_checkout: true,
      remember_customer: true,
      features: {
        cardsaving: true,
      },
      prefill: {
        name: nameToPrefill || undefined,
        email: emailToPrefill || undefined,
        contact: contactToPrefill || undefined,
      },
      notes: {
        orderNumber: data.orderNumber,
        type: isCod ? 'COD_CONFIRMATION' : 'ONLINE_PREPAID',
        customerName: nameToPrefill,
        customerPhone: contactToPrefill,
      },
      theme: {
        color: '#09090b',
      },
      handler: async function (response: any) {
        try {
          const verifyRes = await fetch('/api/checkout/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: data.orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            onSuccess({
              orderId: data.orderId,
              orderNumber: data.orderNumber,
              total: data.total || (isCod ? data.amount / 100 : data.amount / 100),
              paymentMethod,
              shippingAddress: verifyData.shippingAddress || 'Confirmed via Razorpay Checkout',
              codConfirmationPaid: isCod ? 99 : undefined,
              codRemaining: isCod ? data.codRemainingAmount : 0,
            });
          } else {
            onError?.(verifyData.error || 'Payment verification failed.');
          }
        } catch (err: any) {
          onError?.(err.message || 'Verification Error');
        }
      },
      modal: {
        ondismiss: function () {
          onDismiss?.();
        },
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', function (response: any) {
      const reason = response.error?.description || response.error?.reason || 'Payment failed.';
      onError?.(reason);
    });

    rzp.open();
  } catch (err: any) {
    onError?.(err.message || 'An unexpected error occurred while launching Razorpay.');
  }
}
