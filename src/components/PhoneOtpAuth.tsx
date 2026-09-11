"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { AlertCircle, RefreshCw, ArrowRight, Check, CheckCircle2 } from 'lucide-react';
import styles from './PhoneOtpAuth.module.css';

interface PhoneOtpAuthProps {
  onSuccess?: (user: any) => void;
  defaultPhone?: string;
  submitButtonText?: string;
  compact?: boolean;
}

function mapFirebaseError(err: any, fallback: string): string {
  const code = err?.code || '';
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Please enter a valid 10-digit mobile number.';
    case 'auth/too-many-requests':
      return 'Too many OTP attempts. Please wait and try again later.';
    case 'auth/quota-exceeded':
      return 'OTP service limit reached. Please try again later.';
    case 'auth/captcha-check-failed':
      return 'Verification failed. Please try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    case 'auth/invalid-app-credential':
      return 'Verification could not be completed. Please try again.';
    case 'auth/code-expired':
      return 'This OTP has expired. Please request a new OTP.';
    case 'auth/invalid-verification-code':
      return 'Incorrect OTP. Please check the code and try again.';
    case 'auth/missing-verification-code':
      return 'Please enter the 6-digit OTP.';
    case 'auth/app-not-authorized':
      return 'This domain is not authorized for phone authentication.';
    default:
      return err?.message || fallback;
  }
}

