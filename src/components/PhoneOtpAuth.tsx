"use client";

import React, { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Phone, ShieldCheck, AlertCircle, RefreshCw, ArrowRight, Check } from 'lucide-react';
import styles from './PhoneOtpAuth.module.css';

interface PhoneOtpAuthProps {
  onSuccess?: (user: any) => void;
  defaultPhone?: string;
  submitButtonText?: string;
  compact?: boolean;
}

export default function PhoneOtpAuth({
  onSuccess,
  defaultPhone = '',
  submitButtonText = 'Verify & Continue',
  compact = false,
}: PhoneOtpAuthProps) {
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone.replace(/\D/g, '').slice(0, 10));
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerId = useRef<string>(`recaptcha-container-${Math.random().toString(36).substring(2, 9)}`);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Clean up reCAPTCHA verifier on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // Ignore cleanup errors
        }
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  // Initialize RecaptchaVerifier safely
  const initRecaptchaVerifier = () => {
    if (typeof window === 'undefined' || !auth) return null;

    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current;
    }

    try {
      const container = document.getElementById(recaptchaContainerId.current);
      if (!container) return null;

      const verifier = new RecaptchaVerifier(auth, recaptchaContainerId.current, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please try requesting OTP again.');
        },
      });

      recaptchaVerifierRef.current = verifier;
      return verifier;
    } catch (err: any) {
      console.error('[Recaptcha Init Error]', err);
      setError(err.message || 'Failed to initialize security verification.');
      return null;
    }
  };

  // Format Indian Mobile: +91 XXXXX XXXXX
  const getE164Phone = (digits: string) => {
    return `+91${digits.trim()}`;
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const cleanDigits = phoneNumber.trim().replace(/\D/g, '');
    if (cleanDigits.length !== 10 || !/^[6-9]\d{9}$/.test(cleanDigits)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);

    try {
      const appVerifier = initRecaptchaVerifier();
      if (!appVerifier) {
        setError('Security verification could not be initialized. Please refresh the page.');
        setLoading(false);
        return;
      }

      const formattedNumber = getE164Phone(cleanDigits);
      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, appVerifier);

      setConfirmationResult(confirmation);
      setStep('OTP');
      setResendCooldown(30);
      setOtpCode('');
    } catch (err: any) {
      console.error('[Firebase Phone Auth Error]', err);

      // Reset reCAPTCHA on failure so user can retry cleanly
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {}
        recaptchaVerifierRef.current = null;
      }

      let errorMsg = 'Failed to send OTP SMS. Please try again.';
      if (err.code === 'auth/invalid-phone-number') {
        errorMsg = 'Invalid phone number format.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMsg = 'Too many requests. Please wait a few minutes before trying again.';
      } else if (err.code === 'auth/quota-exceeded') {
        errorMsg = 'SMS quota exceeded for today. Please try again later or use email.';
      } else if (err.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanOtp = otpCode.trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setError('Please enter the full 6-digit OTP sent to your phone.');
      return;
    }

    if (!confirmationResult) {
      setError('Session expired. Please request a new OTP.');
      setStep('PHONE');
      return;
    }

    setLoading(true);

    try {
      // 1. Verify OTP with Firebase Auth
      const userCredential = await confirmationResult.confirm(cleanOtp);
      const firebaseUser = userCredential.user;
      const idToken = await firebaseUser.getIdToken();

      // 2. Establish persistent session with backend
      const sessionRes = await fetch('/api/auth/phone/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: firebaseUser.uid,
          phone: phoneNumber.trim(),
          idToken,
        }),
      });

      const sessionData = await sessionRes.json();

      if (sessionRes.ok && sessionData.success) {
        if (onSuccess) {
          onSuccess(sessionData.user);
        }
      } else {
        setError(sessionData.error || 'Failed to complete session setup. Please try again.');
      }
    } catch (err: any) {
      console.error('[Firebase OTP Verification Error]', err);
      let errorMsg = 'Invalid OTP. Please check the code and try again.';
      if (err.code === 'auth/invalid-verification-code') {
        errorMsg = 'Incorrect OTP entered. Please try again.';
      } else if (err.code === 'auth/code-expired') {
        errorMsg = 'This OTP has expired. Please click Resend OTP.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      {/* Invisible reCAPTCHA container */}
      <div id={recaptchaContainerId.current} />

      {error && (
        <div className={styles.errorAlert} role="alert">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {step === 'PHONE' ? (
        <form onSubmit={handleSendOtp} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Mobile Number <span className={styles.required}>*</span>
            </label>
            <div className={styles.phoneInputRow}>
              <span className={styles.countryCode}>+91</span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                required
                placeholder="Enter 10-digit mobile number"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
                  if (error) setError('');
                }}
                className={styles.phoneInput}
                autoFocus
              />
            </div>
            <p className={styles.helperText}>
              We will send a 6-digit OTP verification code via SMS.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || phoneNumber.length !== 10}
            className={styles.submitBtn}
          >
            {loading ? (
              <span className={styles.btnContent}>
                <RefreshCw size={15} className={styles.spinner} /> Sending OTP...
              </span>
            ) : (
              <span className={styles.btnContent}>
                Send OTP <ArrowRight size={15} />
              </span>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className={styles.form}>
          <div className={styles.formGroup}>
            <div className={styles.otpHeader}>
              <label className={styles.label}>
                Enter 6-Digit OTP <span className={styles.required}>*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setStep('PHONE');
                  setError('');
                }}
                className={styles.editPhoneBtn}
              >
                Change (+91 {phoneNumber})
              </button>
            </div>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              required
              placeholder="••••••"
              value={otpCode}
              onChange={(e) => {
                setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                if (error) setError('');
              }}
              className={styles.otpInput}
              autoFocus
            />
          </div>

          <div className={styles.resendRow}>
            {resendCooldown > 0 ? (
              <span className={styles.cooldownText}>
                Resend OTP in <strong>{resendCooldown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={loading}
                className={styles.resendBtn}
              >
                Resend OTP
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || otpCode.length !== 6}
            className={styles.submitBtn}
          >
            {loading ? (
              <span className={styles.btnContent}>
                <RefreshCw size={15} className={styles.spinner} /> Verifying...
              </span>
            ) : (
              <span className={styles.btnContent}>
                <Check size={16} /> {submitButtonText}
              </span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
