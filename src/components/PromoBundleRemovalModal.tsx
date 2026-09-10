"use client";

import React from 'react';
import { Gift, Sparkles, X, RefreshCw, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface PromoBundleRemovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChooseAnother: () => void;
  onRemoveOffer: () => void;
  onRemoveEntireBundle: () => void;
}

export default function PromoBundleRemovalModal({
  isOpen,
  onClose,
  onChooseAnother,
  onRemoveOffer,
  onRemoveEntireBundle,
}: PromoBundleRemovalModalProps) {
  const { bogoPromoConfig } = useCart();
  if (!isOpen) return null;

  const promoName = bogoPromoConfig?.name || bogoPromoConfig?.offerName || 'Promotional';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          maxWidth: '440px',
          width: '100%',
          padding: '1.75rem',
          position: 'relative',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e4e4e7',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: '#f4f4f5',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#71717a',
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#92400e',
              flexShrink: 0,
            }}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#09090b' }}>
              Modify {promoName} Offer
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#71717a' }}>
              Your promotional bundle requires the qualifying items to remain active.
            </p>
          </div>
        </div>

        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.825rem',
            color: '#92400e',
            lineHeight: 1.5,
          }}
        >
          Removing a promotional item changes the bundle. Would you like to select a replacement product from the catalog, or remove the offer?
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={onChooseAnother}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: '#09090b',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <RefreshCw size={15} />
            <span>Choose Another Product (Keep Offer)</span>
          </button>

          <button
            type="button"
            onClick={onRemoveOffer}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '1px solid #e4e4e7',
              background: '#ffffff',
              color: '#09090b',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Gift size={15} />
            <span>Remove Offer &amp; Keep Main Product</span>
          </button>

          <button
            type="button"
            onClick={onRemoveEntireBundle}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: '1px solid #fee2e2',
              background: '#fef2f2',
              color: '#991b1b',
              fontWeight: 700,
              fontSize: '0.825rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Trash2 size={14} />
            <span>Remove All 3 Items From Cart</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem',
              background: 'none',
              border: 'none',
              color: '#71717a',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              textAlign: 'center',
            }}
          >
            Cancel &amp; Keep Bundle
          </button>
        </div>
      </div>
    </div>
  );
}
