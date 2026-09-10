"use client";

import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface ConfirmDeleteAddressModalProps {
  isOpen: boolean;
  address: any | null;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export default function ConfirmDeleteAddressModal({
  isOpen,
  address,
  onClose,
  onConfirm,
  loading,
}: ConfirmDeleteAddressModalProps) {
  if (!isOpen || !address) return null;

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
          maxWidth: '440px',
          padding: '1.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#09090b' }}>
              Delete this address?
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#71717a' }}>
              This address will be removed from your saved address book.
            </p>
          </div>
        </div>

        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            color: '#334155',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, color: '#09090b', marginBottom: '2px' }}>
            {address.full_name}
          </div>
          <div>
            {address.address}, {address.city}, {address.state} - {address.pincode}
          </div>
          <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '4px' }}>
            Mobile: +91 {address.phone}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '6px',
              border: '1px solid #d4d4d8',
              background: '#ffffff',
              color: '#52525b',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '6px',
              border: 'none',
              background: '#dc2626',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              opacity: loading ? 0.7 : 1,
            }}
          >
            <Trash2 size={15} />
            <span>{loading ? 'Deleting...' : 'Delete Address'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
