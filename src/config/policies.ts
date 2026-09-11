export const POLICY_CONFIG = {
  companyName: "ADRIZO",
  supportEmail: "Care.adrizo@gmail.com",
  supportPhone: "+91 9999999999", // Configurable support phone
  businessHours: "Monday to Saturday, 10:00 AM to 6:00 PM IST",
  address: "ADRIZO Headquarters, [Placeholder Address, City, State, PIN]",
  
  returns: {
    standardWindowDays: 7,
    damageReportWindowHours: 24, // Defective/missing reported within 24h
    unboxingVideoRequired: true,
  },
  
  cancellation: {
    eligibleUntil: "SHIPPED", // Can be cancelled before shipment
    label: "Orders can be cancelled anytime before dispatch."
  },
  
  shipping: {
    freeShippingThreshold: 599, // Free shipping above ₹599
    standardFee: 39,             // Flat ₹39 below ₹599
    codMinOrder: 699,            // COD available from ₹699
    codMaxOrder: 2999,           // COD available up to ₹2,999
    codHandlingFee: 99,           // Fixed COD handling charge (₹99)
    processingTimeDays: "1–2 business days",
    deliveryMetroDays: "2–4",
    deliveryRestOfIndiaDays: "3–6",
  },
  
  refunds: {
    codMethod: "Store Credit or Bank Transfer",
    prepaidMethod: "Original Payment Source",
    processingTimeDays: "5–7 business days",
  }
};

/**
 * =========================================================================
 * TEMPORARY TESTING CONFIGURATION FOR CASH ON DELIVERY (COD)
 * =========================================================================
 * Set to `true` to temporarily bypass the upfront ₹99 Razorpay payment for COD.
 * - Customer places COD order directly without making any online payment.
 * - ₹99 COD handling fee is still retained in the final order total.
 * - Amount paid online now = ₹0, payable on delivery = full order total (subtotal + shipping + ₹99).
 * - Online payment (Razorpay) remains completely untouched and functional.
 * 
 * TO RESTORE ORIGINAL COD ADVANCE PAYMENT: Change this flag to `false`.
 * =========================================================================
 */
export const TEMPORARY_BYPASS_COD_ADVANCE_PAYMENT = true;

