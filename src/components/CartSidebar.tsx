"use client";

import React, { useMemo } from 'react';
import { X, Plus, Minus, ShoppingBag, Gift, Sparkles, Check, ArrowRight, Trash2, ShieldCheck, Tag } from 'lucide-react';
import { useCart, CartItem } from '../context/CartContext';
import { useRouter } from 'next/navigation';
import Portal from '@/components/Portal';
import { getItemCategoryType } from '@/lib/checkout-engine';

export default function CartSidebar() {
  const router = useRouter();
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    cartTotal,
    cartCatalogTotal,
    bundleDiscount,
    tshirtBundleSavings,
    hoodieBundleSavings,
    bundleDetails,
    checkoutTotals,
  } = useCart();

  // Group cart items by category for clean bundle display
  const { tshirts, hoodies, others } = useMemo(() => {
    const ts: CartItem[] = [];
    const hd: CartItem[] = [];
    const ot: CartItem[] = [];

    for (const item of cart) {
      const catType = getItemCategoryType({
        name: item.name,
        categorySlug: item.categorySlug || item.category?.slug,
        categoryName: item.categoryName || item.category?.name,
        category: item.category,
      });

      if (catType === 'T_SHIRT') {
        ts.push(item);
      } else if (catType === 'HOODIE') {
        hd.push(item);
      } else {
        ot.push(item);
      }
    }

    return { tshirts: ts, hoodies: hd, others: ot };
  }, [cart]);

  const handleProceedToCheckout = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsCartOpen(false);
    router.push('/checkout');
  };

  if (!isCartOpen) return null;

  return (
    <Portal>
      <div 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          zIndex: 'var(--z-drawer, 1300)' as any,
          backdropFilter: 'blur(2px)'
        }}
        onClick={() => setIsCartOpen(false)}
      />
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        right: 0, 
        bottom: 0, 
        width: '100%', 
        maxWidth: 'min(100vw, 440px)', 
        backgroundColor: '#ffffff', 
        zIndex: 'calc(var(--z-drawer, 1300) + 1)' as any, 
        display: 'flex', 
        flexDirection: 'column',
        boxShadow: '-4px 0 25px rgba(0,0,0,0.15)', 
        boxSizing: 'border-box'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '1.25rem clamp(1rem, 4vw, 1.5rem)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          borderBottom: '1px solid #e4e4e7',
          background: '#ffffff'
        }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: '#09090b' }}>
            <ShoppingBag size={20} /> Your Shopping Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
          </h2>
          <button 
            onClick={() => setIsCartOpen(false)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', padding: '4px' }}
            aria-label="Close cart"
          >
            <X size={22} />
          </button>
        </div>

        {/* Cart Items Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem clamp(1rem, 4vw, 1.5rem)' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#71717a' }}>
              <ShoppingBag size={48} strokeWidth={1.5} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.5rem', color: '#09090b' }}>Your cart is empty</p>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>Add your favorite T-shirts & Hoodies to activate automatic bundle discounts!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* T-SHIRT BUNDLE GROUP */}
              {tshirts.length > 0 && (
                <div style={{ 
                  border: '1.5px solid #16a34a', 
                  borderRadius: '10px', 
                  overflow: 'hidden',
                  background: '#fafaf9'
                }}>
                  <div style={{ 
                    background: '#16a34a', 
                    color: '#ffffff', 
                    padding: '0.55rem 0.85rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <Gift size={14} /> BUY 1 GET 2 FREE (T-SHIRTS)
                    </div>
                    {bundleDetails.tshirtFree > 0 && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#ffffff', color: '#16a34a', padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
                        {bundleDetails.tshirtFree} FREE ITEM{bundleDetails.tshirtFree > 1 ? 'S' : ''}
                      </span>
                    )}
                  </div>

                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {tshirts.map(item => (
                      <div key={item.id} style={{ display: 'flex', gap: '0.75rem', background: '#ffffff', padding: '0.65rem', borderRadius: '8px', border: '1px solid #e4e4e7', alignItems: 'center' }}>
                        <div style={{ width: '52px', height: '64px', backgroundColor: '#f4f4f5', backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '6px', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                          </h4>
                          <div style={{ fontSize: '0.725rem', color: '#71717a', margin: '2px 0' }}>
                            Size: <strong>{item.size}</strong> {item.color ? `| ${item.color}` : ''}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#09090b' }}>
                              ₹{(item.originalPrice || item.price).toFixed(2)}
                            </span>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#f4f4f5', padding: '2px 6px', borderRadius: '4px' }}>
                              <button 
                                type="button" 
                                onClick={() => updateQuantity(item.id, -1)} 
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#18181b', display: 'flex' }}
                                aria-label="Decrease"
                              >
                                <Minus size={12} strokeWidth={2.5} />
                              </button>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, minWidth: '16px', textAlign: 'center' }}>{item.quantity}</span>
                              <button 
                                type="button" 
                                onClick={() => updateQuantity(item.id, 1)} 
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#18181b', display: 'flex' }}
                                aria-label="Increase"
                              >
                                <Plus size={12} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id)} 
                          style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '4px' }}
                          title="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}

                    {/* T-Shirt Bundle Savings Footer */}
                    {tshirtBundleSavings > 0 ? (
                      <div style={{ 
                        marginTop: '0.25rem', 
                        paddingTop: '0.5rem', 
                        borderTop: '1px dashed #cbd5e1', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '0.8rem' 
                      }}>
                        <span style={{ color: '#166534', fontWeight: 700 }}>
                          T-Shirt Bundle Savings ({bundleDetails.tshirtPaid} Paid, {bundleDetails.tshirtFree} Free):
                        </span>
                        <span style={{ color: '#166534', fontWeight: 900 }}>
                          -₹{tshirtBundleSavings.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.725rem', color: '#854d0e', background: '#fef9c3', padding: '0.35rem 0.6rem', borderRadius: '4px' }}>
                        💡 Add {3 - (bundleDetails.tshirtCount % 3)} more T-shirt{3 - (bundleDetails.tshirtCount % 3) > 1 ? 's' : ''} to get them completely FREE!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* HOODIE BUNDLE GROUP */}
              {hoodies.length > 0 && (
                <div style={{ 
                  border: '1.5px solid #2563eb', 
                  borderRadius: '10px', 
                  overflow: 'hidden',
                  background: '#fafaf9'
                }}>
                  <div style={{ 
                    background: '#2563eb', 
                    color: '#ffffff', 
                    padding: '0.55rem 0.85rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <Gift size={14} /> BUY 1 GET 1 FREE (HOODIES)
                    </div>
                    {bundleDetails.hoodieFree > 0 && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#ffffff', color: '#2563eb', padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
                        {bundleDetails.hoodieFree} FREE ITEM{bundleDetails.hoodieFree > 1 ? 'S' : ''}
                      </span>
                    )}
                  </div>

                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {hoodies.map(item => (
                      <div key={item.id} style={{ display: 'flex', gap: '0.75rem', background: '#ffffff', padding: '0.65rem', borderRadius: '8px', border: '1px solid #e4e4e7', alignItems: 'center' }}>
                        <div style={{ width: '52px', height: '64px', backgroundColor: '#f4f4f5', backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '6px', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.name}
                          </h4>
                          <div style={{ fontSize: '0.725rem', color: '#71717a', margin: '2px 0' }}>
                            Size: <strong>{item.size}</strong> {item.color ? `| ${item.color}` : ''}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#09090b' }}>
                              ₹{(item.originalPrice || item.price).toFixed(2)}
                            </span>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#f4f4f5', padding: '2px 6px', borderRadius: '4px' }}>
                              <button 
                                type="button" 
                                onClick={() => updateQuantity(item.id, -1)} 
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#18181b', display: 'flex' }}
                                aria-label="Decrease"
                              >
                                <Minus size={12} strokeWidth={2.5} />
                              </button>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, minWidth: '16px', textAlign: 'center' }}>{item.quantity}</span>
                              <button 
                                type="button" 
                                onClick={() => updateQuantity(item.id, 1)} 
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#18181b', display: 'flex' }}
                                aria-label="Increase"
                              >
                                <Plus size={12} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id)} 
                          style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '4px' }}
                          title="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}

                    {/* Hoodie Bundle Savings Footer */}
                    {hoodieBundleSavings > 0 ? (
                      <div style={{ 
                        marginTop: '0.25rem', 
                        paddingTop: '0.5rem', 
                        borderTop: '1px dashed #cbd5e1', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '0.8rem' 
                      }}>
                        <span style={{ color: '#1d4ed8', fontWeight: 700 }}>
                          Hoodie Bundle Savings ({bundleDetails.hoodiePaid} Paid, {bundleDetails.hoodieFree} Free):
                        </span>
                        <span style={{ color: '#1d4ed8', fontWeight: 900 }}>
                          -₹{hoodieBundleSavings.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.725rem', color: '#1e40af', background: '#eff6ff', padding: '0.35rem 0.6rem', borderRadius: '4px' }}>
                        💡 Add 1 more Hoodie to get it completely FREE!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* OTHER ITEMS */}
              {others.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.725rem', fontWeight: 800, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Standard Products
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {others.map(item => (
                      <div key={item.id} style={{ display: 'flex', gap: '0.75rem', background: '#ffffff', padding: '0.65rem', borderRadius: '8px', border: '1px solid #e4e4e7', alignItems: 'center' }}>
                        <div style={{ width: '52px', height: '64px', backgroundColor: '#f4f4f5', backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '6px', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h4>
                          <div style={{ fontSize: '0.725rem', color: '#71717a', margin: '2px 0' }}>
                            Size: <strong>{item.size}</strong> {item.color ? `| ${item.color}` : ''}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#09090b' }}>₹{(item.originalPrice || item.price).toFixed(2)}</span>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#f4f4f5', padding: '2px 6px', borderRadius: '4px' }}>
                              <button type="button" onClick={() => updateQuantity(item.id, -1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#18181b', display: 'flex' }} aria-label="Decrease">
                                <Minus size={12} strokeWidth={2.5} />
                              </button>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, minWidth: '16px', textAlign: 'center' }}>{item.quantity}</span>
                              <button type="button" onClick={() => updateQuantity(item.id, 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#18181b', display: 'flex' }} aria-label="Increase">
                                <Plus size={12} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '4px' }} title="Remove item">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer Summary & Direct Checkout Trigger */}
        {cart.length > 0 && (
          <div style={{ padding: '1.25rem clamp(1rem, 4vw, 1.5rem)', borderTop: '1px solid #e4e4e7', backgroundColor: '#fcfcfc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem', color: '#71717a' }}>
              <span>Catalog Subtotal</span>
              <span style={{ fontWeight: 600, color: '#09090b' }}>₹{cartCatalogTotal.toFixed(2)}</span>
            </div>

            {bundleDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: 700 }}>
                <span>Automatic Bundle Savings</span>
                <span>-₹{bundleDiscount.toFixed(2)}</span>
              </div>
            )}

            <div style={{ 
              background: '#f0fdf4', 
              border: '1px dashed #86efac', 
              borderRadius: '6px', 
              padding: '0.4rem 0.65rem', 
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#15803d',
              fontWeight: 700
            }}>
              <span>⚡ Universal Prepaid Offer:</span>
              <span>₹50 EXTRA OFF at checkout</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1.15rem', fontWeight: 900, borderTop: '1px solid #e4e4e7', paddingTop: '0.65rem' }}>
              <span>Order Subtotal</span>
              <span>₹{cartTotal.toFixed(2)}</span>
            </div>

            <button
              type="button"
              onClick={handleProceedToCheckout}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.5rem',
                width: '100%', 
                background: '#09090b', 
                color: '#ffffff', 
                border: 'none', 
                padding: '0.9rem', 
                borderRadius: '8px', 
                fontWeight: 800, 
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </Portal>
  );
}