export default function PhoneOtpAuth({
  onSuccess,
  defaultPhone = '',
  submitButtonText = 'Verify & Continue',
  compact = false,
}: PhoneOtpAuthProps) {
  const [phoneNumber, setPhoneNumber] = useState(() => {
    const raw = (defaultPhone || '').replace(/\D/g, '');
    if (raw.length === 12 && raw.startsWith('91')) return raw.slice(2);
    return raw.slice(0, 10);
  });

  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Synchronous ref to always hold the most recent ConfirmationResult
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerId = useRef<string>(`recaptcha-verifier-${Math.random().toString(36).substring(2, 9)}`);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up reCAPTCHA verifier and clear DOM element
  const cleanupRecaptcha = useCallback(() => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // Ignore cleanup errors
      }
      recaptchaVerifierRef.current = null;
    }
    if (typeof document !== 'undefined') {
      const container = document.getElementById(recaptchaContainerId.current);
      if (container) {
        container.innerHTML = '';
      }
    }
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      return;
    }

    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, [resendCooldown]);

  // Clean up verifier and timers on unmount
  useEffect(() => {
    return () => {
      cleanupRecaptcha();
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, [cleanupRecaptcha]);

  // Helper to extract 10 clean digits
  const getClean10Digits = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      return digitsOnly.slice(2);
    }
    if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
      return digitsOnly.slice(1);
    }
    return digitsOnly.slice(0, 10);
  };

  // Safe RecaptchaVerifier initializer
  const getRecaptchaVerifier = () => {
    if (typeof window === 'undefined' || !auth) {
      return null;
    }

    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current;
    }

    const container = document.getElementById(recaptchaContainerId.current);
    if (!container) {
      console.error('[Recaptcha] Container element not found in DOM');
      return null;
    }

    container.innerHTML = '';

    try {
      const verifier = new RecaptchaVerifier(auth, recaptchaContainerId.current, {
        size: 'invisible',
        callback: () => {
          // Invisible verification successful
        },
        'expired-callback': () => {
          setError('Security verification expired. Please request a new OTP.');
          cleanupRecaptcha();
        },
      });

      recaptchaVerifierRef.current = verifier;
      return verifier;
    } catch (err: any) {
      console.error('[Recaptcha Init Error]:', err);
      cleanupRecaptcha();
      return null;
    }
  };

  // Format Indian Mobile for display
  const getFormattedPhoneDisplay = (raw: string) => {
    const digits = getClean10Digits(raw);
    if (digits.length === 10) {
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return `+91 ${digits}`;
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading || resendLoading || verifying) return;

    setError('');
    setResendSuccess('');

    const digits = getClean10Digits(phoneNumber);
    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);

    try {
      cleanupRecaptcha();

      const appVerifier = getRecaptchaVerifier();
      if (!appVerifier) {
        setError('Security verification could not be initialized. Please refresh and try again.');
        return;
      }

      const formattedE164 = `+91${digits}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedE164, appVerifier);

      confirmationResultRef.current = confirmation;
      setConfirmationResult(confirmation);
      setStep('OTP');
      setResendCooldown(30);
      setOtpCode('');
      setError('');
      setResendSuccess('');
    } catch (err: any) {
      console.error('[Firebase Phone Auth Send OTP Error]:', err?.code || err);
      cleanupRecaptcha();
      setError(mapFirebaseError(err, 'Failed to send OTP SMS. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Step 2 (Optional): Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resendLoading || loading || verifying) return;

    setError('');
    setResendSuccess('');

    const digits = getClean10Digits(phoneNumber);
    if (digits.length !== 10) {
      setError('Invalid mobile number. Please re-enter your 10-digit number.');
      setStep('PHONE');
      return;
    }

    setResendLoading(true);

    try {
      cleanupRecaptcha();

      const appVerifier = getRecaptchaVerifier();
      if (!appVerifier) {
        setError('Security verification could not be initialized. Please try again.');
        return;
      }

      const formattedE164 = `+91${digits}`;
      const newConfirmation = await signInWithPhoneNumber(auth, formattedE164, appVerifier);

      // Replace old confirmation result with new one
      confirmationResultRef.current = newConfirmation;
      setConfirmationResult(newConfirmation);

      setResendCooldown(30);
      setResendSuccess('A new OTP has been sent.');
      setError('');
    } catch (err: any) {
      console.error('[Firebase Phone Auth Resend OTP Error]:', err?.code || err);
      cleanupRecaptcha();
      setError(mapFirebaseError(err, 'Failed to resend OTP. Please try again.'));
    } finally {
      setResendLoading(false);
    }
  };

  // Step 3: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifying || loading || resendLoading) return;

    setError('');
    setResendSuccess('');

    const cleanOtp = otpCode.trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setError('Please enter the full 6-digit OTP sent to your phone.');
      return;
    }

    const activeConfirmation = confirmationResultRef.current || confirmationResult;
    if (!activeConfirmation) {
      setError('This OTP session has expired. Please request a new OTP.');
      return;
    }

    setVerifying(true);

    try {
      // 1. Verify OTP with Firebase Auth
      const userCredential = await activeConfirmation.confirm(cleanOtp);
      const firebaseUser = userCredential.user;

      // 2. Fetch Firebase ID token
      const idToken = await firebaseUser.getIdToken();
      const digits = getClean10Digits(phoneNumber);

      // 3. Establish persistent HTTP-only customer session on server
      const sessionRes = await fetch('/api/auth/phone/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: firebaseUser.uid,
          phone: digits,
          idToken,
        }),
      });

      const sessionData = await sessionRes.json();

      if (sessionRes.ok && sessionData.success) {
        setIsVerified(true);
        cleanupRecaptcha();
        if (onSuccess) {
          onSuccess(sessionData.user);
        }
      } else {
        setError(sessionData.error || 'Failed to complete session setup. Please try again.');
      }
    } catch (err: any) {
      console.error('[Firebase Phone Auth Verify Error]:', err?.code || err);
      if (err?.code === 'auth/invalid-verification-code') {
        setError('Incorrect OTP. Please check the code and try again.');
      } else if (err?.code === 'auth/code-expired') {
        setError('This OTP has expired. Please request a new OTP.');
      } else {
        setError(mapFirebaseError(err, 'Verification failed. Please try again.'));
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      {/* Invisible reCAPTCHA container */}
      <div id={recaptchaContainerId.current} />

      {isVerified && (
        <div className={styles.verifiedSuccess}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>Mobile number verified</span>
        </div>
      )}

      {error && (
        <div className={styles.errorAlert} role="alert">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {resendSuccess && !error && (
        <div className={styles.successAlert} role="status">
          <Check size={15} style={{ flexShrink: 0 }} />
          <span>{resendSuccess}</span>
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
                  cleanupRecaptcha();
                  setStep('PHONE');
                  setError('');
                  setResendSuccess('');
                }}
                className={styles.editPhoneBtn}
              >
                Change ({getFormattedPhoneDisplay(phoneNumber)})
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
            <p className={styles.phoneMaskNotice}>
              OTP sent to {getFormattedPhoneDisplay(phoneNumber)}
            </p>
          </div>

          <div className={styles.resendRow}>
            {resendCooldown > 0 ? (
              <span className={styles.cooldownText}>
                Resend OTP in <strong>{resendCooldown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendLoading || loading || verifying}
                className={styles.resendBtn}
              >
                {resendLoading ? (
                  <span className={styles.btnContent} style={{ display: 'inline-flex' }}>
                    <RefreshCw size={12} className={styles.spinner} /> Resending OTP...
                  </span>
                ) : (
                  'Resend OTP'
                )}
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={verifying || loading || resendLoading || otpCode.length !== 6}
            className={styles.submitBtn}
          >
            {verifying ? (
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
