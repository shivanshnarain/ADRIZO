"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CodSuccessModal from '@/components/CodSuccessModal';
import { ADRIZO_LOGO_DATA_URI } from '@/lib/brand-logo';
import { calculateCheckoutTotals, PaymentMode, getItemCategoryType } from '@/lib/checkout-engine';
import { 
  ShoppingBag, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  Lock, 
  Tag, 
  Gift, 
  AlertCircle, 
  CreditCard, 
  Truck, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface BuyNowItem {
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  image: string;
  size: string;
  color: string;
  quantity: number;
  sku?: string;
  maxStock?: number;
  categorySlug?: string;
  categoryName?: string;
  category?: { id?: string; name?: string; slug?: string } | null;
}

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, clearCart } = useCart();
  const { user } = useAuth();

  const isBuyNowMode = searchParams.get('buyNow') === '1';

  // Buy Now item state
  const [buyNowItem, setBuyNowItem] = useState<BuyNowItem | null>(null);
  const [loadingBuyNow, setLoadingBuyNow] = useState(isBuyNowMode);

  // Payment Selection: ONLINE_RAZORPAY (default, ₹50 discount) vs COD (₹99 advance)
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<PaymentMode>('ONLINE_RAZORPAY');

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    type?: string;
    value?: number;
  } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);

  // Processing & Error states
  const [processing, setProcessing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const isSubmittingRef = useRef(false);

  // Confirmed Order Modal
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderNumber: string;
    total: number;
    codConfirmationPaid?: number;
    codRemaining?: number;
    address: string;
    paymentMethod: string;
  } | null>(null);

  // Load Buy Now item from sessionStorage
  useEffect(() => {
    if (isBuyNowMode && typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('adrizo_buy_now');
        if (stored) {
          setBuyNowItem(JSON.parse(stored));
        }
      } catch (err) {
        console.error('Failed to load buy now item', err);
      } finally {
        setLoadingBuyNow(false);
      }
    } else {
      setLoadingBuyNow(false);
    }
  }, [isBuyNowMode]);

  // Unified items list
  const checkoutItems = useMemo(() => {
    if (isBuyNowMode && buyNowItem) {
      return [{
        id: `${buyNowItem.productId}-${buyNowItem.size}`,
        productId: buyNowItem.productId,
        name: buyNowItem.name,
        productName: buyNowItem.name,
        price: buyNowItem.price,
        originalPrice: buyNowItem.originalPrice || buyNowItem.price,
        image: buyNowItem.image,
        productImage: buyNowItem.image,
        size: buyNowItem.size,
        color: buyNowItem.color,
        quantity: buyNowItem.quantity || 1,
        sku: buyNowItem.sku,
        categorySlug: buyNowItem.categorySlug || buyNowItem.category?.slug,
        categoryName: buyNowItem.categoryName || buyNowItem.category?.name,
        category: buyNowItem.category,
      }];
    }

    return cart.map(item => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      productName: item.name,
      price: item.price > 0 ? item.price : (item.originalPrice || item.price),
      originalPrice: item.originalPrice || item.price,
      image: item.image,
      productImage: item.image,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      sku: item.sku,
      categorySlug: item.categorySlug || item.category?.slug,
      categoryName: item.categoryName || item.category?.name,
      category: item.category,
    }));
  }, [isBuyNowMode, buyNowItem, cart]);

  // Authoritative calculations for both payment modes
  const onlineTotals = useMemo(() => {
    return calculateCheckoutTotals({
      items: checkoutItems,
      paymentMode: 'ONLINE_RAZORPAY',
      couponDiscount: appliedCoupon?.discount || 0,
    });
  }, [checkoutItems, appliedCoupon]);

  const codTotals = useMemo(() => {
    return calculateCheckoutTotals({
      items: checkoutItems,
      paymentMode: 'COD',
      couponDiscount: appliedCoupon?.discount || 0,
    });
  }, [checkoutItems, appliedCoupon]);

  const activeTotals = selectedPaymentMode === 'COD' ? codTotals : onlineTotals;

  // Coupon application handler
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    setValidatingCoupon(true);
    setCouponError('');

    try {
      const res = await fetch('/api/checkout/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: code,
          subtotal: onlineTotals.subtotalAfterBundles,
          items: checkoutItems,
          customerEmail: user?.email,
          customerPhone: user?.phone,
          userId: user?.id,
        }),
      });

      const data = await res.json();
      if (data.valid && data.coupon) {
        setAppliedCoupon({
          code: data.coupon.code,
          discount: data.discount,
          type: data.coupon.type,
          value: data.coupon.value,
        });
        setCouponInput('');
      } else {
        setCouponError(data.error || 'Invalid promotion code.');
      }
    } catch (err: any) {
      setCouponError(err.message || 'Failed to apply coupon.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  // Load Razorpay Script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/magic-checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => {
        // Fallback to standard checkout.js if magic fails to load
        const fallback = document.createElement('script');
        fallback.src = 'https://checkout.razorpay.com/v1/checkout.js';
        fallback.onload = () => resolve(true);
        fallback.onerror = () => resolve(false);
        document.body.appendChild(fallback);
      };
      document.body.appendChild(script);
    });
  };

  // Launch Razorpay directly for selected payment mode
  const handleLaunchPayment = async (paymentMode: PaymentMode) => {
    if (checkoutItems.length === 0) {
      setOrderError('Your cart is empty. Please add products to proceed.');
      return;
    }

    if (isSubmittingRef.current || processing) return;
    isSubmittingRef.current = true;
    setProcessing(true);
    setOrderError('');

    try {
      const payload = {
        items: checkoutItems.map(it => ({
          productId: it.productId,
          size: it.size,
          color: it.color,
          quantity: it.quantity,
          name: it.name,
          price: it.price,
          categorySlug: it.categorySlug,
          categoryName: it.categoryName,
          category: it.category,
        })),
        isMagicCheckout: true,
        paymentMethod: paymentMode === 'COD' ? 'COD' : 'ONLINE_RAZORPAY',
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        customer: {
          name: user?.name || undefined,
          email: user?.email || undefined,
          phone: user?.phone || undefined,
        },
      };

      const res = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        setOrderError(data.error || 'Failed to initialize payment order. Please try again.');
        isSubmittingRef.current = false;
        setProcessing(false);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setOrderError('Failed to load secure Razorpay gateway. Please check your internet connection.');
        isSubmittingRef.current = false;
        setProcessing(false);
        return;
      }

      const contactToPrefill = data.customer?.phone || user?.phone || '';
      const emailToPrefill = data.customer?.email || user?.email || '';
      const nameToPrefill = data.customer?.name || user?.name || '';

      const isCod = paymentMode === 'COD';

      const options = {
        key: data.key,
        amount: data.amount, // 9900 paise for COD, or discounted total for online
        currency: data.currency || 'INR',
        name: 'ADRIZO',
        description: isCod 
          ? `Order #${data.orderNumber} (₹99 COD Advance Confirmation)`
          : `Order #${data.orderNumber}`,
        image: ADRIZO_LOGO_DATA_URI,
        order_id: data.razorpayOrderId,
        one_click_checkout: true,
        remember_customer: true,
        features: {
          cardsaving: true,
          truecaller_login: true,
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
              if (isBuyNowMode && typeof window !== 'undefined') {
                sessionStorage.removeItem('adrizo_buy_now');
              } else {
                clearCart();
              }
              setProcessing(false);
              isSubmittingRef.current = false;

              setConfirmedOrder({
                orderNumber: data.orderNumber || data.orderId,
                total: data.total || (isCod ? data.amount / 100 : onlineTotals.amountPayableNow),
                codConfirmationPaid: isCod ? 99 : undefined,
                codRemaining: isCod ? data.codRemainingAmount : 0,
                address: verifyData.shippingAddress || 'Confirmed via Razorpay Checkout',
                paymentMethod: isCod ? 'COD' : 'ONLINE_RAZORPAY',
              });
            } else {
              setProcessing(false);
              isSubmittingRef.current = false;
              router.push(`/order-failure?orderId=${data.orderId}&orderNumber=${data.orderNumber}&reason=${encodeURIComponent(verifyData.error || 'Signature Verification Failed')}`);
            }
          } catch (err: any) {
            setProcessing(false);
            isSubmittingRef.current = false;
            router.push(`/order-failure?orderId=${data.orderId}&orderNumber=${data.orderNumber}&reason=${encodeURIComponent(err.message || 'Verification Error')}`);
          }
        },
        modal: {
          ondismiss: function () {
            isSubmittingRef.current = false;
            setProcessing(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        isSubmittingRef.current = false;
        setProcessing(false);
        const reason = response.error?.description || response.error?.reason || 'Payment failed.';
        router.push(`/order-failure?orderId=${data.orderId}&orderNumber=${data.orderNumber}&reason=${encodeURIComponent(reason)}`);
      });

      rzp.open();
    } catch (err: any) {
      setOrderError(err.message || 'An unexpected error occurred while launching payment.');
      isSubmittingRef.current = false;
      setProcessing(false);
    }
  };

  if (loadingBuyNow) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <RefreshCw className="animate-spin" size={32} />
      </div>
    );
  }

  if (checkoutItems.length === 0 && !confirmedOrder) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
        <ShoppingBag size={56} strokeWidth={1.5} style={{ margin: '0 auto 1.5rem', opacity: 0.35 }} />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#09090b' }}>Your checkout is empty</h2>
        <p style={{ color: '#71717a', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          Explore our collection and add T-shirts or Hoodies to activate automatic bundle savings.
        </p>
        <Link 
          href="/" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            background: '#09090b', 
            color: '#ffffff', 
            padding: '0.75rem 1.5rem', 
            borderRadius: '9999px', 
            fontWeight: 700, 
            textDecoration: 'none' 
          }}
        >
          <span>Continue Shopping</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '780px', margin: '0 auto', padding: '1.5rem 1rem 4rem', boxSizing: 'border-box' }}>
      
      {/* Sleek Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.25rem', borderBottom: '1px solid #e4e4e7', marginBottom: '1.5rem' }}>
        <Link 
          href={isBuyNowMode ? '/' : '#'} 
          onClick={(e) => {
            if (!isBuyNowMode) {
              e.preventDefault();
              router.back();
            }
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#71717a', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}
        >
          <ArrowLeft size={16} />
          <span>{isBuyNowMode ? 'Return to Shop' : 'Return to Cart'}</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', fontSize: '0.8rem', fontWeight: 800, background: '#f0fdf4', padding: '0.3rem 0.75rem', borderRadius: '9999px', border: '1px solid #bbf7d0' }}>
          <ShieldCheck size={16} />
          <span>Secure Razorpay Checkout</span>
        </div>
      </div>

      {/* Error alert if any */}
      {orderError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{orderError}</span>
        </div>
      )}

      {/* 1. ORDER SUMMARY CARD */}
      <div style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#09090b' }}>
            <ShoppingBag size={18} /> Order Summary ({activeTotals.unitItems.length} Item{activeTotals.unitItems.length > 1 ? 's' : ''})
          </h3>
          {isBuyNowMode && (
            <span style={{ fontSize: '0.725rem', fontWeight: 800, background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.55rem', borderRadius: '9999px', border: '1px solid #fde68a' }}>
              ⚡ Buy Now Order
            </span>
          )}
        </div>

        {/* Compact Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {checkoutItems.map((item, idx) => {
            const catType = getItemCategoryType({
              name: item.name,
              categorySlug: item.categorySlug,
              categoryName: item.categoryName,
            });

            return (
              <div key={`${item.productId}-${idx}`} style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', background: '#fafafa', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #f4f4f5' }}>
                <div style={{ width: '48px', height: '60px', backgroundColor: '#f4f4f5', backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '6px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </h4>
                    <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#09090b', marginLeft: '0.5rem' }}>
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.725rem', color: '#71717a', margin: '2px 0' }}>
                    Qty: <strong>{item.quantity}</strong> {item.size ? `| Size: ${item.size}` : ''} {item.color ? `| ${item.color}` : ''}
                  </div>
                  {catType === 'T_SHIRT' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.675rem', fontWeight: 800, color: '#16a34a' }}>
                      <Gift size={11} /> Eligible for Buy 1 Get 2 Free
                    </span>
                  )}
                  {catType === 'HOODIE' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.675rem', fontWeight: 800, color: '#2563eb' }}>
                      <Gift size={11} /> Eligible for Buy 1 Get 1 Free
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Coupon Section */}
        <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: '0.85rem', marginBottom: '0.85rem' }}>
          {appliedCoupon ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.825rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#15803d', fontWeight: 700 }}>
                <Tag size={14} />
                <span>Coupon <strong>{appliedCoupon.code}</strong> applied (-₹{appliedCoupon.discount.toFixed(2)})</span>
              </div>
              <button 
                type="button" 
                onClick={handleRemoveCoupon} 
                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <button 
                type="button" 
                onClick={() => setShowCouponInput(!showCouponInput)} 
                style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.825rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', padding: 0 }}
              >
                <Tag size={13} />
                <span>Have a promo code or gift voucher?</span>
                {showCouponInput ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showCouponInput && (
                <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE (e.g. ADRIZO50)"
                    style={{ flex: 1, padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #d4d4d8', fontSize: '0.825rem', textTransform: 'uppercase', fontWeight: 700 }}
                  />
                  <button
                    type="submit"
                    disabled={validatingCoupon || !couponInput.trim()}
                    style={{ background: '#09090b', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.45rem 1rem', fontSize: '0.825rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    {validatingCoupon ? 'Checking...' : 'Apply'}
                  </button>
                </form>
              )}
              {couponError && <p style={{ color: '#dc2626', fontSize: '0.75rem', margin: '0.4rem 0 0', fontWeight: 600 }}>{couponError}</p>}
            </div>
          )}
        </div>

        {/* Pricing Breakdown */}
        <div style={{ borderTop: '1px solid #e4e4e7', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a' }}>
            <span>Catalog Subtotal</span>
            <span style={{ fontWeight: 600, color: '#09090b' }}>₹{activeTotals.catalogSubtotal.toFixed(2)}</span>
          </div>

          {activeTotals.bundleDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Sparkles size={13} /> Automatic Bundle Savings
              </span>
              <span>-₹{activeTotals.bundleDiscount.toFixed(2)}</span>
            </div>
          )}

          {activeTotals.couponDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700 }}>
              <span>Coupon Discount</span>
              <span>-₹{activeTotals.couponDiscount.toFixed(2)}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a' }}>
            <span>Shipping Charge</span>
            <span style={{ color: '#16a34a', fontWeight: 700 }}>FREE (All India)</span>
          </div>
        </div>
      </div>

      {/* 2. CHOOSE PAYMENT MODE (2 TILES) */}
      <div style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem', color: '#09090b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CreditCard size={18} /> Select Payment Option
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          
          {/* OPTION 1: FULL ONLINE PAYMENT (RECOMMENDED, ₹50 OFF) */}
          <div
            onClick={() => setSelectedPaymentMode('ONLINE_RAZORPAY')}
            style={{
              cursor: 'pointer',
              border: selectedPaymentMode === 'ONLINE_RAZORPAY' ? '2px solid #09090b' : '1px solid #e4e4e7',
              borderRadius: '10px',
              padding: '1rem',
              background: selectedPaymentMode === 'ONLINE_RAZORPAY' ? '#fafafa' : '#ffffff',
              position: 'relative',
              transition: 'all 0.2s ease',
              boxShadow: selectedPaymentMode === 'ONLINE_RAZORPAY' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <input
                  type="radio"
                  id="pay-online"
                  name="paymentMode"
                  checked={selectedPaymentMode === 'ONLINE_RAZORPAY'}
                  onChange={() => setSelectedPaymentMode('ONLINE_RAZORPAY')}
                  style={{ accentColor: '#09090b', width: '18px', height: '18px', margin: 0, cursor: 'pointer' }}
                />
                <label htmlFor="pay-online" style={{ cursor: 'pointer', fontWeight: 800, fontSize: '0.95rem', color: '#09090b' }}>
                  Pay Online (UPI, Cards, Netbanking)
                </label>
              </div>

              <span style={{ 
                background: '#dcfce7', 
                color: '#15803d', 
                fontSize: '0.725rem', 
                fontWeight: 900, 
                padding: '0.2rem 0.55rem', 
                borderRadius: '9999px', 
                border: '1px solid #86efac' 
              }}>
                ₹50 EXTRA OFF
              </span>
            </div>

            <div style={{ marginTop: '0.65rem', paddingLeft: '1.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#09090b' }}>
                  ₹{onlineTotals.amountPayableNow.toFixed(2)}
                </span>
                {onlineTotals.prepaidDiscount > 0 && (
                  <span style={{ fontSize: '0.85rem', color: '#71717a', textDecoration: 'line-through' }}>
                    ₹{(onlineTotals.subtotalAfterBundles - onlineTotals.couponDiscount).toFixed(2)}
                  </span>
                )}
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.775rem', color: '#71717a' }}>
                Pay securely through Razorpay using Google Pay, PhonePe, Paytm, Cards, or Netbanking.
              </p>
            </div>
          </div>

          {/* OPTION 2: CASH ON DELIVERY (₹99 ADVANCE CONFIRMATION) */}
          <div
            onClick={() => setSelectedPaymentMode('COD')}
            style={{
              cursor: 'pointer',
              border: selectedPaymentMode === 'COD' ? '2px solid #09090b' : '1px solid #e4e4e7',
              borderRadius: '10px',
              padding: '1rem',
              background: selectedPaymentMode === 'COD' ? '#fafafa' : '#ffffff',
              position: 'relative',
              transition: 'all 0.2s ease',
              boxShadow: selectedPaymentMode === 'COD' ? '0 4px 12px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <input
                  type="radio"
                  id="pay-cod"
                  name="paymentMode"
                  checked={selectedPaymentMode === 'COD'}
                  onChange={() => setSelectedPaymentMode('COD')}
                  style={{ accentColor: '#09090b', width: '18px', height: '18px', margin: 0, cursor: 'pointer' }}
                />
                <label htmlFor="pay-cod" style={{ cursor: 'pointer', fontWeight: 800, fontSize: '0.95rem', color: '#09090b' }}>
                  Cash on Delivery (Pay ₹99 Advance)
                </label>
              </div>

              <span style={{ 
                background: '#fef3c7', 
                color: '#92400e', 
                fontSize: '0.725rem', 
                fontWeight: 900, 
                padding: '0.2rem 0.55rem', 
                borderRadius: '9999px', 
                border: '1px solid #fde68a' 
              }}>
                ₹99 ADVANCE
              </span>
            </div>

            <div style={{ marginTop: '0.65rem', paddingLeft: '1.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#09090b' }}>
                  Pay ₹99.00 Now
                </span>
                <span style={{ fontSize: '0.825rem', color: '#71717a' }}>
                  • Balance <strong>₹{codTotals.amountDueOnDelivery.toFixed(2)}</strong> due on delivery
                </span>
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.775rem', color: '#71717a' }}>
                Pay ₹99 online now via Razorpay to confirm booking. Pay remaining balance in cash or UPI when delivered.
              </p>
            </div>
          </div>

        </div>

        {/* PRIMARY SUBMIT BUTTON */}
        <div style={{ marginTop: '1.5rem' }}>
          <button
            type="button"
            disabled={processing}
            onClick={() => handleLaunchPayment(selectedPaymentMode)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: '#09090b',
              color: '#ffffff',
              border: 'none',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: processing ? 'not-allowed' : 'pointer',
              opacity: processing ? 0.75 : 1,
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              transition: 'transform 0.15s ease'
            }}
          >
            {processing ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Opening Secure Razorpay Checkout...</span>
              </>
            ) : selectedPaymentMode === 'ONLINE_RAZORPAY' ? (
              <>
                <span>Pay ₹{onlineTotals.amountPayableNow.toFixed(2)} Online</span>
                <ArrowRight size={18} />
              </>
            ) : (
              <>
                <span>Pay ₹99 Advance & Confirm COD Order</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.85rem', color: '#71717a', fontSize: '0.75rem' }}>
          <Lock size={12} />
          <span>All transactions are 256-bit encrypted & verified directly with Razorpay</span>
        </div>
      </div>

      {/* CONFIRMED ORDER SUCCESS MODAL */}
      {confirmedOrder && (
        <CodSuccessModal
          isOpen={true}
          orderNumber={confirmedOrder.orderNumber}
          total={confirmedOrder.total}
          codConfirmationPaid={confirmedOrder.codConfirmationPaid}
          codRemaining={confirmedOrder.codRemaining}
          deliveryAddress={confirmedOrder.address}
          paymentMethod={confirmedOrder.paymentMethod}
          onTrackOrder={() => router.push(`/account?track=${confirmedOrder.orderNumber}`)}
          onViewOrder={() => router.push(`/order-success?id=${confirmedOrder.orderNumber}`)}
          onContinueShopping={() => {
            setConfirmedOrder(null);
            router.push('/');
          }}
        />
      )}

    </div>
  );
}
