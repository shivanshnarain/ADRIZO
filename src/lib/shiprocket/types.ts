/**
 * Shiprocket API Integration Types
 * 
 * Strict type definitions for server-side Shiprocket integration.
 * Sensitive data such as tokens and passwords must never be exposed to clients.
 */

export interface ShiprocketCredentials {
  email: string;
  password: string;
}

export interface ShiprocketLoginRequest {
  email: string;
  password: string;
}

export interface ShiprocketLoginResponse {
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  company_id?: number;
  created_at?: string;
  token?: string;
  message?: string;
  status_code?: number;
  errors?: Record<string, string[] | string>;
}

export interface ShiprocketTokenCache {
  token: string;
  expiresAt: number; // Unix timestamp in milliseconds
  email: string;
}

export interface ShiprocketAuthTestResult {
  success: boolean;
  configured: boolean;
  authenticated: boolean;
  message: string;
  expiresAt?: string;
  apiUser?: string;
  error?: string;
}

export interface ShiprocketRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

export interface ShiprocketApiErrorDetails {
  message: string;
  statusCode?: number;
  endpoint?: string;
  details?: unknown;
}

export interface ShiprocketCreateOrderItem {
  name: string;
  sku: string;
  units: number;
  selling_price: number;
  discount?: number;
  tax?: number;
  hsn?: number | string;
}

export interface ShiprocketCreateOrderPayload {
  order_id: string;
  order_date: string;
  pickup_location: string;
  channel_id?: string;
  comment?: string;
  billing_customer_name: string;
  billing_last_name?: string;
  billing_address: string;
  billing_address_2?: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  shipping_customer_name?: string;
  shipping_last_name?: string;
  shipping_address?: string;
  shipping_address_2?: string;
  shipping_city?: string;
  shipping_pincode?: string;
  shipping_country?: string;
  shipping_state?: string;
  shipping_email?: string;
  shipping_phone?: string;
  order_items: ShiprocketCreateOrderItem[];
  payment_method: 'COD' | 'Prepaid';
  shipping_charges?: number;
  giftwrap_charges?: number;
  transaction_charges?: number;
  total_discount?: number;
  sub_total: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
}

export interface ShiprocketCreateOrderResponse {
  order_id: number;
  shipment_id: number;
  status: string;
  status_code: number;
  onboarding_completed_now?: number;
  awb_code?: string;
  courier_company_id?: string | number;
  courier_name?: string;
  message?: string;
}

export interface ShiprocketAvailableCourier {
  courierCompanyId: number;
  courierName: string;
  rate: number;
  freightCharge: number;
  codCharges: number;
  etd: string;
  estimatedDeliveryDays: string;
  rating: number;
  isSurface: boolean;
  realtimeTracking?: string;
  callBeforeDelivery?: string;
}

export interface ShiprocketServiceabilityResult {
  success: boolean;
  pickupPincode: string;
  deliveryPincode: string;
  availableCouriers: ShiprocketAvailableCourier[];
  recommendedCourierId?: number;
  error?: string;
}

export interface ShiprocketTrackingActivity {
  date: string;
  status: string;
  activity: string;
  location: string;
  sr_status?: string;
  sr_status_label?: string;
}

export interface ShiprocketTrackingSummary {
  success: boolean;
  awbCode: string;
  orderNumber?: string;
  shipmentId?: number | string;
  courierName?: string;
  currentStatus: string;
  statusCode?: number;
  origin?: string;
  destination?: string;
  etd?: string;
  deliveredDate?: string;
  pickupDate?: string;
  activities: ShiprocketTrackingActivity[];
  error?: string;
}

export interface ShiprocketAssignAwbPayload {
  shipment_id: string | number;
  courier_id: string | number;
  status?: string;
}

export interface ShiprocketAssignAwbResponse {
  awb_assign_status: number;
  response?: {
    data?: {
      courier_company_id?: number;
      awb_code?: string;
      courier_name?: string;
      shipment_id?: number;
      assigned_date_time?: string;
      applied_weight?: number;
      routing_code?: string;
      rto_routing_code?: string;
      invoice_no?: string;
      transporter_id?: string;
      transporter_name?: string;
      shipped_by?: {
        shipper_id?: number;
        shipper_name?: string;
      };
    };
  };
  message?: string;
}

export interface ShiprocketGenerateLabelPayload {
  shipment_id: Array<string | number>;
}

export interface ShiprocketGenerateLabelResponse {
  label_created?: number;
  label_url?: string;
  response?: string;
  not_created?: Array<string | number>;
  message?: string;
}

export interface ShiprocketGenerateInvoicePayload {
  ids: Array<string | number>;
}

export interface ShiprocketGenerateInvoiceResponse {
  is_invoice_created?: boolean;
  invoice_url?: string;
  not_created?: Array<string | number>;
  message?: string;
}

export interface ShiprocketGeneratePickupPayload {
  shipment_id: Array<string | number>;
  pickup_date?: string[];
}

export interface ShiprocketGeneratePickupResponse {
  pickup_status?: number;
  response?: {
    pickup_id?: number;
    pickup_scheduled_date?: string;
    pickup_token_number?: string;
    status?: number;
    data?: string;
    message?: string;
  };
  message?: string;
}

export interface ShiprocketGenerateManifestPayload {
  shipment_id: Array<string | number>;
}

export interface ShiprocketGenerateManifestResponse {
  manifest_url?: string;
  status?: number;
  message?: string;
}


