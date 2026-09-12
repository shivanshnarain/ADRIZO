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
    codMinOrder: 0,              // COD available for all valid orders
    codMaxOrder: 999999,         // No restrictive limit
    codHandlingFee: 0,           // ₹99 is advance confirmation payment against total, not extra fee
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
