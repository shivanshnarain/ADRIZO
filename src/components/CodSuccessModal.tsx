"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ArrowRight, ShoppingBag, Truck } from 'lucide-react';
import styles from './CodSuccessModal.module.css';

interface CodSuccessModalProps {
  isOpen: boolean;
  orderNumber: string;
  total: number;
  codConfirmationPaid?: number;
  codRemaining?: number;
  deliveryAddress: string;
  paymentMethod?: string;
  onTrackOrder?: () => void;
  onViewOrder: () => void;
  onContinueShopping: () => void;
}

export default function CodSuccessModal({
  isOpen,
  orderNumber,
  total,
  codConfirmationPaid = 99,
  codRemaining,
  deliveryAddress,
  paymentMethod = 'COD',
  onTrackOrder,
  onViewOrder,
  onContinueShopping,
}: CodSuccessModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const isPrepaid = paymentMethod !== 'COD';
  const remainingCod = codRemaining !== undefined ? codRemaining : Math.max(0, total - codConfirmationPaid);

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconWrapper}>
          <CheckCircle2 size={40} />
        </div>

        <h2 className={styles.title}>🎉 Order Confirmed!</h2>
        <p className={styles.subtitle}>
          {isPrepaid
            ? 'Your online payment was successful and your order is confirmed.'
            : codConfirmationPaid === 0
            ? 'Your Cash on Delivery order has been placed successfully and is confirmed.'
            : 'Your ₹99 confirmation payment was received and your Cash on Delivery order is confirmed.'}
        </p>

        <div className={styles.detailsCard}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Order Number</span>
            <span className={styles.orderNumber}>#{orderNumber}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Payment Method</span>
            <span className={styles.detailValue}>
              {isPrepaid ? 'Online Payment (Razorpay)' : 'Cash on Delivery (COD)'}
            </span>
          </div>

          {isPrepaid ? (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Amount Paid</span>
              <span className={styles.amountPayable}>₹{total.toLocaleString('en-IN')}</span>
            </div>
          ) : codConfirmationPaid === 0 ? (
            <>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Product/Order Total</span>
                <span className={styles.detailValue}>₹{total.toLocaleString('en-IN')}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>COD Handling Fee</span>
                <span className={styles.detailValue}>₹99</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Paid Online Now</span>
                <span className={styles.detailValue} style={{ color: '#16a34a', fontWeight: 700 }}>
                  ₹0
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Payable on Delivery</span>
                <span className={styles.amountPayable} style={{ color: '#b45309' }}>
                  ₹{total.toLocaleString('en-IN')}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Order Total</span>
                <span className={styles.detailValue}>₹{total.toLocaleString('en-IN')}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>COD Confirmation Paid</span>
                <span className={styles.detailValue} style={{ color: '#16a34a', fontWeight: 700 }}>
                  ₹{codConfirmationPaid.toLocaleString('en-IN')} (Paid Online)
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Remaining Payable on Delivery</span>
                <span className={styles.amountPayable} style={{ color: '#b45309' }}>
                  ₹{remainingCod.toLocaleString('en-IN')}
                </span>
              </div>
            </>
          )}

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Delivery Address</span>
            <span className={styles.detailValue} style={{ fontSize: '0.8rem', color: '#475569' }}>
              {deliveryAddress}
            </span>
          </div>
        </div>

        <div className={styles.btnGroup}>
          {onTrackOrder && (
            <button
              type="button"
              className={styles.trackBtn}
              onClick={onTrackOrder}
            >
              <Truck size={17} />
              <span>Track Order</span>
            </button>
          )}

          <div className={styles.btnRow}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={onViewOrder}
            >
              <span>View Order Details</span>
              <ArrowRight size={15} />
            </button>

            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={onContinueShopping}
            >
              <ShoppingBag size={15} />
              <span>Continue Shopping</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
