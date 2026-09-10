"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Package, MapPin, Truck, CreditCard, ArrowRight, ShoppingBag, Gift, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { POLICY_CONFIG } from '@/config/policies';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetch(`/api/orders/${orderId}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.success && data.order) {
            setOrder(data.order);
          }
        })
        .catch(err => console.error('Failed to fetch order details', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [orderId]);

  return (
    <div className="container section-padding" style={{ maxWidth: '850px', margin: '0 auto', padding: '3rem 1rem 5rem' }}>
      {/* Success Badge & Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: '#dcfce7',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
          border: '2px solid #bbf7d0'
        }}>
          <CheckCircle size={44} color="#16a34a" />
        </div>
        <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.25rem)', fontWeight: 800, color: '#09090b', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
          🎉 Your Order is Confirmed!
        </h1>
        <p style={{ color: '#71717a', fontSize: '1rem', margin: 0 }}>
          Thank you for shopping with ADRIZO. We are preparing your order for dispatch.
        </p>

        {order?.items?.some((i: any) => i.price === 0 || (i.productName && i.productName.startsWith('[FREE]'))) && (
          <div style={{ marginTop: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '0.4rem 1.15rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 800 }}>
            <Sparkles size={16} /> {order.items.find((i: any) => i.promotionRule)?.promotionRule || 'Promotion'} applied successfully!
          </div>
        )}


        {order && (
          <div style={{ marginTop: '0.75rem', display: 'block' }}>
            <div style={{ display: 'inline-block', background: '#f4f4f5', padding: '0.45rem 1rem', borderRadius: '6px', fontSize: '0.95rem' }}>
              Order Number: <strong style={{ color: '#09090b', fontFamily: 'monospace', fontSize: '1.05rem' }}>{order.orderNumber || order.id}</strong>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#71717a' }}>
          Loading your order summary...
        </div>
      ) : order ? (
        <div style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          {/* Order Details Header */}
          <div style={{ padding: '1.25rem 1.5rem', background: '#fafafa', borderBottom: '1px solid #e4e4e7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>Payment Method</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#09090b' }}>
                {order.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : 'Online Payment (Razorpay)'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>Payment Status</div>
              <div style={{
                display: 'inline-block',
                padding: '0.2rem 0.55rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 800,
                background: order.paymentStatus === 'PAID' ? '#dcfce7' : '#fffbeb',
                color: order.paymentStatus === 'PAID' ? '#166534' : '#b45309'
              }}>
                {order.paymentMethod === 'COD'
                  ? (order.paymentStatus === 'PAID' ? 'PAID' : 'PAYMENT PENDING (Pay on Delivery)')
                  : (order.paymentStatus === 'PAID' ? 'PAID' : 'PAYMENT PENDING')}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>Order Status</div>
              <div style={{
                display: 'inline-block',
                padding: '0.2rem 0.55rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 800,
                background: '#f4f4f5',
                color: '#09090b'
              }}>
                {order.orderStatus || 'PLACED'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>Total Payable</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#09090b' }}>
                ₹{order.total.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Ordered Items List */}
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#09090b', marginBottom: '1rem' }}>Items Ordered</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {order.items?.map((item: any) => {
                const itemImg = item.productImage || item.product?.images?.[0]?.url;
                return (
                  <div key={item.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #f4f4f5' }}>
                    <div style={{ width: '56px', height: '70px', borderRadius: '6px', background: '#f4f4f5', overflow: 'hidden', border: '1px solid #e4e4e7', flexShrink: 0 }}>
                      {itemImg ? (
                        <img src={itemImg} alt={item.productName || 'Garment'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Package size={24} color="#a1a1aa" style={{ margin: '22px auto' }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {(item.price === 0 || (item.productName && item.productName.startsWith('[FREE]'))) && (
                          <span style={{ background: '#FFC800', color: '#000', fontSize: '0.65rem', fontWeight: 900, padding: '0.15rem 0.35rem', borderRadius: '3px' }}>
                            FREE
                          </span>
                        )}
                        <h4 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 700, color: '#09090b' }}>
                          {(item.productName || item.product?.name || 'Garment Item').replace(/^\[FREE\]\s*/, '')}
                        </h4>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: (item.price === 0 || (item.productName && item.productName.startsWith('[FREE]'))) ? '#166534' : '#71717a', marginTop: '0.2rem' }}>
                        Size: <strong>{item.size || 'Standard'}</strong> | Color: <strong>{item.color || 'Default'}</strong> | Qty: <strong>{item.quantity}</strong>
                        {(item.price === 0 || (item.productName && item.productName.startsWith('[FREE]'))) && ` • ${item.promotionRule || 'Promotional Item'}`}
                      </div>

                      {item.sku && (
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', fontFamily: 'monospace' }}>
                          SKU: {item.sku}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: '#09090b' }}>
                      {item.price === 0 || (item.productName && item.productName.startsWith('[FREE]')) ? (
                        <span style={{ color: '#166534', fontWeight: 900 }}>FREE (₹0)</span>
                      ) : (
                        `₹${(item.price * item.quantity).toLocaleString('en-IN')}`
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price Breakdown Summary */}
            <div style={{ background: '#fafafa', border: '1px solid #e4e4e7', borderRadius: '8px', padding: '1rem 1.25rem', marginTop: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#71717a' }}>
                Payment Summary
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.875rem' }}>
                {order.subtotal !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                    <span>Items Subtotal</span>
                    <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {order.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600 }}>
                    <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                    <span>-₹{order.discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                  <span>Delivery Fee</span>
                  <span>{order.shippingCharge === 0 ? <strong style={{ color: '#16a34a' }}>FREE</strong> : `₹${order.shippingCharge}`}</span>
                </div>
                {(order.paymentMethod === 'COD' || order.codCharge > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontWeight: 600 }}>
                    <span>COD Handling Fee</span>
                    <span>₹{(order.codCharge || 99).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.05rem', color: '#09090b', borderTop: '1px solid #e4e4e7', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  <span>Final Total</span>
                  <span>₹{order.total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Delivery Address & Schedule */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1.25rem', marginTop: '1.5rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800, fontSize: '0.85rem', color: '#09090b', marginBottom: '0.45rem' }}>
                  <MapPin size={16} />
                  <span>Delivery Address</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                  <strong>{order.customerName}</strong><br />
                  {order.shippingAddress}<br />
                  Phone: <strong>+91 {order.customerPhone}</strong>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800, fontSize: '0.85rem', color: '#09090b', marginBottom: '0.45rem' }}>
                  <Truck size={16} />
                  <span>Estimated Delivery</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                  Dispatched within <strong>1–2 business days</strong>.<br />
                  Estimated delivery: <strong>2–4 business days (Metro)</strong> / 3–6 business days (Rest of India).
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: '#71717a' }}>
          An email confirmation has been sent to your registered address.
        </p>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
        <Link
          href={`/account?track=${order?.orderNumber || order?.id || orderId}`}
          className="btn-primary"
          style={{
            padding: '0.75rem 2rem',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#09090b',
            color: '#ffffff',
            fontWeight: 800,
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)'
          }}
        >
          <Truck size={17} />
          <span>Track Order</span>
        </Link>
        <Link href="/shop" className="btn-outline" style={{ padding: '0.75rem 2rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShoppingBag size={16} />
          <span>Continue Shopping</span>
        </Link>
        <Link href="/account" className="btn-outline" style={{ padding: '0.75rem 2rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>View My Account Orders</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="container section-padding" style={{ textAlign: 'center', padding: '4rem 0' }}>Loading your order confirmation...</div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
