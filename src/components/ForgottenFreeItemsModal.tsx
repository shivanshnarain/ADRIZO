"use client";

import React, { useState } from 'react';
import { Gift, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import styles from './ForgottenFreeItemsModal.module.css';

interface ForgottenFreeItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSelector: () => void;
  onProceedWithoutFree: () => void;
  unclaimedCount: number;
}

export default function ForgottenFreeItemsModal({
  isOpen,
  onClose,
  onOpenSelector,
  onProceedWithoutFree,
  unclaimedCount,
}: ForgottenFreeItemsModalProps) {
  const { bogoPromoConfig } = useCart();
  const [showForfeitWarning, setShowForfeitWarning] = useState(false);

  if (!isOpen) return null;

  const promoName = bogoPromoConfig?.name || bogoPromoConfig?.offerName || 'SPECIAL OFFER';
  const freeQty = unclaimedCount || bogoPromoConfig?.freeQuantity || 2;

  const handleForfeitClick = () => {
    if (!showForfeitWarning) {
      setShowForfeitWarning(true);
    } else {
      setShowForfeitWarning(false);
      onProceedWithoutFree();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: '#71717a',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
          }}
          title="Close"
        >
          <X size={18} />
        </button>

        <div className={styles.iconWrapper}>
          <Gift size={32} />
        </div>

        <h3 className={styles.title}>
          🎁 Add Your {freeQty} Free Product{freeQty > 1 ? 's' : ''}
        </h3>

        <p className={styles.description}>
          You’ve unlocked <strong>{freeQty} FREE product{freeQty > 1 ? 's' : ''}</strong> with this purchase under our <strong>{promoName}</strong> promotion!
        </p>


        <div className={styles.highlightBox}>
          <div>✓ No extra charge (₹0 for free items)</div>
          <div>✓ Choose the same product or any other eligible item</div>
          <div>✓ Pick your desired size &amp; color</div>
        </div>

        <div className={styles.btnGroup}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              setShowForfeitWarning(false);
              onOpenSelector();
            }}
          >
            <Gift size={18} />
            <span>Choose FREE Products Now</span>
          </button>

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleForfeitClick}
          >
            {showForfeitWarning
              ? 'Yes, I Forfeit My Free Products → Proceed to Checkout'
              : 'Continue Without FREE Items'}
          </button>
        </div>

        {showForfeitWarning && (
          <div className={styles.warningNotice}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '2px' }}>
              <AlertTriangle size={14} /> Attention:
            </div>
            If you continue now, the {freeQty} free promotional product{freeQty > 1 ? 's' : ''} will NOT be included in this order. Are you sure you want to proceed without them? Click the button above to confirm.

          </div>
        )}
      </div>
    </div>
  );
}
