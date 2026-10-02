"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CodSuccessModal from '@/components/CodSuccessModal';
import { loadRazorpayScript, preloadRazorpayScript } from '@/lib/razorpay-script';
import { calculateCheckoutTotals, PaymentMode, getItemCategoryType } from '@/lib/checkout-engine';
import { getCodAdvanceAmount } from '@/config/policies';
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
  ChevronUp,
  Zap,
  Percent,
  Package,
  Wallet,
  X,
  Check
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
  const { user, fetchUser, broadcastAuthChange } = useAuth();

  const isBuyNowMode = searchParams.get('buyNow') === '1';

  // Buy Now item state
  const [buyNowItem, setBuyNowItem] = useState<BuyNowItem | null>(null);
  const [loadingBuyNow, setLoadingBuyNow] = useState(isBuyNowMode);

  // Payment Selection: ONLINE_RAZORPAY vs COD (₹99 advance)
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
  const [showCouponInput, setShowCouponInput] = useState(true);

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
    preloadRazorpayScript();
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
        isFree: false,
        promoGroupId: undefined,
        promotionRule: undefined,
      }];
    }

    return cart.map(item => {
      const isItemFree = Boolean(item.isFree || (item.price === 0 && item.originalPrice && item.originalPrice > 0));
      return {
        id: item.id,
        productId: item.productId,
        name: item.name,
        productName: item.name,
        price: isItemFree ? 0 : item.price,
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
        isFree: isItemFree,
        promoGroupId: item.promoGroupId,
        promotionRule: item.promotionRule,
      };
    });
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
  const handleApplyCoupon = async (e?: React.FormEvent, directCode?: string) => {
    if (e) e.preventDefault();
    const code = (directCode || couponInput).trim().toUpperCase();
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
          paymentMode: selectedPaymentMode === 'COD' ? 'COD' : 'ONLINE',
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
        setCouponError('');
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
          price: it.isFree ? 0 : it.price,
          originalPrice: it.originalPrice,
          categorySlug: it.categorySlug,
          categoryName: it.categoryName,
          category: it.category,
          isFree: it.isFree,
          promoGroupId: (it as any).promoGroupId,
          promotionRule: (it as any).promotionRule,
          sku: it.sku,
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

      // Parallelize create-order API request and Razorpay script loading to eliminate launch latency
      const [res, scriptLoaded] = await Promise.all([
        fetch('/api/checkout/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
        loadRazorpayScript(),
      ]);

      const data = await res.json();

      if (!data.success || !data.razorpayOrderId) {
        setOrderError(data.error || 'Failed to initialize payment order. Please try again.');
        isSubmittingRef.current = false;
        setProcessing(false);
        return;
      }

      if (!scriptLoaded || typeof (window as any).Razorpay !== 'function') {
        setOrderError('Failed to load secure Razorpay gateway. Please check your internet connection.');
        isSubmittingRef.current = false;
        setProcessing(false);
        return;
      }

      const contactToPrefill = data.customer?.phone || user?.phone || '';
      const emailToPrefill = data.customer?.email || user?.email || '';
      const nameToPrefill = data.customer?.name || user?.name || '';

      const isCod = paymentMode === 'COD';
      const codAdvance = getCodAdvanceAmount();

      const options = {
        key: data.key,
        amount: data.amount, // 9900 paise for COD, or discounted total for online
        currency: data.currency || 'INR',
        name: 'ADRIZO',
        description: isCod 
          ? `Order #${data.orderNumber} (₹${codAdvance} COD Advance Confirmation)`
          : `Order #${data.orderNumber}`,
        image: typeof window !== 'undefined' && window.location?.origin 
          ? `${window.location.origin}/adrizo-logo-transparent.png` 
          : 'https://adrizo.com/adrizo-logo-transparent.png',
        order_id: data.razorpayOrderId,
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
        modal: {
          confirm_close: true,
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
                    <span style={{ fontWeight: 800, fontSize: '0.875rem', color: (item.isFree || item.price === 0) ? '#16a34a' : '#09090b', marginLeft: '0.5rem' }}>
                      {(item.isFree || item.price === 0) ? '₹0.00 FREE' : `₹${(item.price * item.quantity).toFixed(2)}`}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.725rem', color: '#71717a', margin: '2px 0' }}>
                    Qty: <strong>{item.quantity}</strong> {item.size ? `| Size: ${item.size}` : ''} {item.color ? `| ${item.color}` : ''}
                  </div>
                  {(item.isFree || item.price === 0) ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.675rem', fontWeight: 800, color: '#16a34a' }}>
                      <Gift size={11} /> Promotional Free Product (₹0.00)
                    </span>
                  ) : item.promotionRule ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.675rem', fontWeight: 800, color: '#16a34a' }}>
                      <Gift size={11} /> {item.promotionRule}
                    </span>
                  ) : catType === 'T_SHIRT' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.675rem', fontWeight: 800, color: '#16a34a' }}>
                      <Gift size={11} /> Eligible for Buy 1 Get 2 Free
                    </span>
                  ) : catType === 'HOODIE' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.675rem', fontWeight: 800, color: '#b45309' }}>
                      <Gift size={11} /> Eligible for Buy 1 Get 1 Free
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pricing Breakdown inside Order Items Card */}
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

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a' }}>
            <span>Shipping Charge</span>
            <span style={{ color: '#16a34a', fontWeight: 700 }}>FREE (All India)</span>
          </div>
        </div>
      </div>

      {/* 2. HAVE A COUPON? CARD (MATCHING REFERENCE IMAGE) */}
      <div style={{ 
        background: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '14px', 
        padding: '1.15rem 1.25rem', 
        marginBottom: '1.25rem', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)' 
      }}>
        {/* Header Toggle */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setShowCouponInput(prev => !prev)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowCouponInput(prev => !prev); }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', outline: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              width: '34px', 
              height: '34px', 
              borderRadius: '50%', 
              background: '#16a34a', 
              color: '#ffffff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(22,163,74,0.25)'
            }}>
              <Percent size={18} strokeWidth={2.6} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.975rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Have a coupon?
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.775rem', color: '#64748b', fontWeight: 500 }}>
                Apply coupon code to get extra savings
              </p>
            </div>
          </div>
          <div style={{ color: '#64748b' }}>
            {showCouponInput ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>

        {/* Expandable Coupon Form & Status */}
        {showCouponInput && (
          <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9' }}>
            {appliedCoupon ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.5rem',
                background: '#f0fdf4', 
                border: '1px solid #bbf7d0', 
                borderRadius: '10px', 
                padding: '0.75rem 1rem' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', fontWeight: 800, fontSize: '0.875rem' }}>
                    <Tag size={16} />
                    <span>Coupon <strong>{appliedCoupon.code}</strong> Applied</span>
                    <span style={{ background: '#dcfce7', color: '#166534', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800 }}>
                      -₹{appliedCoupon.discount} OFF
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #fca5a5',
                      color: '#dc2626',
                      borderRadius: '6px',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
                {selectedPaymentMode === 'COD' && (
                  <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>⚠️ Coupon applicable on online payment only.</span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <form 
                  onSubmit={(e) => handleApplyCoupon(e)} 
                  style={{ display: 'flex', gap: '0.5rem', flexWrap: 'nowrap' }}
                >
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code (e.g. ADRIZO50)"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      outline: 'none',
                      color: '#0f172a'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={validatingCoupon || !couponInput.trim()}
                    style={{
                      background: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.65rem 1.25rem',
                      fontSize: '0.875rem',
                      fontWeight: 800,
                      cursor: validatingCoupon || !couponInput.trim() ? 'not-allowed' : 'pointer',
                      opacity: validatingCoupon || !couponInput.trim() ? 0.7 : 1,
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(22,163,74,0.2)'
                    }}
                  >
                    {validatingCoupon ? 'Applying...' : 'Apply'}
                  </button>
                </form>

                {couponError && (
                  <p style={{ color: '#dc2626', fontSize: '0.75rem', margin: '0.45rem 0 0', fontWeight: 600 }}>
                    {couponError}
                  </p>
                )}

                {/* Quick Offer Hint Banner from Reference Image */}
                <div 
                  onClick={() => {
                    setCouponInput('ADRIZO50');
                    handleApplyCoupon(undefined, 'ADRIZO50');
                  }}
                  role="button"
                  tabIndex={0}
                  style={{ 
                    marginTop: '0.75rem', 
                    background: '#f0fdf4', 
                    border: '1px solid #bbf7d0', 
                    borderRadius: '8px', 
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ color: '#16a34a', marginTop: '2px', flexShrink: 0 }}>
                    <Tag size={15} />
                  </div>
                  <div style={{ fontSize: '0.775rem', color: '#166534', lineHeight: 1.45 }}>
                    <div>
                      Use <strong style={{ color: '#15803d' }}>ADRIZO50</strong> to get <strong style={{ color: '#15803d' }}>₹50 OFF</strong> on online payment
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#65a30d', marginTop: '1px' }}>
                      Note: Coupons are applicable only on online payment.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. SELECT PAYMENT OPTION SECTION (PREMIUM CARDS) */}
      <div style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 1rem', color: '#09090b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CreditCard size={18} /> Select Payment Option
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.85rem' }}>
          
          {/* OPTION 1: PAY ONLINE */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setSelectedPaymentMode('ONLINE_RAZORPAY')}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setSelectedPaymentMode('ONLINE_RAZORPAY'); }}
            style={{
              cursor: 'pointer',
              border: selectedPaymentMode === 'ONLINE_RAZORPAY' ? '2px solid #09090b' : '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1.15rem 1.25rem',
              background: '#ffffff',
              boxShadow: selectedPaymentMode === 'ONLINE_RAZORPAY' ? '0 4px 14px rgba(0,0,0,0.06)' : '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              position: 'relative',
              outline: 'none',
            }}
          >
            {/* Top Row: Radio, Card Icon, Titles & Recommended Badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              {/* Custom Radio Indicator */}
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: selectedPaymentMode === 'ONLINE_RAZORPAY' ? '2px solid #09090b' : '1.5px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: '#ffffff',
                marginTop: '2px',
                transition: 'border-color 0.2s ease',
              }}>
                {selectedPaymentMode === 'ONLINE_RAZORPAY' && (
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#09090b' }} />
                )}
              </div>

              {/* Neutral icon box */}
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#f4f4f5',
                color: '#09090b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <CreditCard size={20} />
              </div>

              {/* Texts & Recommended Badge */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', letterSpacing: '-0.01em' }}>
                    Pay Online
                  </span>
                  <span style={{
                    fontSize: '0.675rem',
                    fontWeight: 800,
                    color: '#059669',
                    background: '#ecfdf5',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '9999px',
                    border: '1px solid #a7f3d0',
                    letterSpacing: '0.04em',
                  }}>
                    RECOMMENDED
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 500, textAlign: 'left' }}>
                  Pay securely via UPI, Cards, NetBanking
                </p>
              </div>
            </div>

            {/* Payment Method Badges: Strictly ONE SINGLE HORIZONTAL ROW of 6 Logos starting from LEFT */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', 
              gap: 'clamp(4px, 1.2vw, 8px)', 
              marginTop: '0.9rem',
              width: '100%',
              boxSizing: 'border-box',
            }}>
              {/* Google Pay */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: '#ffffff', 
                border: '1px solid #e2e8f0', 
                borderRadius: '6px', 
                height: '28px', 
                minWidth: 0,
                padding: '0 4px',
                boxSizing: 'border-box',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', minWidth: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27a7.18 7.18 0 0 1 0-4.54V6.58H1.25a11.98 11.98 0 0 0 0 10.84l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span style={{ fontSize: 'clamp(8px, 1.8vw, 10.5px)', fontWeight: 700, color: '#3c4043', letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>
                    Pay
                  </span>
                </div>
              </div>

              {/* PhonePe */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: '#5f259f', 
                border: '1px solid #5f259f',
                borderRadius: '6px', 
                height: '28px', 
                minWidth: 0,
                padding: '0 4px',
                boxSizing: 'border-box',
              }}>
                <span style={{ color: '#ffffff', fontSize: 'clamp(7.5px, 1.7vw, 10px)', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  PhonePe
                </span>
              </div>

              {/* Paytm */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: '#ffffff', 
                border: '1px solid #e2e8f0', 
                borderRadius: '6px', 
                height: '28px', 
                minWidth: 0,
                padding: '0 4px',
                boxSizing: 'border-box',
              }}>
                <span style={{ fontSize: 'clamp(8px, 1.8vw, 10.5px)', fontWeight: 900, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#002970' }}>pay</span>
                  <span style={{ color: '#00b9f5' }}>tm</span>
                </span>
              </div>

              {/* VISA */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: '#ffffff', 
                border: '1px solid #e2e8f0', 
                borderRadius: '6px', 
                height: '28px', 
                minWidth: 0,
                padding: '0 4px',
                boxSizing: 'border-box',
              }}>
                <span style={{ color: '#1a1f71', fontSize: 'clamp(8.5px, 1.9vw, 11px)', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                  VISA
                </span>
              </div>

              {/* Mastercard */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: '#ffffff', 
                border: '1px solid #e2e8f0', 
                borderRadius: '6px', 
                height: '28px', 
                minWidth: 0,
                padding: '0 4px',
                boxSizing: 'border-box',
              }}>
                <svg width="22" height="14" viewBox="0 0 28 18" style={{ flexShrink: 0 }}>
                  <circle cx="9" cy="9" r="8" fill="#EB001B"/>
                  <circle cx="19" cy="9" r="8" fill="#F79E1B" fillOpacity="0.88"/>
                </svg>
              </div>

              {/* RuPay */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: '#ffffff', 
                border: '1px solid #e2e8f0', 
                borderRadius: '6px', 
                height: '28px', 
                minWidth: 0,
                padding: '0 4px',
                boxSizing: 'border-box',
              }}>
                <span style={{ fontSize: 'clamp(8px, 1.8vw, 10px)', fontWeight: 900, fontStyle: 'italic', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#092350' }}>RuPay</span>
                  <span style={{ color: '#00a651', marginLeft: '1px' }}>❯</span>
                </span>
              </div>
            </div>
          </div>

          {/* OPTION 2: CASH ON DELIVERY (₹99 ADVANCE CONFIRMATION) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setSelectedPaymentMode('COD')}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setSelectedPaymentMode('COD'); }}
            style={{
              cursor: 'pointer',
              border: selectedPaymentMode === 'COD' ? '2px solid #09090b' : '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1.15rem 1.25rem',
              background: '#ffffff',
              boxShadow: selectedPaymentMode === 'COD' ? '0 4px 14px rgba(0,0,0,0.06)' : '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              position: 'relative',
              outline: 'none',
            }}
          >
            {/* Top Row: Radio, Truck Icon, Titles & Advance Badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              {/* Custom Radio Indicator */}
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: selectedPaymentMode === 'COD' ? '2px solid #09090b' : '1.5px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: '#ffffff',
                marginTop: '2px',
                transition: 'border-color 0.2s ease',
              }}>
                {selectedPaymentMode === 'COD' && (
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#09090b' }} />
                )}
              </div>

              {/* Neutral icon box */}
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#f4f4f5',
                color: '#09090b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Truck size={20} />
              </div>

              {/* Texts & Advance Badge */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', letterSpacing: '-0.01em' }}>
                    Cash on Delivery
                  </span>
                  <span style={{
                    fontSize: '0.675rem',
                    fontWeight: 800,
                    color: '#b45309',
                    background: '#fef3c7',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '9999px',
                    border: '1px solid #fde68a',
                    letterSpacing: '0.03em',
                  }}>
                    ₹{getCodAdvanceAmount()} ADVANCE
                  </span>
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 500, textAlign: 'left' }}>
                  Pay ₹{getCodAdvanceAmount()} advance to confirm your order
                </p>
              </div>
            </div>

            {/* COD breakdown note */}
            <div style={{
              marginTop: '0.85rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.35rem',
              fontSize: '0.75rem',
            }}>
              <span style={{ color: '#0f172a', fontWeight: 700 }}>
                Online Advance: ₹{getCodAdvanceAmount()}.00
              </span>
              <span style={{ color: '#64748b', fontWeight: 700 }}>
                Remaining Balance: ₹{codTotals.amountDueOnDelivery.toFixed(2)} (on delivery)
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 4. ORDER PRICING SUMMARY CARD (FROM REFERENCE IMAGE) */}
      <div style={{ 
        background: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '14px', 
        padding: '1.25rem', 
        marginBottom: '1.25rem', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)' 
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {/* Order Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: '#475569' }}>
            <span>Order Total ({checkoutItems.reduce((acc, it) => acc + (it.quantity || 1), 0)} items)</span>
            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
              ₹{activeTotals.subtotalAfterBundles.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Coupon Discount Row (if applied) */}
          {appliedCoupon && selectedPaymentMode === 'ONLINE_RAZORPAY' && activeTotals.couponDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: '#16a34a' }}>
              <span style={{ fontWeight: 600 }}>Coupon Discount ({appliedCoupon.code})</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontWeight: 800 }}>- ₹{activeTotals.couponDiscount.toLocaleString('en-IN')}</span>
                <button 
                  type="button" 
                  onClick={handleRemoveCoupon} 
                  title="Remove coupon"
                  style={{ 
                    background: '#fee2e2', 
                    border: 'none', 
                    color: '#dc2626', 
                    width: '18px', 
                    height: '18px', 
                    borderRadius: '50%', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    cursor: 'pointer',
                    fontSize: '11px',
                    padding: 0
                  }}
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}

          {appliedCoupon && selectedPaymentMode === 'COD' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#b45309', background: '#fffbeb', padding: '0.45rem 0.75rem', borderRadius: '8px' }}>
              <span>Coupon <strong>{appliedCoupon.code}</strong></span>
              <span style={{ fontWeight: 700 }}>Coupon applicable on online payment only.</span>
            </div>
          )}

          {/* Divider line */}
          <div style={{ height: '1px', background: '#f1f5f9', margin: '0.2rem 0' }} />

          {/* Final Payable Amount */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                {selectedPaymentMode === 'COD' ? 'Payable Now (Advance)' : 'Final Payable Amount'}
              </span>
              {selectedPaymentMode === 'COD' && (
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Remaining ₹{codTotals.amountDueOnDelivery.toLocaleString('en-IN')} due upon delivery
                </p>
              )}
            </div>
            <span style={{ fontWeight: 900, fontSize: '1.45rem', color: '#16a34a', letterSpacing: '-0.02em' }}>
              ₹{activeTotals.amountPayableNow.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Green Savings Ribbon */}
          {((appliedCoupon && selectedPaymentMode === 'ONLINE_RAZORPAY' && activeTotals.couponDiscount > 0) || activeTotals.bundleDiscount > 0) && (
            <div style={{
              marginTop: '0.25rem',
              background: '#ecfdf5',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '0.55rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#15803d',
              fontSize: '0.825rem',
              fontWeight: 700
            }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#16a34a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Percent size={11} strokeWidth={2.8} />
              </div>
              <span>
                {appliedCoupon && selectedPaymentMode === 'ONLINE_RAZORPAY' && activeTotals.couponDiscount > 0
                  ? `You are saving ₹${activeTotals.couponDiscount} with this coupon!`
                  : `You are saving ₹${activeTotals.bundleDiscount} with your bundle offer!`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 5. PRIMARY SUBMIT CTA BUTTON */}
      <div style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          disabled={processing}
          onClick={() => handleLaunchPayment(selectedPaymentMode)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            background: '#09090b',
            color: '#ffffff',
            border: 'none',
            padding: '1.05rem',
            borderRadius: '12px',
            fontSize: '1.05rem',
            fontWeight: 800,
            cursor: processing ? 'not-allowed' : 'pointer',
            opacity: processing ? 0.75 : 1,
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            transition: 'transform 0.15s ease',
          }}
        >
          {processing ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              <span>Opening Secure Razorpay Checkout...</span>
            </>
          ) : selectedPaymentMode === 'ONLINE_RAZORPAY' ? (
            <>
              <Lock size={16} />
              <span>Pay ₹{onlineTotals.amountPayableNow.toLocaleString('en-IN')} Online →</span>
            </>
          ) : (
            <>
              <Lock size={16} />
              <span>Pay ₹{getCodAdvanceAmount()} Advance →</span>
            </>
          )}
        </button>
      </div>

      {/* 6. TRUST FOOTER BADGES */}
      <div style={{ textAlign: 'center', marginTop: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 500 }}>
          <Lock size={12} color="#64748b" />
          <span>All transactions are 256-bit encrypted & verified directly with Razorpay</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 800, color: '#065f46' }}>
            <CheckCircle2 size={13} color="#059669" />
            <span>PCI DSS COMPLIANT</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 800, color: '#065f46' }}>
            <Lock size={12} color="#059669" />
            <span>SSL SECURED</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 800, color: '#1e40af' }}>
            <span style={{ fontSize: '0.625rem', color: '#64748b', fontWeight: 600 }}>POWERED BY</span>
            <span style={{ color: '#0c2340', fontWeight: 900, fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              <Zap size={11} fill="#3399cc" color="#3399cc" /> Razorpay
            </span>
          </div>
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
