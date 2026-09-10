"use client";

import React, { useMemo } from 'react';
import { X, Plus, Minus, ShoppingBag, Gift, Sparkles, Check, ArrowRight, Trash2 } from 'lucide-react';
import { useCart, CartItem } from '../context/CartContext';
import { useRouter } from 'next/navigation';
import FreeProductSelectorModal from './FreeProductSelectorModal';
import ForgottenFreeItemsModal from './ForgottenFreeItemsModal';

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
    cartPromotionalDiscount,
    hasEligibleBogoItem,
    allowedFreeItemsCount,
    freeItemsCount,
    openBogoSelectorFor,
    openBogoSelectorForBundle,
    isForgottenModalOpen,
    setIsForgottenModalOpen,
    bogoPromoConfig,
  } = useCart();

  // Group cart items into promotional bundles (by promoGroupId) and standalone items
  const { promoBundles, standaloneItems } = useMemo(() => {
    const bundlesMap = new Map<string, CartItem[]>();
    const standalones: CartItem[] = [];

    for (const item of cart) {
      if (item.promoGroupId) {
        if (!bundlesMap.has(item.promoGroupId)) {
          bundlesMap.set(item.promoGroupId, []);
        }
        bundlesMap.get(item.promoGroupId)!.push(item);
      } else {
        standalones.push(item);
      }
    }

    const bundles = Array.from(bundlesMap.entries()).map(([groupId, items]) => {
      const paidItems = items.filter(i => !i.isFree);
      const paidItem = paidItems[0] || items[0];
      const freeItems = items.filter(i => i.isFree);
      const groupCatalogTotal = items.reduce((sum, i) => sum + (i.originalPrice || i.price), 0);
      const groupPayable = paidItems.reduce((sum, i) => sum + i.price, 0);
      const groupSavings = Math.max(0, groupCatalogTotal - groupPayable);

      return {
        groupId,
        items,
        paidItem,

        freeItems,
        groupCatalogTotal,
        groupPayable,
        groupSavings,
      };
    });

    return { promoBundles: bundles, standaloneItems: standalones };
  }, [cart]);

  const handleProceedToCheckout = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasEligibleBogoItem && freeItemsCount < allowedFreeItemsCount && promoBundles.length === 0) {
      setIsForgottenModalOpen(true);
      return;
    }
    setIsCartOpen(false);
    router.push('/checkout');
  };

  const handleProceedWithoutFree = () => {
    setIsForgottenModalOpen(false);
    setIsCartOpen(false);
    router.push('/checkout');
  };

  if (!isCartOpen) {
    return (
      <>
        <FreeProductSelectorModal />
        <ForgottenFreeItemsModal
          isOpen={isForgottenModalOpen}
          onClose={() => setIsForgottenModalOpen(false)}
          onOpenSelector={() => {
            setIsForgottenModalOpen(false);
            openBogoSelectorFor();
          }}
          onProceedWithoutFree={handleProceedWithoutFree}
          unclaimedCount={allowedFreeItemsCount - freeItemsCount}
        />
      </>
    );
  }

  return (
    <>
      <div 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
        onClick={() => setIsCartOpen(false)}
      />
      <div style={{ 
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 'min(100vw, 440px)', 
        backgroundColor: 'var(--white)', zIndex: 1001, display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 25px rgba(0,0,0,0.15)', boxSizing: 'border-box'
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem clamp(1rem, 4vw, 1.5rem)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-gray)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <ShoppingBag size={20} /> Your Shopping Cart ({cart.length})
          </h2>
          <button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem clamp(1rem, 4vw, 1.5rem)' }}>
          {/* Dynamic Promotion Banner for standalone items if promotion available */}
          {hasEligibleBogoItem && promoBundles.length === 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 900, color: '#92400e', fontSize: '0.825rem', textTransform: 'uppercase' }}>
                    <Gift size={15} /> {bogoPromoConfig?.name || bogoPromoConfig?.offerName || 'PROMOTION'} AVAILABLE!
                  </div>
                  <div style={{ fontSize: '0.775rem', color: '#78350f', marginTop: '2px' }}>
                    Choose {bogoPromoConfig?.freeQuantity || 2} products and pay only for the highest selling-price item.
                  </div>
                </div>
                <button

                  type="button"
                  onClick={() => openBogoSelectorFor()}
                  style={{
                    background: '#09090b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  <span>+ Choose Free</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          )}

          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-gray)' }}>
              Your cart is empty.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* 1. PROMOTIONAL BUNDLES */}
              {promoBundles.map((bundle, bIdx) => (
                <div 
                  key={bundle.groupId}
                  style={{ 
                    border: '1.5px solid #16a34a', 
                    borderRadius: '10px', 
                    overflow: 'hidden',
                    background: '#fafaf9',
                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)'
                  }}
                >
                  {/* Bundle Header */}
                  <div style={{ 
                    background: '#16a34a', 
                    color: '#ffffff', 
                    padding: '0.5rem 0.85rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <Gift size={14} /> {(bundle.items[0]?.promotionRule || bogoPromoConfig?.name || bogoPromoConfig?.offerName || 'PROMOTION')} BUNDLE #{bIdx + 1}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => openBogoSelectorForBundle(bundle.groupId)}
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '4px',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.675rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                        title="Change free products in this bundle"
                      >
                        Edit Free Items
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(bundle.items[0].id)}
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '4px',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.675rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                        title="Remove entire promotional bundle"
                      >
                        <Trash2 size={11} /> Remove
                      </button>
                    </div>
                  </div>

                  {/* Bundle Items List */}
                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {bundle.items.map((item) => {
                      const isPaid = !item.isFree;
                      return (
                        <div 
                          key={item.id}
                          style={{
                            display: 'flex',
                            gap: '0.75rem',
                            background: isPaid ? '#ffffff' : '#f0fdf4',
                            padding: '0.6rem',
                            borderRadius: '8px',
                            border: isPaid ? '1px solid #e4e4e7' : '1px solid #bbf7d0',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ width: '50px', height: '62px', backgroundColor: '#f0f0f0', backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '4px', flexShrink: 0, position: 'relative' }}>
                            <span style={{ 
                              position: 'absolute', 
                              top: 2, 
                              left: 2, 
                              background: isPaid ? '#09090b' : '#FFC800', 
                              color: isPaid ? '#ffffff' : '#000000', 
                              fontSize: '0.6rem', 
                              fontWeight: 900, 
                              padding: '0.1rem 0.35rem', 
                              borderRadius: '2px' 
                            }}>
                              {isPaid ? 'PAID' : 'FREE'}
                            </span>
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ fontWeight: 700, fontSize: '0.825rem', margin: 0, color: '#09090b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.name}
                            </h4>
                            <div style={{ fontSize: '0.725rem', color: '#71717a', margin: '2px 0' }}>
                              Size: <strong>{item.size}</strong> {item.color ? `| ${item.color}` : ''}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '2px' }}>
                              {isPaid ? (
                                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#09090b' }}>
                                  ₹{item.price.toFixed(2)} PAID
                                </span>
                              ) : (
                                <>
                                  <span style={{ fontSize: '0.75rem', color: '#a1a1aa', textDecoration: 'line-through' }}>
                                    ₹{(item.originalPrice || 0).toFixed(2)}
                                  </span>
                                  <span style={{ fontWeight: 900, color: '#16a34a', fontSize: '0.85rem' }}>
                                    ₹0.00 FREE
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Bundle Pricing Summary */}
                    <div style={{ 
                      marginTop: '0.25rem', 
                      paddingTop: '0.5rem', 
                      borderTop: '1px dashed #cbd5e1', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      fontSize: '0.775rem' 
                    }}>
                      <span style={{ color: '#166534', fontWeight: 700 }}>
                        Bundle Savings ({bundle.items.filter(i => i.isFree).length} Free Item{bundle.items.filter(i => i.isFree).length > 1 ? 's' : ''}):
                      </span>
                      <span style={{ color: '#166534', fontWeight: 800 }}>
                        -₹{bundle.groupSavings.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* 2. STANDALONE (NON-PROMOTIONAL) ITEMS */}
              {standaloneItems.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.725rem', fontWeight: 800, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    Standard Items
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {standaloneItems.map(item => (
                      <div key={item.id} style={{ display: 'flex', gap: '1rem', background: '#fafafa', padding: '0.75rem', borderRadius: '8px', border: '1px solid #f4f4f5' }}>
                        <div style={{ width: '64px', height: '80px', backgroundColor: '#f0f0f0', backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '6px', flexShrink: 0 }} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4 style={{ fontWeight: 700, fontSize: '0.875rem', margin: 0, color: '#09090b', lineHeight: 1.3 }}>{item.name}</h4>
                            <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: 0 }} title="Remove item">
                              <X size={16} />
                            </button>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#71717a', margin: '0.2rem 0' }}>
                            {item.size && `Size: ${item.size}`} {item.color && `| ${item.color}`}
                          </div>
                          <div style={{ fontWeight: 800, marginTop: 'auto', fontSize: '0.9rem', color: '#09090b' }}>
                            ₹{item.price.toFixed(2)}
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.45rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#71717a', textTransform: 'uppercase' }}>
                              Qty
                            </span>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                              <button 
                                type="button"
                                onClick={() => updateQuantity(item.id, -1)} 
                                style={{ 
                                  background: 'none', 
                                  border: 'none', 
                                  cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer', 
                                  color: item.quantity <= 1 ? '#d4d4d8' : '#18181b', 
                                  padding: '2px 4px', 
                                  display: 'flex', 
                                  alignItems: 'center' 
                                }}
                                disabled={item.quantity <= 1}
                                aria-label="Decrease quantity"
                              >
                                <Minus size={13} strokeWidth={2.2} />
                              </button>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#dc2626', minWidth: '16px', textAlign: 'center' }}>
                                {item.quantity}
                              </span>
                              <button 
                                type="button"
                                onClick={() => updateQuantity(item.id, 1)} 
                                style={{ 
                                  background: 'none', 
                                  border: 'none', 
                                  cursor: 'pointer', 
                                  color: '#18181b', 
                                  padding: '2px 4px', 
                                  display: 'flex', 
                                  alignItems: 'center' 
                                }} 
                                disabled={item.quantity >= item.maxStock}
                                aria-label="Increase quantity"
                              >
                                <Plus size={13} strokeWidth={2.2} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div style={{ padding: '1.25rem clamp(1rem, 4vw, 1.5rem)', borderTop: '1px solid var(--border-gray)', backgroundColor: 'var(--bg-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#71717a' }}>
              <span>Catalog Subtotal</span>
              <span style={{ fontWeight: 600, color: '#09090b' }}>₹{cartCatalogTotal.toFixed(2)}</span>
            </div>

            {cartPromotionalDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#16a34a', fontWeight: 700 }}>
                <span>{(promoBundles[0]?.items[0]?.promotionRule || bogoPromoConfig?.name || bogoPromoConfig?.offerName || 'Promotion')} Discount</span>
                <span>-₹{cartPromotionalDiscount.toFixed(2)}</span>
              </div>
            )}


            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.15rem', fontSize: '1.15rem', fontWeight: 900, borderTop: '1px solid #e4e4e7', paddingTop: '0.5rem' }}>
              <span>Total Payable</span>
              <span>₹{cartTotal.toFixed(2)}</span>
            </div>

            <button
              type="button"
              onClick={handleProceedToCheckout}
              style={{ display: 'block', width: '100%', textAlign: 'center', textDecoration: 'none', cursor: 'pointer', border: 'none', padding: '0.85rem', borderRadius: '9999px', fontWeight: 800, fontSize: '0.95rem' }}
              className="btn-primary"
            >
              Proceed to Checkout →
            </button>
          </div>
        )}
      </div>

      <FreeProductSelectorModal />
      <ForgottenFreeItemsModal
        isOpen={isForgottenModalOpen}
        onClose={() => setIsForgottenModalOpen(false)}
        onOpenSelector={() => {
          setIsForgottenModalOpen(false);
          openBogoSelectorFor();
        }}
        onProceedWithoutFree={handleProceedWithoutFree}
        unclaimedCount={allowedFreeItemsCount - freeItemsCount}
      />
    </>
  );
}
