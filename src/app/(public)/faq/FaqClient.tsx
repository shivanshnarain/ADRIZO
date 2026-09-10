"use client";

import { useState } from 'react';
import styles from '../policies.module.css';
import { ChevronDown } from 'lucide-react';
import { POLICY_CONFIG } from '@/config/policies';

const FAQ_DATA = [
  {
    category: "GENERAL QUERIES",
    questions: [
      {
        q: `Where is ${POLICY_CONFIG.companyName} based?`,
        a: `${POLICY_CONFIG.companyName} is an Indian premium clothing brand. We ship nationwide from our fulfillment centers.`
      },
      {
        q: "Do you have physical stores?",
        a: `Currently, ${POLICY_CONFIG.companyName} operates exclusively online to bring you premium quality at the best prices.`
      }
    ]
  },
  {
    category: "CANCELLATION, EXCHANGE & RETURN",
    questions: [
      {
        q: "Can I cancel my order?",
        a: "Orders can only be cancelled before they are dispatched. Once handed over to the courier, the standard return policy applies."
      },
      {
        q: "What is your return and exchange policy?",
        a: `We offer a ${POLICY_CONFIG.returns.standardWindowDays}-day return and exchange window from the date of delivery. Items must be unused, unwashed, and have original tags attached.`
      },
      {
        q: "What if I receive a damaged or wrong product?",
        a: `Please notify us within ${POLICY_CONFIG.returns.damageReportWindowHours} hours of delivery. ${POLICY_CONFIG.returns.unboxingVideoRequired ? 'An unboxing video is mandatory to process the claim.' : ''} Email us at ${POLICY_CONFIG.supportEmail} with your Order ID.`
      }
    ]
  },
  {
    category: "SHIPPING & DELIVERY",
    questions: [
      {
        q: "Do you charge for shipping?",
        a: `Shipping is FREE on orders above ₹${POLICY_CONFIG.shipping.freeShippingThreshold}. For orders below this amount, a flat rate of ₹${POLICY_CONFIG.shipping.standardFee} is charged.`
      },
      {
        q: "How long does delivery take?",
        a: `Orders are typically processed in ${POLICY_CONFIG.shipping.processingTimeDays} business days. Metro deliveries take ${POLICY_CONFIG.shipping.deliveryMetroDays} days, while the rest of India takes ${POLICY_CONFIG.shipping.deliveryRestOfIndiaDays} days.`
      },
      {
        q: "How can I track my order?",
        a: "Once shipped, you will receive a tracking link via email and SMS. You can also track your order through your customer account."
      }
    ]
  },
  {
    category: "PAYMENTS",
    questions: [
      {
        q: "What payment methods do you accept?",
        a: "We accept all major Credit/Debit cards, UPI, Net Banking, and Wallets. Cash on Delivery (COD) is also available across most PIN codes."
      },
      {
        q: "Is Cash on Delivery available?",
        a: `Yes, COD is available. ${POLICY_CONFIG.shipping.codHandlingFee > 0 ? `Please note that a handling fee of ₹${POLICY_CONFIG.shipping.codHandlingFee} applies.` : ''}`
      },
      {
        q: "How are COD refunds processed?",
        a: `Refunds for COD orders will be processed via ${POLICY_CONFIG.refunds.codMethod}. Our team will contact you to collect the necessary details once the return is approved.`
      }
    ]
  }
];

export default function FaqClient() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (categoryId: number, qId: number) => {
    const key = `${categoryId}-${qId}`;
    setOpenItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className={styles.policyContainer}>
      <header className={styles.policyHeader}>
        <h1 className={styles.policyTitle}>Frequently Asked Questions</h1>
      </header>

      {FAQ_DATA.map((category, cIdx) => (
        <div key={cIdx} className={styles.faqCategory}>
          <h2 className={styles.faqCategoryTitle}>{category.category}</h2>
          
          <div className={styles.accordionGroup}>
            {category.questions.map((item, qIdx) => {
              const isOpen = openItems[`${cIdx}-${qIdx}`];
              
              return (
                <div key={qIdx} className={styles.accordionItem}>
                  <button 
                    className={styles.accordionHeader} 
                    onClick={() => toggleItem(cIdx, qIdx)}
                    aria-expanded={isOpen}
                  >
                    <span>{item.q}</span>
                    <ChevronDown className={`${styles.accordionIcon} ${isOpen ? styles.expanded : ''}`} size={20} />
                  </button>
                  <div className={`${styles.accordionContent} ${isOpen ? styles.expanded : ''}`}>
                    <p className={styles.accordionText}>{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      <div className={styles.policySection} style={{ marginTop: '4rem', textAlign: 'center' }}>
        <h2 className={styles.sectionTitle}>Still have questions?</h2>
        <p className={styles.policyText}>
          Reach out to our customer support at <a href={`mailto:${POLICY_CONFIG.supportEmail}`} className={styles.highlight}>{POLICY_CONFIG.supportEmail}</a>
        </p>
      </div>
    </div>
  );
}
