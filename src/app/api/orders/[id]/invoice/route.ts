import { NextRequest, NextResponse } from 'next/server';
import { resolveOrderFromSupabase } from '@/lib/order-resolver';
import { generateInvoicePdf } from '@/lib/invoice-pdf';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const format = url.searchParams.get('format');
    const autoPrint = url.searchParams.get('print') === 'true';

    // 1. Resolve order safely from Supabase by UUID or ADR-XXXXXX
    const order = await resolveOrderFromSupabase(id);

    if (!order) {
      return new NextResponse('Order not found', { status: 404 });
    }

    // 2. Direct PDF Stream if requested via ?format=pdf
    if (format === 'pdf' || req.headers.get('accept')?.includes('application/pdf')) {
      const pdfBuffer = await generateInvoicePdf(order);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="ADRIZO_Invoice_${order.orderNumber}.pdf"`,
          'Cache-Control': 'no-cache',
        },
      });
    }

    // 3. Render Luxury Print-Friendly HTML Layout
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    const isCod = order.paymentMethod === 'COD';
    const isPaid = (order.paymentStatus || '').toUpperCase() === 'PAID';

    const fullAddress = [
      order.houseFlat,
      order.areaStreet,
      order.landmark ? `Near ${order.landmark.replace(/^(near|landmark:?)\s*/i, '')}` : null,
      order.city,
      order.state ? `${order.state} - ${order.pincode || ''}` : order.pincode,
      'India'
    ].filter(Boolean).join(', ') || order.shippingAddress;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice #${order.orderNumber} - ADRIZO</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      padding: 2rem 1rem;
      -webkit-font-smoothing: antialiased;
    }

    .no-print-bar {
      max-width: 800px;
      margin: 0 auto 1.5rem auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #09090b;
      padding: 0.85rem 1.25rem;
      border-radius: 8px;
      color: #fff;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      text-decoration: none;
      transition: all 0.2s;
    }

    .btn-gold {
      background: #FFC800;
      color: #000;
    }

    .btn-gold:hover {
      background: #e6b400;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid #52525b;
      color: #fff;
    }

    .btn-outline:hover {
      background: #27272a;
    }

    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 2.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }

    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #09090b;
      padding-bottom: 1.5rem;
      margin-bottom: 1.75rem;
    }

    .brand-title {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: 0.2em;
      color: #000000;
      text-transform: uppercase;
      margin-bottom: 0.25rem;
    }

    .brand-sub {
      font-size: 0.75rem;
      color: #64748b;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 600;
    }

    .invoice-badge {
      text-align: right;
    }

    .invoice-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #09090b;
      letter-spacing: -0.02em;
    }

    .invoice-number {
      font-family: monospace;
      font-size: 1.05rem;
      color: #2563eb;
      font-weight: 800;
      margin-top: 2px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      background: #f8fafc;
      padding: 1.25rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-bottom: 2rem;
      font-size: 0.85rem;
    }

    .meta-col h4 {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-bottom: 0.5rem;
      font-weight: 700;
    }

    .meta-col p {
      margin-bottom: 0.25rem;
      line-height: 1.45;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2rem;
      font-size: 0.85rem;
    }

    .items-table th {
      background: #09090b;
      color: #ffffff;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
      padding: 0.75rem 1rem;
      text-align: left;
    }

    .items-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }

    .items-table tr:nth-child(even) {
      background: #fafafa;
    }

    .summary-section {
      display: flex;
      justify-content: space-between;
      gap: 1.5rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }

    .payment-status-box {
      flex: 1;
      min-width: 280px;
      padding: 1.25rem;
      border-radius: 8px;
      font-size: 0.85rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .summary-card {
      width: 320px;
      background: #f8fafc;
      padding: 1.25rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      font-size: 0.85rem;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      color: #475569;
    }

    .summary-total {
      display: flex;
      justify-content: space-between;
      font-size: 1.15rem;
      font-weight: 800;
      color: #09090b;
      border-top: 2px solid #09090b;
      padding-top: 0.75rem;
      margin-top: 0.5rem;
    }

    .status-paid {
      background: #f0fdf4;
      border: 1px solid #86efac;
      color: #166534;
    }

    .status-pending {
      background: #fef2f2;
      border: 1px solid #fca5a5;
      color: #991b1b;
    }

    .footer-note {
      text-align: center;
      font-size: 0.75rem;
      color: #94a3b8;
      border-top: 1px dashed #cbd5e1;
      padding-top: 1.25rem;
      line-height: 1.6;
    }

    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      .no-print-bar {
        display: none !important;
      }
      .invoice-container {
        box-shadow: none;
        border: none;
        padding: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div>
      <span style="font-weight: 800; color: #FFC800;">AD(R)IZO</span> Invoice — #${order.orderNumber}
    </div>
    <div style="display: flex; gap: 0.5rem;">
      <button class="btn btn-gold" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        <span>Print Invoice / Save as PDF</span>
      </button>
      <a class="btn btn-outline" href="?format=pdf" target="_blank" download="ADRIZO_Invoice_${order.orderNumber}.pdf">
        Download PDF File
      </a>
      <button class="btn btn-outline" onclick="window.close()">Close</button>
    </div>
  </div>

  <div class="invoice-container">
    <div class="header-row">
      <div>
        <div class="brand-title">A D ( R ) I Z O</div>
        <div class="brand-sub">Premium Garments &amp; Apparel</div>
        <div style="font-size: 0.75rem; color: #64748b; margin-top: 6px;">
          Email: care.adrizo@gmail.com | Web: www.adrizo.in
        </div>
      </div>
      <div class="invoice-badge">
        <div class="invoice-title">TAX INVOICE</div>
        <div class="invoice-number">#${order.orderNumber}</div>
        <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">
          Date: ${orderDate}
        </div>
        <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 2px;">
          Ref UUID: ${order.id.slice(0, 16)}...
        </div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-col">
        <h4>Customer Details</h4>
        <p><strong>Name:</strong> ${order.customerName}</p>
        <p><strong>Email:</strong> ${order.customerEmail}</p>
        <p><strong>Phone:</strong> +91 ${order.customerPhone || '—'}</p>
        <p><strong>Order ID:</strong> <code style="font-size: 0.75rem; font-family: monospace;">${order.id}</code></p>
      </div>
      <div class="meta-col">
        <h4>Delivery Address</h4>
        <p style="white-space: pre-line;">${fullAddress}</p>
        <p><strong>Destination:</strong> ${order.city || '—'}, ${order.state || '—'} - ${order.pincode || '—'}</p>
        <p><strong>Country:</strong> India</p>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">#</th>
          <th>Item Description</th>
          <th>SKU</th>
          <th style="text-align: center;">Size / Color</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">MRP</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.items.map((item, idx) => {
          const isFree = item.unitPrice === 0 || item.productName.startsWith('[FREE]');
          const cleanName = item.productName.replace(/^\[FREE\]\s*/, '');
          return `
          <tr>
            <td style="text-align: center; color: #64748b; font-weight: 700;">${idx + 1}</td>
            <td>
              <strong>${cleanName}</strong>
              ${isFree ? '<div style="font-size: 0.7rem; color: #166534; font-weight: 800;">PROMOTIONAL FREE ITEM</div>' : ''}
            </td>
            <td style="font-family: monospace; color: #64748b; font-size: 0.8rem;">${item.sku}</td>
            <td style="text-align: center;">${item.size} / ${item.color}</td>
            <td style="text-align: center; font-weight: 700;">${item.quantity}</td>
            <td style="text-align: right; color: #94a3b8; text-decoration: line-through;">₹${item.mrp.toFixed(2)}</td>
            <td style="text-align: right;">${isFree ? '<span style="color:#166534; font-weight:800;">FREE</span>' : `₹${item.unitPrice.toFixed(2)}`}</td>
            <td style="text-align: right; font-weight: 800; color: #09090b;">${isFree ? '<span style="color:#166534; font-weight:800;">FREE</span>' : `₹${item.totalPrice.toFixed(2)}`}</td>
          </tr>
        `;
        }).join('')}
      </tbody>
    </table>

    <div class="summary-section">
      <div class="payment-status-box ${isPaid ? 'status-paid' : 'status-pending'}">
        <div>
          <strong style="font-size: 0.95rem;">Payment Method:</strong> ${isCod ? 'Cash on Delivery (COD)' : 'Online Payment (Razorpay)'}<br />
          <div style="margin-top: 6px; font-size: 0.85rem;">Status: <strong>${order.paymentStatus}</strong></div>
          ${order.razorpayPaymentId ? `<div style="font-size: 0.75rem; color: #475569; margin-top: 4px;">Payment ID: <code style="font-family: monospace;">${order.razorpayPaymentId}</code></div>` : ''}
        </div>
        <div style="border-top: 1px dashed currentColor; padding-top: 0.75rem; font-size: 0.85rem;">
          ${isPaid 
            ? '<strong>✓ Payment Verified and Received</strong>' 
            : isCod 
              ? `<strong>Collect ₹${Math.max(0, order.total - 99).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} at Doorstep (₹99.00 Confirmation Paid Online)</strong>`
              : '<strong>Payment Pending Verification</strong>'
          }
        </div>
      </div>

      <div class="summary-card">
        <div class="summary-row">
          <span>Item Subtotal:</span>
          <span>₹${order.subtotal.toFixed(2)}</span>
        </div>
        <div class="summary-row">
          <span>Shipping Charge:</span>
          <span>${order.shippingCharge === 0 ? '<strong style="color: #166534;">FREE</strong>' : `₹${order.shippingCharge.toFixed(2)}`}</span>
        </div>
        ${(isCod || order.codCharge > 0) ? `
        <div class="summary-row" style="color: #166534; font-weight: 700;">
          <span>COD Confirmation Paid (Online):</span>
          <span>₹${(order.codCharge || 99).toFixed(2)}</span>
        </div>
        ` : ''}
        ${order.discount > 0 ? `
        <div class="summary-row" style="color: #166534; font-weight: 700;">
          <span>Discount (${order.couponCode || 'Promo'}):</span>
          <span>- ₹${order.discount.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="summary-total">
          <span>Total Order Value:</span>
          <span>₹${order.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        ${isCod ? `
        <div class="summary-row" style="color: #b45309; font-weight: 800; border-top: 1px dashed #e2e8f0; margin-top: 0.4rem; padding-top: 0.4rem;">
          <span>Remaining Balance Due on Delivery:</span>
          <span>₹${Math.max(0, order.total - 99).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="footer-note">
      <p>Thank you for choosing AD(R)IZO Luxury Apparel. This is a computer-generated tax invoice and requires no physical signature.</p>
      <p>For any queries or assistance regarding your order, please write to <strong>care.adrizo@gmail.com</strong>.</p>
    </div>
  </div>

  ${autoPrint ? `<script>window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 300); });</script>` : ''}
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('[Invoice Generation Error]', error);
    return new NextResponse(`Error generating invoice: ${error.message}`, { status: 500 });
  }
}
