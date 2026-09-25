"use client";

import React, { useState, useEffect } from 'react';
import { X, Check, Plus, Minus, RefreshCw } from 'lucide-react';

interface EditCheckoutItemModalProps {
  isOpen: boolean;
  item: any | null;
  onClose: () => void;
  onSave: (updatedItem: { id: string; size: string; quantity: number }) => void;
  onReplaceWithProduct?: () => void;
}

export default function EditCheckoutItemModal({
  isOpen,
  item,
  onClose,
  onSave,
  onReplaceWithProduct,
}: EditCheckoutItemModalProps) {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [availableSizes, setAvailableSizes] = useState<string[]>(['S', 'M', 'L', 'XL', 'XXL']);

  useEffect(() => {
    if (item && isOpen) {
      setSelectedSize(item.size || 'M');
      setQuantity(item.quantity || 1);

      // Attempt to fetch fresh sizes from catalog for this product
      if (item.productId) {
        fetch('/api/products/catalog')
          .then((res) => res.json())
          .then((data) => {
            if (data && data.success && Array.isArray(data.products)) {
              const matched = data.products.find((p: any) => p.id === item.productId);
              if (matched && matched.availableSizes && matched.availableSizes.length > 0) {
                setAvailableSizes(matched.availableSizes);
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    onSave({
      id: item.id,
      size: selectedSize,
      quantity,
    });
    onClose();
  };

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
          width: '100%',
          maxWidth: '460px',
          padding: '1.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          position: 'relative',
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
            background: 'none',
            border: 'none',
            color: '#71717a',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
          }}
        >
          <X size={18} />
        </button>

        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#09090b' }}>
          Edit Item
        </h3>

        {/* Product preview */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
          <img
            src={item.image || '/placeholder.png'}
            alt={item.name}
            style={{ width: '56px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#09090b' }}>
              {item.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
              Color: <strong>{item.color || 'Standard'}</strong>
            </div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#09090b', marginTop: '4px' }}>
              ₹{Number(item.price).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Size Selection */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
            Select Size:
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {availableSizes.map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setSelectedSize(sz)}
                style={{
                  minWidth: '42px',
                  height: '38px',
                  padding: '0 0.65rem',
                  borderRadius: '6px',
                  border: selectedSize === sz ? '2px solid #09090b' : '1px solid #cbd5e1',
                  background: selectedSize === sz ? '#09090b' : '#ffffff',
                  color: selectedSize === sz ? '#ffffff' : '#09090b',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity Controls (if not promotional free item) */}
        {!item.isFree && !item.promoGroupId && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
              Quantity:
            </label>
            <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #d4d4d8', borderRadius: '6px', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                style={{ width: '36px', height: '36px', border: 'none', background: '#f4f4f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Minus size={14} />
              </button>
              <span style={{ minWidth: '40px', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                style={{ width: '36px', height: '36px', border: 'none', background: '#f4f4f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          {onReplaceWithProduct ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onReplaceWithProduct();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#09090b',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              <RefreshCw size={13} />
              <span>Replace with another product</span>
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.65rem 1.15rem',
                borderRadius: '6px',
                border: '1px solid #d4d4d8',
                background: '#ffffff',
                color: '#52525b',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '6px',
                border: 'none',
                background: '#09090b',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Check size={14} />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
