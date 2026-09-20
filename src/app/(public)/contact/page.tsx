"use client";

import { useState } from 'react';
import { MapPin, Phone, Mail, CheckCircle } from 'lucide-react';
import styles from './contact.module.css';
import { createEnquiry } from '../../../actions/enquiries';

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const res = await createEnquiry(formData);
    
    setLoading(false);
    
    if (res.success) {
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
    } else {
      setError(res.error || 'Failed to submit enquiry');
    }
  };

  return (
    <div className="container section-padding">
      <h1 className="section-title">Contact Us</h1>
      
      <div className={styles.contactLayout}>
        <div className={styles.infoSection}>
          <h2 className={styles.subTitle}>Get In Touch</h2>
          <p className={styles.description}>
            Have a question about our products, sizing, or an existing order? 
            We're here to help. Reach out to us through any of the channels below or fill out the form.
          </p>

          <div className={styles.contactDetails}>
            <div className={styles.detailItem}>
              <div className={styles.iconWrapper}>
                <MapPin size={24} />
              </div>
              <div>
                <h4 className={styles.detailTitle}>Our Store</h4>
                <p className={styles.detailText}>123 Fashion Street, New Delhi, India 110001</p>
              </div>
            </div>

            <div className={styles.detailItem}>
              <div className={styles.iconWrapper}>
                <Phone size={24} />
              </div>
              <div>
                <h4 className={styles.detailTitle}>Phone Number</h4>
                <p className={styles.detailText}>
                  <a href="tel:+919773777410" style={{ color: 'inherit', textDecoration: 'none' }}>
                    +91 9773777410
                  </a>
                </p>
              </div>
            </div>

            <div className={styles.detailItem}>
              <div className={styles.iconWrapper}>
                <Mail size={24} />
              </div>
              <div>
                <h4 className={styles.detailTitle}>Email Address</h4>
                <p className={styles.detailText}>support@uniqueindiagarments.com</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.subTitle}>Send a Message</h2>
          
          {success ? (
            <div style={{ backgroundColor: '#e6ffe6', border: '1px solid #4caf50', padding: '2rem', borderRadius: '8px', textAlign: 'center' }}>
              <CheckCircle size={48} color="#4caf50" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ marginBottom: '0.5rem', color: '#2e7d32' }}>Message Sent!</h3>
              <p style={{ color: '#388e3c' }}>Thank you for reaching out. We will get back to you shortly.</p>
              <button className="btn-outline" style={{ marginTop: '1.5rem' }} onClick={() => setSuccess(false)}>Send Another Message</button>
            </div>
          ) : (
            <form className={styles.contactForm} onSubmit={handleSubmit}>
              {error && (
                <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                  {error}
                </div>
              )}
              <div className={styles.formRow}>
                <div className="form-group">
                  <label className="form-label" htmlFor="name">Your Name</label>
                  <input type="text" id="name" name="name" className="form-input" placeholder="John Doe" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email Address</label>
                  <input type="email" id="email" name="email" className="form-input" placeholder="john@example.com" required />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Phone Number (Optional)</label>
                  <input type="tel" id="phone" name="phone" className="form-input" placeholder="+91..." />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="subject">Subject</label>
                  <input type="text" id="subject" name="subject" className="form-input" placeholder="Order Inquiry" required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="message">Message</label>
                <textarea 
                  id="message" 
                  name="message"
                  className={`form-input ${styles.textarea}`} 
                  placeholder="How can we help you?"
                  required 
                ></textarea>
              </div>

              <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={loading}>
                {loading ? 'SENDING...' : 'SEND MESSAGE'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
