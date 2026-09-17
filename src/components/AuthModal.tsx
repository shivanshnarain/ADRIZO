"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { X, Eye, EyeOff, AlertCircle, CheckCircle, Phone } from 'lucide-react';
import { useAuth, AuthMode } from '@/context/AuthContext';
import styles from './AuthModal.module.css';
import PhoneOtpAuth from './PhoneOtpAuth';

export default function AuthModal() {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    fetchUser, 
    authModalMode, 
    authRedirectUrl,
    triggerAuthSuccess,
    broadcastAuthChange,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('SIGN_IN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  // Sync mode with context when modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
      setMode(authModalMode || 'SIGN_IN');
      setError('');
      setErrorCode('');
      setResetMessage('');
    }
  }, [isAuthModalOpen, authModalMode]);

  // Sign In fields
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up fields
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);

  // Forgot Password fields
  const [forgotEmail, setForgotEmail] = useState('');

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    closeAuthModal();
    setTimeout(() => {
      setMode('SIGN_IN');
      setError('');
      setResetMessage('');
      setLoading(false);
      setSignInPassword('');
      setSignUpPassword('');
      setSignUpConfirmPassword('');
      setShowSignInPassword(false);
      setShowSignUpPassword(false);
      setShowSignUpConfirmPassword(false);
    }, 200);
  }, [closeAuthModal]);

  // Lock background scroll when modal is active
  useEffect(() => {
    if (isAuthModalOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isAuthModalOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, handleClose]);

  if (!isAuthModalOpen) return null;

  // Handle Sign In submission
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!signInEmail.trim() || !signInPassword) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signInEmail.trim(),
          password: signInPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setErrorCode('');
        if (data.role === 'ADMIN' || data.redirect === '/admin/dashboard') {
          window.location.href = data.redirect || '/admin/dashboard';
          return;
        }

        await fetchUser();
        broadcastAuthChange('LOGIN');
        triggerAuthSuccess();
        handleClose();
        if (authRedirectUrl) {
          window.location.href = authRedirectUrl;
        }
      } else {
        setErrorCode(data.code || '');
        setError(data.error || 'Invalid email or password. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Up submission
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!signUpName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!signUpEmail.trim()) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signUpEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    if (!signUpPassword || signUpPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signUpName.trim(),
          email: signUpEmail.trim(),
          phone: signUpPhone.trim() || undefined,
          password: signUpPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Automatically sign in or fetch profile
        await fetchUser();
        broadcastAuthChange('LOGIN');
        triggerAuthSuccess();
        handleClose();
        if (authRedirectUrl) {
          window.location.href = authRedirectUrl;
        }
      } else {
        setError(data.error || 'Registration failed. Please check your details.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password submission
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');

    if (!forgotEmail.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResetMessage('Password reset link has been sent to your email.');
      } else {
        setError(data.error || 'Failed to send reset email. Please verify your email.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          className={styles.closeBtn}
          onClick={handleClose}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Left Side: Exact Supplied Fashion Image */}
        <div className={styles.imageColumn}>
          <img
            src="/auth_modal_image.png"
            alt="ADRIZO Fashion"
            className={styles.modalImage}
          />
        </div>

        {/* Right Side: Authentication Form */}
        <div className={styles.contentColumn}>
          {/* Error Alert */}
          {error && (
            <div className={styles.errorAlert} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
              {errorCode === 'USER_NOT_FOUND' && mode === 'SIGN_IN' && (
                <button
                  type="button"
                  onClick={() => {
                    setSignUpEmail(signInEmail);
                    setMode('SIGN_UP');
                    setError('');
                    setErrorCode('');
                  }}
                  style={{
                    background: '#09090b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: '0.2rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  Create Account with {signInEmail} →
                </button>
              )}
            </div>
          )}

          {/* Success Alert */}
          {resetMessage && (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <CheckCircle size={16} style={{ flexShrink: 0, color: '#059669' }} />
              <span>{resetMessage}</span>
            </div>
          )}

          {/* Top Segmented Mode Switcher */}
          {mode !== 'FORGOT_PASSWORD' && (
            <div className={styles.segmentedTabs}>
              <button
                type="button"
                className={`${styles.tabBtn} ${mode === 'SIGN_IN' ? styles.tabBtnActive : ''}`}
                onClick={() => {
                  setMode('SIGN_IN');
                  setError('');
                  setErrorCode('');
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${mode === 'PHONE_OTP' ? styles.tabBtnActive : ''}`}
                onClick={() => {
                  setMode('PHONE_OTP');
                  setError('');
                  setErrorCode('');
                }}
              >
                Phone OTP
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${mode === 'SIGN_UP' ? styles.tabBtnActive : ''}`}
                onClick={() => {
                  setMode('SIGN_UP');
                  setError('');
                  setErrorCode('');
                }}
              >
                Create Account
              </button>
            </div>
          )}

          {/* =========================================
              VIEW 0: PHONE OTP LOGIN
             ========================================= */}
          {mode === 'PHONE_OTP' && (
            <div className={styles.formWrapper}>
              <div className={styles.headerSection}>
                <h2 className={styles.title}>PHONE LOGIN</h2>
                <p className={styles.subtitle}>Sign in or register instantly via OTP</p>
              </div>

              <PhoneOtpAuth
                onSuccess={async () => {
                  await fetchUser();
                  broadcastAuthChange('LOGIN');
                  triggerAuthSuccess();
                  handleClose();
                  if (authRedirectUrl) {
                    window.location.href = authRedirectUrl;
                  }
                }}
                submitButtonText="Verify & Sign In"
              />

              <div className={styles.switchModeRow} style={{ marginTop: '1.5rem' }}>
                <span>Prefer email & password?</span>{' '}
                <button
                  type="button"
                  className={styles.switchModeBtn}
                  onClick={() => {
                    setMode('SIGN_IN');
                    setError('');
                  }}
                >
                  Sign In with Password
                </button>
              </div>
            </div>
          )}

          {/* =========================================
              VIEW 1: SIGN IN (DEFAULT)
             ========================================= */}
          {mode === 'SIGN_IN' && (
            <div className={styles.formWrapper}>
              <div className={styles.headerSection}>
                <h2 className={styles.title}>SIGN IN</h2>
                <p className={styles.subtitle}>Welcome back to ADRIZO</p>
              </div>

              <form onSubmit={handleSignIn} className={styles.authForm}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Email Address</label>
                  <input
                    type="email"
                    className={styles.textInput}
                    placeholder="Enter your email address"
                    value={signInEmail}
                    onChange={(e) => {
                      setSignInEmail(e.target.value);
                      if (error) setError('');
                    }}
                    autoFocus
                    required
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Password</label>
                  <div className={styles.passwordInputWrapper}>
                    <input
                      type={showSignInPassword ? 'text' : 'password'}
                      className={styles.passwordInput}
                      placeholder="Enter your password"
                      value={signInPassword}
                      onChange={(e) => {
                        setSignInPassword(e.target.value);
                        if (error) setError('');
                      }}
                      required
                    />
                    <button
                      type="button"
                      className={styles.passwordToggleBtn}
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignInPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.35rem', marginBottom: '0.85rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('FORGOT_PASSWORD');
                      setError('');
                      setResetMessage('');
                      setForgotEmail(signInEmail);
                    }}
                    style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={loading || !signInEmail.trim() || !signInPassword}
                >
                  {loading ? (
                    <>
                      <div className={styles.spinner} />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    'SIGN IN'
                  )}
                </button>

                {/* Legal Consent Text */}
                <p className={styles.legalConsent}>
                  By continuing you agree to the{' '}
                  <Link
                    href="/terms-and-conditions"
                    className={styles.legalLink}
                    onClick={handleClose}
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/privacy-policy"
                    className={styles.legalLink}
                    onClick={handleClose}
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>

                {/* Switch to Sign Up */}
                <div className={styles.switchModeRow}>
                  <span>Don&apos;t have an account?</span>{' '}
                  <button
                    type="button"
                    className={styles.switchModeBtn}
                    onClick={() => {
                      setMode('SIGN_UP');
                      setError('');
                      setResetMessage('');
                    }}
                  >
                    Sign Up
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =========================================
              VIEW 2: CREATE ACCOUNT / SIGN UP
             ========================================= */}
          {mode === 'SIGN_UP' && (
            <div className={styles.formWrapper}>
              <div className={styles.headerSection}>
                <h2 className={styles.title}>CREATE ACCOUNT</h2>
                <p className={styles.subtitle}>Join ADRIZO for exclusive collections</p>
              </div>

              <form onSubmit={handleSignUp} className={styles.authForm}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Full Name</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    placeholder="Enter your full name"
                    value={signUpName}
                    onChange={(e) => {
                      setSignUpName(e.target.value);
                      if (error) setError('');
                    }}
                    autoFocus
                    required
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Email Address</label>
                  <input
                    type="email"
                    className={styles.textInput}
                    placeholder="name@example.com"
                    value={signUpEmail}
                    onChange={(e) => {
                      setSignUpEmail(e.target.value);
                      if (error) setError('');
                    }}
                    required
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Phone Number (Optional)</label>
                  <input
                    type="tel"
                    className={styles.textInput}
                    placeholder="10-digit mobile number"
                    value={signUpPhone}
                    maxLength={10}
                    onChange={(e) => {
                      setSignUpPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                      if (error) setError('');
                    }}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Password</label>
                  <div className={styles.passwordInputWrapper}>
                    <input
                      type={showSignUpPassword ? 'text' : 'password'}
                      className={styles.passwordInput}
                      placeholder="At least 6 characters"
                      value={signUpPassword}
                      onChange={(e) => {
                        setSignUpPassword(e.target.value);
                        if (error) setError('');
                      }}
                      required
                    />
                    <button
                      type="button"
                      className={styles.passwordToggleBtn}
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignUpPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Confirm Password</label>
                  <div className={styles.passwordInputWrapper}>
                    <input
                      type={showSignUpConfirmPassword ? 'text' : 'password'}
                      className={styles.passwordInput}
                      placeholder="Re-enter password"
                      value={signUpConfirmPassword}
                      onChange={(e) => {
                        setSignUpConfirmPassword(e.target.value);
                        if (error) setError('');
                      }}
                      required
                    />
                    <button
                      type="button"
                      className={styles.passwordToggleBtn}
                      onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
                      aria-label={showSignUpConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignUpConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={loading || !signUpName.trim() || !signUpEmail.trim() || !signUpPassword}
                >
                  {loading ? (
                    <>
                      <div className={styles.spinner} />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    'SIGN UP'
                  )}
                </button>

                {/* Legal Consent Text */}
                <p className={styles.legalConsent}>
                  By continuing you agree to the{' '}
                  <Link
                    href="/terms-and-conditions"
                    className={styles.legalLink}
                    onClick={handleClose}
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/privacy-policy"
                    className={styles.legalLink}
                    onClick={handleClose}
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>

                {/* Switch to Sign In */}
                <div className={styles.switchModeRow}>
                  <span>Already have an account?</span>{' '}
                  <button
                    type="button"
                    className={styles.switchModeBtn}
                    onClick={() => {
                      setMode('SIGN_IN');
                      setError('');
                      setResetMessage('');
                    }}
                  >
                    Sign In
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =========================================
              VIEW 3: FORGOT PASSWORD
             ========================================= */}
          {mode === 'FORGOT_PASSWORD' && (
            <div className={styles.formWrapper}>
              <div className={styles.headerSection}>
                <h2 className={styles.title}>RESET PASSWORD</h2>
                <p className={styles.subtitle}>We will send a password reset link to your email</p>
              </div>

              <form onSubmit={handleForgotPassword} className={styles.authForm}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Email Address</label>
                  <input
                    type="email"
                    className={styles.textInput}
                    placeholder="Enter your registered email"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (error) setError('');
                      if (resetMessage) setResetMessage('');
                    }}
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={loading || !forgotEmail.trim()}
                >
                  {loading ? (
                    <>
                      <div className={styles.spinner} />
                      <span>Sending Link...</span>
                    </>
                  ) : (
                    'SEND RESET LINK'
                  )}
                </button>

                {/* Back to Sign In */}
                <div className={styles.switchModeRow}>
                  <button
                    type="button"
                    className={styles.switchModeBtn}
                    onClick={() => {
                      setMode('SIGN_IN');
                      setError('');
                      setResetMessage('');
                    }}
                  >
                    &larr; Back to Sign In
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
